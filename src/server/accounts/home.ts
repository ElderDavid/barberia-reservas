import { and, asc, eq, gt, gte, or } from "drizzle-orm";
import { db } from "../db/client.ts";
import { barbers, bookings, services, user } from "../db/schema.ts";
import { getLoyalty, type Loyalty } from "../loyalty.ts";

export type NextBooking = {
  id: string;
  startsAt: Date;
  serviceName: string;
  barberName: string;
  status: "held" | "confirmed";
};

export type AccountHome = { firstName: string; next: NextBooking | null; loyalty: Loyalty };

/** What Inicio shows a signed-in customer: their first name, next booking and loyalty card. */
export async function getAccountHome(userId: string, now: Date): Promise<AccountHome | null> {
  const [account] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId));
  if (!account) return null;
  const [next] = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      serviceName: services.name,
      barberName: barbers.name,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(barbers, eq(barbers.id, bookings.barberId))
    .where(
      and(
        eq(bookings.userId, userId),
        // A transfer hold counts only while its payment window is open.
        or(
          eq(bookings.status, "confirmed"),
          and(eq(bookings.status, "held"), gt(bookings.holdExpiresAt, now)),
        ),
        gte(bookings.startsAt, now),
      ),
    )
    .orderBy(asc(bookings.startsAt))
    .limit(1);
  return {
    firstName: account.name.trim().split(/\s+/)[0] ?? "",
    next: next ? { ...next, status: next.status === "held" ? "held" : "confirmed" } : null,
    loyalty: await getLoyalty(userId),
  };
}
