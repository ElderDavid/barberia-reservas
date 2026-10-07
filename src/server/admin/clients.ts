import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.ts";
import { barbers, bookings, customers, reviews, services } from "../db/schema.ts";
import { getLoyalty, type Loyalty } from "../loyalty.ts";

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  visits: number;
  lastVisit: Date | null;
  /** The account linked to the client's most recent booking; null for guests. */
  userId: string | null;
  /** Available loyalty stamps; null without an account. */
  stamps: number | null;
  /** Mean stars this client gave; null when they never rated. */
  averageGiven: number | null;
};

export type ClientDetail = ClientRow & {
  bookings: {
    id: string;
    startsAt: Date;
    status: string;
    serviceName: string;
    barberName: string;
    priceCop: number;
  }[];
  reviews: {
    rating: number;
    comment: string;
    ownerReply: string | null;
    createdAt: Date;
    barberName: string;
  }[];
  loyalty: Loyalty | null;
};

const LIMIT = 100;
const querySchema = z.string().trim().max(60).catch("");

// Drizzle prints a lone table's columns unqualified, so the correlated subqueries name it in full.
const customerRef = sql.raw('"customers"."id"');

const visits = sql<number>`(select count(*)::int from ${bookings} b
  where b.customer_id = ${customerRef} and b.status = 'completed')`;
const lastVisit = sql<Date | null>`(select max(b.starts_at) from ${bookings} b
  where b.customer_id = ${customerRef} and b.status = 'completed')`.mapWith(
  (value: string | Date | null) => (value === null ? null : new Date(value)),
);
const userId = sql<string | null>`(select b.user_id from ${bookings} b
  where b.customer_id = ${customerRef} and b.user_id is not null
  order by b.starts_at desc limit 1)`;
const averageGiven = sql<number | null>`(select avg(r.rating)::float8 from ${reviews} r
  join ${bookings} b on b.id = r.booking_id where b.customer_id = ${customerRef})`;

const columns = {
  id: customers.id,
  name: customers.name,
  phone: customers.phone,
  visits,
  lastVisit,
  userId,
  averageGiven,
};

/** `%` and `_` are wildcards in LIKE; a search for them means the characters themselves. */
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function withStamps(rows: Omit<ClientRow, "stamps">[]): Promise<ClientRow[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      stamps: row.userId ? (await getLoyalty(row.userId)).available : null,
    })),
  );
}

/** Everyone who has booked, most recent visit first, optionally filtered by name or phone. */
export async function listClients(query: unknown): Promise<ClientRow[]> {
  const text = querySchema.parse(query);
  const digits = text.replace(/\D/g, "");
  const filter = text
    ? digits.length >= 3
      ? sql`(${customers.name} ilike ${likePattern(text)} or ${customers.phone} like ${likePattern(digits)})`
      : sql`${customers.name} ilike ${likePattern(text)}`
    : undefined;
  const rows = await db
    .select(columns)
    .from(customers)
    .where(filter)
    .orderBy(sql`${lastVisit} desc nulls last`, asc(customers.name))
    .limit(LIMIT);
  return withStamps(rows);
}

/** One client's history for the owner: bookings, ratings and loyalty card. */
export async function getClient(customerId: string): Promise<ClientDetail | null> {
  if (!z.uuid().safeParse(customerId).success) return null;
  const [row] = await db.select(columns).from(customers).where(eq(customers.id, customerId));
  if (!row) return null;
  const [client] = await withStamps([row]);
  const history = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      serviceName: services.name,
      barberName: barbers.name,
      priceCop: bookings.priceCop,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(barbers, eq(barbers.id, bookings.barberId))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.startsAt));
  const rated = await db
    .select({
      rating: reviews.rating,
      comment: reviews.comment,
      ownerReply: reviews.ownerReply,
      createdAt: reviews.createdAt,
      barberName: barbers.name,
    })
    .from(reviews)
    .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
    .innerJoin(barbers, eq(barbers.id, bookings.barberId))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(reviews.createdAt));
  return {
    ...client,
    bookings: history,
    reviews: rated,
    loyalty: client.userId ? await getLoyalty(client.userId) : null,
  };
}
