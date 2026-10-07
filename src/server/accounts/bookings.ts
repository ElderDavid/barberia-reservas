import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { type BookingView, findById } from "../booking/manage.ts";
import { hashToken } from "../booking/token.ts";
import { db } from "../db/client.ts";
import { barbers, bookings, services } from "../db/schema.ts";

export type AccountBooking = {
  id: string;
  status: "held" | "confirmed" | "completed" | "cancelled" | "no_show";
  startsAt: Date;
  serviceName: string;
  barberName: string;
  priceCop: number;
};

export type AccountBookings = {
  upcoming: AccountBooking[];
  past: AccountBooking[];
  cancelled: AccountBooking[];
  visits: number;
};

const MAX_CLAIM = 20;
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** The account's bookings in the three "Mis citas" tabs, plus how many visits were completed. */
export async function listAccountBookings(userId: string, now: Date): Promise<AccountBookings> {
  const rows = await db
    .select({
      id: bookings.id,
      status: bookings.status,
      startsAt: bookings.startsAt,
      cancelReason: bookings.cancelReason,
      serviceName: services.name,
      barberName: barbers.name,
      priceCop: bookings.priceCop,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(barbers, eq(barbers.id, bookings.barberId))
    .where(eq(bookings.userId, userId))
    .orderBy(asc(bookings.startsAt));
  const result: AccountBookings = { upcoming: [], past: [], cancelled: [], visits: 0 };
  for (const { cancelReason, ...row } of rows) {
    if (row.status === "cancelled") {
      // A rescheduled booking lives on as its replacement.
      if (cancelReason !== "reprogramada") result.cancelled.unshift(row);
    } else if ((row.status === "held" || row.status === "confirmed") && row.startsAt >= now) {
      result.upcoming.push(row);
    } else {
      result.past.unshift(row);
      if (row.status === "completed") result.visits += 1;
    }
  }
  return result;
}

/** The booking if it belongs to this account; null for anyone else's or a malformed id. */
export async function findAccountBooking(
  userId: string,
  bookingId: string,
): Promise<BookingView | null> {
  if (!z.uuid().safeParse(bookingId).success) return null;
  const view = await findById(bookingId);
  return view?.booking.userId === userId ? view : null;
}

/**
 * Moves guest bookings into the account. Only the private link proves a booking is yours, so
 * bookings are matched by token hash, never by phone, and one already in an account stays there.
 */
export async function claimBookings(
  userId: string,
  tokens: string[],
  now: Date,
): Promise<{ ok: true; claimed: number }> {
  const hashes = tokens
    .filter((t) => tokenSchema.safeParse(t).success)
    .slice(0, MAX_CLAIM)
    .map(hashToken);
  if (hashes.length === 0) return { ok: true, claimed: 0 };
  const claimed = await db
    .update(bookings)
    .set({ userId, updatedAt: now })
    .where(and(inArray(bookings.manageTokenHash, hashes), isNull(bookings.userId)))
    .returning({ id: bookings.id });
  return { ok: true, claimed: claimed.length };
}
