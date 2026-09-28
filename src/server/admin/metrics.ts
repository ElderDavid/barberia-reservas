import { and, eq, gte, lt, sql } from "drizzle-orm";
import { addDays, wallTimeToInstant } from "../../lib/time.ts";
import { db } from "../db/client.ts";
import { barbers, bookings, expenseCategories, expenses, sales } from "../db/schema.ts";
import { getShopTimeZone } from "./agenda.ts";

export type Metrics = {
  collectedCop: number;
  spentCop: number;
  profitCop: number;
  customersServed: number;
  noShows: number;
  byMethod: { method: string; totalCop: number }[];
  expensesByCategory: { category: string; totalCop: number }[];
  byDay: { day: string; totalCop: number }[];
  byBarber: { barber: string; totalCop: number }[];
};

function localMidnight(day: string, timeZone: string): Date {
  return (
    wallTimeToInstant(day, "00:00", timeZone) ?? (wallTimeToInstant(day, "01:00", timeZone) as Date)
  );
}

/** Business summary for the inclusive local days [from, to], cut at the shop's midnight. */
export async function getMetrics(range: { from: string; to: string }): Promise<Metrics> {
  const timeZone = await getShopTimeZone();
  const start = localMidnight(range.from, timeZone);
  const end = localMidnight(addDays(range.to, 1), timeZone);
  const inSales = and(gte(sales.occurredAt, start), lt(sales.occurredAt, end));
  const inBookings = and(gte(bookings.startsAt, start), lt(bookings.startsAt, end));
  const inExpenses = sql`${expenses.spentOn} between ${range.from} and ${range.to}`;
  const total = sql<number>`coalesce(sum(${sales.amountCop}), 0)::int`;

  const [collected] = await db.select({ total }).from(sales).where(inSales);
  const [spent] = await db
    .select({ total: sql<number>`coalesce(sum(${expenses.amountCop}), 0)::int` })
    .from(expenses)
    .where(inExpenses);
  const [walkIns] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sales)
    .where(and(inSales, eq(sales.kind, "walk_in")));
  const statusCounts = await db
    .select({ status: bookings.status, n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(inBookings)
    .groupBy(bookings.status);
  const countOf = (status: string) => statusCounts.find((row) => row.status === status)?.n ?? 0;

  const byMethod = await db
    .select({ method: sales.method, totalCop: total })
    .from(sales)
    .where(inSales)
    .groupBy(sales.method)
    .orderBy(sql`2 desc`, sales.method);

  const expensesByCategory = await db
    .select({
      category: expenseCategories.name,
      totalCop: sql<number>`sum(${expenses.amountCop})::int`,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(inExpenses)
    .groupBy(expenseCategories.name)
    .orderBy(sql`2 desc`, expenseCategories.name);

  const localDate = sql<string>`to_char(${sales.occurredAt} at time zone ${timeZone}, 'YYYY-MM-DD')`;
  const byDay = await db
    .select({ day: localDate, totalCop: total })
    .from(sales)
    .where(inSales)
    // Grouped by position: the zone is a bound parameter, so repeating the expression would not
    // match the select list.
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byBarber = await db
    .select({ barber: barbers.name, totalCop: total })
    .from(sales)
    .innerJoin(barbers, eq(barbers.id, sales.barberId))
    .where(inSales)
    .groupBy(barbers.name)
    .orderBy(sql`2 desc`, barbers.name);

  const collectedCop = collected?.total ?? 0;
  const spentCop = spent?.total ?? 0;
  return {
    collectedCop,
    spentCop,
    profitCop: collectedCop - spentCop,
    customersServed: countOf("completed") + (walkIns?.n ?? 0),
    noShows: countOf("no_show"),
    byMethod,
    expensesByCategory,
    byDay,
    byBarber,
  };
}
