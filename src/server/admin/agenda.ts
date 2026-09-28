import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { addDays, wallTimeToInstant } from "../../lib/time.ts";
import { db } from "../db/client.ts";
import { barbers, bookings, customers, services, shopSettings } from "../db/schema.ts";

export type AgendaItem = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: "held" | "confirmed" | "completed" | "no_show";
  paymentMethod: "cash" | "transfer";
  priceCop: number;
  depositCop: number;
  depositStatus: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
};

export type AgendaGroup = { barberId: string; barberName: string; items: AgendaItem[] };
export type Agenda = { timeZone: string; groups: AgendaGroup[] };

const SHOWN = ["held", "confirmed", "completed", "no_show"] as const;

/** The shop's time zone (defaults to Bogotá before the settings row exists). */
export async function getShopTimeZone(): Promise<string> {
  const [row] = await db
    .select({ timezone: shopSettings.timezone })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  return row?.timezone ?? "America/Bogota";
}

function localMidnight(day: string, timeZone: string): Date {
  return (
    wallTimeToInstant(day, "00:00", timeZone) ?? (wallTimeToInstant(day, "01:00", timeZone) as Date)
  );
}

/** One local day of bookings, grouped by active barber in `sort_order`, each by start time. */
export async function getAgenda(day: string): Promise<Agenda> {
  const timeZone = await getShopTimeZone();
  const from = localMidnight(day, timeZone);
  const until = localMidnight(addDays(day, 1), timeZone);

  const barberRows = await db
    .select({ id: barbers.id, name: barbers.name })
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.sortOrder), asc(barbers.name));

  const rows = await db
    .select({
      id: bookings.id,
      barberId: bookings.barberId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      paymentMethod: bookings.paymentMethod,
      priceCop: bookings.priceCop,
      depositCop: bookings.depositCop,
      depositStatus: bookings.depositStatus,
      customerName: customers.name,
      customerPhone: customers.phone,
      serviceName: services.name,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .where(
      and(
        gte(bookings.startsAt, from),
        lt(bookings.startsAt, until),
        inArray(bookings.status, [...SHOWN]),
      ),
    )
    .orderBy(asc(bookings.startsAt));

  return {
    timeZone,
    groups: barberRows.map((barber) => ({
      barberId: barber.id,
      barberName: barber.name,
      items: rows
        .filter((row) => row.barberId === barber.id)
        .map(({ barberId: _barberId, ...item }) => item as AgendaItem),
    })),
  };
}
