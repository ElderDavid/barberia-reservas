import { and, asc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { addDays, wallTimeToInstant } from "../../lib/time.ts";
import { normalizePhone } from "../booking/create.ts";
import { db } from "../db/client.ts";
import { barbers, services, shopSettings, timeOff, workingHours } from "../db/schema.ts";

export type SettingsResult = { ok: true } | { ok: false; error: "invalid_input" | "not_found" };

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const shopSchema = z.object({
  name: z.string().trim().min(2).max(60),
  whatsappPhone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return phone;
  }),
  address: z.string().trim().max(120),
  depositPercent: z.number().int().min(10).max(100),
  selfServiceCutoffHours: z.number().int().min(3).max(5),
  holdMinutes: z.number().int().min(10).max(30),
});

export async function updateShopSettings(
  input: z.input<typeof shopSchema>,
): Promise<SettingsResult> {
  const parsed = shopSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  await db
    .insert(shopSettings)
    .values({ id: 1, ...parsed.data })
    .onConflictDoUpdate({
      target: shopSettings.id,
      set: { ...parsed.data, updatedAt: new Date() },
    });
  return { ok: true };
}

const legalSchema = z
  .object({
    legalName: z.string().trim().min(2).max(120),
    legalIdType: z.enum(["CC", "NIT"]),
    legalIdNumber: z.string().trim(),
    privacyEmail: z.email().trim().toLowerCase(),
  })
  .refine(
    (v) => (v.legalIdType === "NIT" ? /^\d{5,12}(-\d)?$/ : /^\d{5,12}$/).test(v.legalIdNumber),
    { path: ["legalIdNumber"] },
  );

/** Saves the responsible party shown on the legal pages. The shop row must exist already. */
export async function updateLegalInfo(
  input: Record<keyof z.input<typeof legalSchema>, string>,
): Promise<SettingsResult> {
  const parsed = legalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const updated = await db
    .update(shopSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(shopSettings.id, 1))
    .returning({ id: shopSettings.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

const loyaltySchema = z.object({
  goal: z.number().int().min(0).max(30),
  reward: z.string().trim().min(1).max(60),
});

/** Stamps needed for the loyalty reward (0 turns the card off) and what the reward is. */
export async function updateLoyaltySettings(
  input: z.input<typeof loyaltySchema>,
): Promise<SettingsResult> {
  const parsed = loyaltySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const updated = await db
    .update(shopSettings)
    .set({
      loyaltyGoal: parsed.data.goal,
      loyaltyReward: parsed.data.reward,
      updatedAt: new Date(),
    })
    .where(eq(shopSettings.id, 1))
    .returning({ id: shopSettings.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(60),
  durationMinutes: z.number().int().min(10).max(240),
  priceCop: z.number().int().positive(),
  bufferAfterMinutes: z.number().int().min(0).max(60),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

/** Creates or edits a service. Existing bookings keep the price they were booked at. */
export async function upsertService(input: z.input<typeof serviceSchema>): Promise<SettingsResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { id, ...values } = parsed.data;
  if (!id) {
    await db.insert(services).values(values);
    return { ok: true };
  }
  const updated = await db.update(services).set(values).where(eq(services.id, id)).returning();
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

const barberSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(60),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function upsertBarber(input: z.input<typeof barberSchema>): Promise<SettingsResult> {
  const parsed = barberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { id, ...values } = parsed.data;
  if (!id) {
    await db.insert(barbers).values(values);
    return { ok: true };
  }
  const updated = await db.update(barbers).set(values).where(eq(barbers.id, id)).returning();
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

const hoursSchema = z.object({
  barberId: z.uuid(),
  weekday: z.number().int().min(0).max(6),
  ranges: z.array(z.object({ start: hhmm, end: hhmm }).refine((r) => r.end > r.start)),
});

/** Replaces one barber's hours for one weekday; an empty list means that day off. */
export async function setWorkingHours(input: z.input<typeof hoursSchema>): Promise<SettingsResult> {
  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { barberId, weekday, ranges } = parsed.data;
  await db.transaction(async (tx) => {
    await tx
      .delete(workingHours)
      .where(and(eq(workingHours.barberId, barberId), eq(workingHours.weekday, weekday)));
    if (ranges.length > 0) {
      await tx
        .insert(workingHours)
        .values(ranges.map((r) => ({ barberId, weekday, startTime: r.start, endTime: r.end })));
    }
  });
  return { ok: true };
}

const timeOffSchema = z
  .object({
    barberId: z.uuid().nullable(),
    from: z.iso.date(),
    to: z.iso.date(),
    reason: z.string().trim().max(120),
  })
  .refine((t) => t.to >= t.from);

async function shopTimeZone(): Promise<string> {
  const [row] = await db
    .select({ timezone: shopSettings.timezone })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  return row?.timezone ?? "America/Bogota";
}

function midnight(day: string, timeZone: string): Date | null {
  return wallTimeToInstant(day, "00:00", timeZone) ?? wallTimeToInstant(day, "01:00", timeZone);
}

/** Whole local days off, for one barber or (barberId null) the whole shop. */
export async function addTimeOff(input: z.input<typeof timeOffSchema>): Promise<SettingsResult> {
  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const timeZone = await shopTimeZone();
  const startsAt = midnight(parsed.data.from, timeZone);
  const endsAt = midnight(addDays(parsed.data.to, 1), timeZone);
  if (!startsAt || !endsAt) return { ok: false, error: "invalid_input" };
  await db.insert(timeOff).values({
    barberId: parsed.data.barberId,
    startsAt,
    endsAt,
    reason: parsed.data.reason,
  });
  return { ok: true };
}

export async function removeTimeOff(id: string): Promise<SettingsResult> {
  const deleted = await db.delete(timeOff).where(eq(timeOff.id, id)).returning({ id: timeOff.id });
  return deleted.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

/** Everything the settings page shows. */
export async function getSettingsData(now: Date) {
  const [shop] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
  const [serviceRows, barberRows, hours, offs] = await Promise.all([
    db.select().from(services).orderBy(asc(services.sortOrder), asc(services.name)),
    db.select().from(barbers).orderBy(asc(barbers.sortOrder), asc(barbers.name)),
    db.select().from(workingHours).orderBy(asc(workingHours.startTime)),
    db.select().from(timeOff).where(gte(timeOff.endsAt, now)).orderBy(asc(timeOff.startsAt)),
  ]);
  return { shop, services: serviceRows, barbers: barberRows, hours, timeOff: offs };
}
