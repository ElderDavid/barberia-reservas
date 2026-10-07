import { and, asc, desc, eq, isNull, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client.ts";
import { barbers, bookings, reviews, services, user } from "./db/schema.ts";

export type BarberReview = {
  firstName: string;
  rating: number;
  comment: string;
  ownerReply: string | null;
  createdAt: Date;
};

export type BarberProfile = {
  id: string;
  name: string;
  ratingCount: number;
  /** Mean stars; null until the barber has `MIN_RATINGS` visible ratings. */
  average: number | null;
  reviews: BarberReview[];
  services: { id: string; name: string; durationMinutes: number; priceCop: number }[];
};

export const MIN_RATINGS = 3;
const LATEST = 6;

/** Public page data for an active barber: stars, latest comments and the services menu. */
export async function getBarberProfile(barberId: string): Promise<BarberProfile | null> {
  if (!z.uuid().safeParse(barberId).success) return null;
  const [barber] = await db
    .select({ id: barbers.id, name: barbers.name })
    .from(barbers)
    .where(and(eq(barbers.id, barberId), eq(barbers.active, true)));
  if (!barber) return null;
  const visible = and(eq(bookings.barberId, barberId), isNull(reviews.hiddenAt));
  const [stats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      average: sql<number | null>`avg(${reviews.rating})::float8`,
    })
    .from(reviews)
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .where(visible);
  const latest = await db
    .select({
      name: user.name,
      rating: reviews.rating,
      comment: reviews.comment,
      ownerReply: reviews.ownerReply,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .innerJoin(user, eq(user.id, reviews.userId))
    .where(and(visible, ne(reviews.comment, "")))
    .orderBy(desc(reviews.createdAt))
    .limit(LATEST);
  const menu = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      priceCop: services.priceCop,
    })
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder), asc(services.name));
  return {
    ...barber,
    ratingCount: stats.count,
    average: stats.count >= MIN_RATINGS ? stats.average : null,
    // The terms promise that only the first name is shown publicly.
    reviews: latest.map(({ name, ...review }) => ({
      ...review,
      firstName: name.trim().split(/\s+/)[0] ?? "",
    })),
    services: menu,
  };
}
