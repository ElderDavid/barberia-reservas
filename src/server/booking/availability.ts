import { and, asc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { addDays, wallTimeToInstant, weekdayOf } from "../../lib/time.ts";
import { db } from "../db/client.ts";
import { barbers, bookings, services, shopSettings, timeOff, workingHours } from "../db/schema.ts";
import { type Busy, generateSlots } from "./slots.ts";

export type AvailabilityInput = {
  day: string;
  serviceId: string;
  barberId: string | "any";
  now: Date;
};

export type AvailableSlot = { barberId: string; startsAt: Date };

/** Local midnight of `day`, or 01:00 when midnight is skipped by a DST jump. */
function dayStart(day: string, timeZone: string): Date {
  return (
    wallTimeToInstant(day, "00:00", timeZone) ?? (wallTimeToInstant(day, "01:00", timeZone) as Date)
  );
}

/**
 * Open start times for a service on one day, per barber. Advisory only: the insert and the
 * `bookings_no_overlap` constraint decide. With `"any"`, each time keeps the first free barber
 * by `sort_order`.
 */
export async function getAvailability(input: AvailabilityInput): Promise<AvailableSlot[]> {
  const [settings] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
  if (!settings) return [];

  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, input.serviceId), eq(services.active, true)));
  if (!service) return [];

  const barberRows = await db
    .select({ id: barbers.id })
    .from(barbers)
    .where(
      input.barberId === "any"
        ? eq(barbers.active, true)
        : and(eq(barbers.active, true), eq(barbers.id, input.barberId)),
    )
    .orderBy(asc(barbers.sortOrder), asc(barbers.name));
  if (barberRows.length === 0) return [];
  const barberIds = barberRows.map((row) => row.id);

  const timeZone = settings.timezone;
  const from = dayStart(input.day, timeZone);
  const until = dayStart(addDays(input.day, 1), timeZone);

  const [hours, offs, blocking] = await Promise.all([
    db
      .select()
      .from(workingHours)
      .where(
        and(
          inArray(workingHours.barberId, barberIds),
          eq(workingHours.weekday, weekdayOf(input.day)),
        ),
      ),
    db
      .select()
      .from(timeOff)
      .where(
        and(
          or(isNull(timeOff.barberId), inArray(timeOff.barberId, barberIds)),
          lt(timeOff.startsAt, until),
          gt(timeOff.endsAt, from),
        ),
      ),
    db
      .select({
        barberId: bookings.barberId,
        blockedFrom: bookings.blockedFrom,
        blockedUntil: bookings.blockedUntil,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.barberId, barberIds),
          lt(bookings.blockedFrom, until),
          gt(bookings.blockedUntil, from),
          or(
            eq(bookings.status, "confirmed"),
            and(eq(bookings.status, "held"), gt(bookings.holdExpiresAt, input.now)),
          ),
        ),
      ),
  ]);

  const byStart = new Map<number, AvailableSlot>();
  for (const barberId of barberIds) {
    const busy: Busy[] = [
      ...offs
        .filter((off) => off.barberId === null || off.barberId === barberId)
        .map((off) => ({ from: off.startsAt, until: off.endsAt })),
      ...blocking
        .filter((booking) => booking.barberId === barberId)
        .map((booking) => ({ from: booking.blockedFrom, until: booking.blockedUntil })),
    ];
    const slots = generateSlots({
      timeZone,
      day: input.day,
      windows: hours
        .filter((row) => row.barberId === barberId)
        .map((row) => ({ start: row.startTime.slice(0, 5), end: row.endTime.slice(0, 5) })),
      busy,
      durationMinutes: service.durationMinutes,
      bufferAfterMinutes: service.bufferAfterMinutes,
      intervalMinutes: settings.slotIntervalMinutes,
      minNoticeMinutes: settings.minNoticeMinutes,
      maxAdvanceDays: settings.maxAdvanceDays,
      now: input.now,
    });
    for (const startsAt of slots) {
      if (!byStart.has(startsAt.getTime())) byStart.set(startsAt.getTime(), { barberId, startsAt });
    }
  }

  return [...byStart.values()].sort((a, b) => {
    const diff = a.startsAt.getTime() - b.startsAt.getTime();
    return diff !== 0 ? diff : barberIds.indexOf(a.barberId) - barberIds.indexOf(b.barberId);
  });
}
