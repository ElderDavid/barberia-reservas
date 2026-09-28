import { and, asc, count, eq, gt, inArray, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import { localDay } from "../../lib/time.ts";
import { type Db, db } from "../db/client.ts";
import { barbers, bookings, customers, payments, services, shopSettings } from "../db/schema.ts";
import { depositFor } from "../payments/wompi.ts";
import { getAvailability } from "./availability.ts";
import { newManageToken } from "./token.ts";

export type CreateBookingInput = {
  serviceId: string;
  barberId: string | "any";
  startsAt: string; // ISO instant chosen from getAvailability
  name: string;
  phone: string; // as typed by the customer
  consent: boolean;
  method: "cash" | "transfer";
};
export type CreateBookingResult =
  | { ok: true; bookingId: string; token: string }
  | {
      ok: false;
      error:
        | "invalid_input"
        | "slot_unavailable"
        | "slot_taken"
        | "too_many_bookings"
        | "transfer_unavailable";
    };

const MAX_PENDING_BOOKINGS = 3;
const MINUTE_MS = 60_000;

/** "300 123 4567", "+57 3001234567", "573001234567" → "573001234567"; anything else → null. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "").replace(/^\+/, "");
  const local = digits.length === 12 && digits.startsWith("57") ? digits.slice(2) : digits;
  return /^3\d{9}$/.test(local) ? `57${local}` : null;
}

const inputSchema = z.object({
  serviceId: z.uuid(),
  barberId: z.union([z.literal("any"), z.uuid()]),
  startsAt: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(60),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return phone;
  }),
  consent: z.literal(true),
  method: z.enum(["cash", "transfer"]),
});

function isExclusionViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23P01" || e?.cause?.code === "23P01";
}

class SlotTaken extends Error {}

/** Barbers (in `sort_order`) for whom `startsAt` is currently offered. */
async function candidateBarbers(
  serviceId: string,
  barberId: string | "any",
  startsAt: Date,
  day: string,
  now: Date,
): Promise<string[]> {
  const ids =
    barberId === "any"
      ? (
          await db
            .select({ id: barbers.id })
            .from(barbers)
            .where(eq(barbers.active, true))
            .orderBy(asc(barbers.sortOrder), asc(barbers.name))
        ).map((row) => row.id)
      : [barberId];
  const free: string[] = [];
  for (const id of ids) {
    const slots = await getAvailability({ day, serviceId, barberId: id, now });
    if (slots.some((slot) => slot.startsAt.getTime() === startsAt.getTime())) free.push(id);
  }
  return free;
}

/** True when a live booking of that barber (or, for "any", of some barber) covers the range. */
async function isTakenByBooking(
  barberId: string | "any",
  from: Date,
  until: Date,
  now: Date,
): Promise<boolean> {
  const rows = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        barberId === "any" ? undefined : eq(bookings.barberId, barberId),
        lt(bookings.blockedFrom, until),
        gt(bookings.blockedUntil, from),
        or(
          eq(bookings.status, "confirmed"),
          and(eq(bookings.status, "held"), gt(bookings.holdExpiresAt, now)),
        ),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Releases transfer holds whose payment window has closed. Returns how many were released. */
export async function expireStaleHolds(tx: Db | Tx, now: Date): Promise<number> {
  const released = await tx
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledBy: "system",
      cancelledAt: now,
      cancelReason: "pago no completado",
      depositStatus: "none",
      updatedAt: now,
    })
    .where(and(eq(bookings.status, "held"), lte(bookings.holdExpiresAt, now)))
    .returning({ id: bookings.id });
  return released.length;
}

/**
 * Books a slot. Availability is re-checked, but the insert and the `bookings_no_overlap`
 * constraint decide: a 23P01 means someone else got the slot first.
 */
export async function createBooking(
  input: CreateBookingInput,
  now: Date,
): Promise<CreateBookingResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const data = parsed.data;

  const [settings] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, data.serviceId), eq(services.active, true)));
  if (!settings || !service) return { ok: false, error: "slot_unavailable" };

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * MINUTE_MS);
  const blockedUntil = new Date(endsAt.getTime() + service.bufferAfterMinutes * MINUTE_MS);
  const day = localDay(startsAt, settings.timezone);
  const candidates = await candidateBarbers(data.serviceId, data.barberId, startsAt, day, now);
  if (candidates.length === 0) {
    // Not offered: either another booking got there first (taken) or the time was never valid.
    const taken = await isTakenByBooking(data.barberId, startsAt, blockedUntil, now);
    return { ok: false, error: taken ? "slot_taken" : "slot_unavailable" };
  }

  const { token, hash } = newManageToken();
  const transfer = data.method === "transfer";
  const depositCop = transfer ? depositFor(service.priceCop, settings.depositPercent) : 0;
  const holdExpiresAt = transfer
    ? new Date(now.getTime() + settings.holdMinutes * MINUTE_MS)
    : null;

  try {
    return await db.transaction(async (tx) => {
      await expireStaleHolds(tx, now);
      const [customer] = await tx
        .insert(customers)
        .values({ name: data.name, phone: data.phone, consentAt: now })
        .onConflictDoUpdate({
          target: customers.phone,
          set: { name: data.name, consentAt: now },
        })
        .returning({ id: customers.id });

      const [pending] = await tx
        .select({ n: count() })
        .from(bookings)
        .where(
          and(
            eq(bookings.customerId, customer.id),
            inArray(bookings.status, ["held", "confirmed"]),
            gt(bookings.startsAt, now),
          ),
        );
      if (pending.n >= MAX_PENDING_BOOKINGS) {
        return { ok: false, error: "too_many_bookings" } as const;
      }

      for (const barberId of candidates) {
        try {
          const [row] = await tx.transaction(async (savepoint) =>
            savepoint
              .insert(bookings)
              .values({
                barberId,
                serviceId: service.id,
                customerId: customer.id,
                startsAt,
                endsAt,
                blockedFrom: startsAt,
                blockedUntil,
                status: transfer ? "held" : "confirmed",
                paymentMethod: data.method,
                priceCop: service.priceCop,
                depositCop,
                depositStatus: transfer ? "pending" : "none",
                holdExpiresAt,
                manageTokenHash: hash,
              })
              .returning({ id: bookings.id }),
          );
          if (transfer) {
            await tx.insert(payments).values({
              bookingId: row.id,
              reference: `BK-${row.id}`,
              amountCop: depositCop,
              status: "PENDING",
            });
          }
          return { ok: true, bookingId: row.id, token } as const;
        } catch (error) {
          if (!isExclusionViolation(error)) throw error;
        }
      }
      throw new SlotTaken();
    });
  } catch (error) {
    if (error instanceof SlotTaken || isExclusionViolation(error)) {
      return { ok: false, error: "slot_taken" };
    }
    throw error;
  }
}

export type BookingOptions = {
  timeZone: string;
  services: { id: string; name: string; durationMinutes: number; priceCop: number }[];
  barbers: { id: string; name: string }[];
};

/** Active services and barbers, in display order, for the public booking flow. */
export async function getBookingOptions(): Promise<BookingOptions> {
  const [settings] = await db
    .select({ timezone: shopSettings.timezone })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      priceCop: services.priceCop,
    })
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder), asc(services.name));
  const barberRows = await db
    .select({ id: barbers.id, name: barbers.name })
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.sortOrder), asc(barbers.name));
  return {
    timeZone: settings?.timezone ?? "America/Bogota",
    services: serviceRows,
    barbers: barberRows,
  };
}

/** Cron cleanup: releases every expired hold in one transaction; returns how many. */
export async function expireHolds(now: Date): Promise<number> {
  return db.transaction((tx) => expireStaleHolds(tx, now));
}
