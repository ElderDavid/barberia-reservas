import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { addDays, wallTimeToInstant } from "../../lib/time.ts";
import { db } from "../db/client.ts";
import { barbers, bookings, customers, sales, services } from "../db/schema.ts";
import { getShopTimeZone } from "./agenda.ts";

export type SalesResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "invalid_state" | "invalid_input" };

export type CounterMethod = "cash" | "nequi" | "daviplata" | "card" | "transfer";

/** Owner charges a confirmed booking: records what is still owed and applies a paid deposit. */
export async function completeBooking(input: {
  bookingId: string;
  method: CounterMethod;
  now: Date;
}): Promise<SalesResult> {
  return db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .for("update");
    if (!booking) return { ok: false, error: "not_found" } as const;
    if (booking.status !== "confirmed") return { ok: false, error: "invalid_state" } as const;

    const depositPaid = booking.depositStatus === "paid";
    const balance = depositPaid ? booking.priceCop - booking.depositCop : booking.priceCop;
    await tx
      .update(bookings)
      .set({
        status: "completed",
        completedAt: input.now,
        depositStatus: depositPaid ? "applied" : booking.depositStatus,
        updatedAt: input.now,
      })
      .where(eq(bookings.id, booking.id));
    if (balance > 0) {
      await tx.insert(sales).values({
        bookingId: booking.id,
        barberId: booking.barberId,
        serviceId: booking.serviceId,
        kind: "balance",
        method: input.method,
        amountCop: balance,
        occurredAt: input.now,
      });
    }
    return { ok: true } as const;
  });
}

/** The customer did not come: a paid deposit stays with the shop. */
export async function markNoShow(input: { bookingId: string; now: Date }): Promise<SalesResult> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, input.bookingId));
  if (!booking) return { ok: false, error: "not_found" };
  if (booking.status !== "confirmed") return { ok: false, error: "invalid_state" };
  await db
    .update(bookings)
    .set({
      status: "no_show",
      depositStatus: booking.depositStatus === "paid" ? "forfeited" : booking.depositStatus,
      updatedAt: input.now,
    })
    .where(eq(bookings.id, booking.id));
  return { ok: true };
}

/** A sale without a booking (someone who walked in). */
export async function recordWalkIn(input: {
  amountCop: number;
  method: CounterMethod;
  serviceId?: string;
  barberId?: string;
  note?: string;
  occurredAt: Date;
}): Promise<SalesResult> {
  if (!Number.isInteger(input.amountCop) || input.amountCop <= 0) {
    return { ok: false, error: "invalid_input" };
  }
  await db.insert(sales).values({
    kind: "walk_in",
    method: input.method,
    amountCop: input.amountCop,
    serviceId: input.serviceId ?? null,
    barberId: input.barberId ?? null,
    note: input.note ?? "",
    occurredAt: input.occurredAt,
  });
  return { ok: true };
}

/** The owner returned a deposit by hand: ledger gets a negative `refund` line, once. */
export async function markRefunded(input: { bookingId: string; now: Date }): Promise<SalesResult> {
  return db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, input.bookingId))
      .for("update");
    if (!booking) return { ok: false, error: "not_found" } as const;
    if (booking.depositStatus === "refunded") return { ok: true } as const;
    if (booking.depositStatus !== "refund_pending") {
      return { ok: false, error: "invalid_state" } as const;
    }
    await tx
      .update(bookings)
      .set({ depositStatus: "refunded", updatedAt: input.now })
      .where(eq(bookings.id, booking.id));
    await tx
      .insert(sales)
      .values({
        bookingId: booking.id,
        barberId: booking.barberId,
        serviceId: booking.serviceId,
        kind: "refund",
        method: "wompi",
        amountCop: -booking.depositCop,
        occurredAt: input.now,
      })
      .onConflictDoNothing();
    return { ok: true } as const;
  });
}

export type SaleLine = {
  id: string;
  kind: "deposit" | "balance" | "walk_in" | "refund";
  method: string;
  amountCop: number;
  occurredAt: Date;
  note: string;
  serviceName: string | null;
  barberName: string | null;
};

/** Ledger lines of one local day, newest first. */
export async function listSales(day: string): Promise<SaleLine[]> {
  const timeZone = await getShopTimeZone();
  const from =
    wallTimeToInstant(day, "00:00", timeZone) ?? wallTimeToInstant(day, "01:00", timeZone);
  const next = addDays(day, 1);
  const until =
    wallTimeToInstant(next, "00:00", timeZone) ?? wallTimeToInstant(next, "01:00", timeZone);
  if (!from || !until) return [];
  return db
    .select({
      id: sales.id,
      kind: sales.kind,
      method: sales.method,
      amountCop: sales.amountCop,
      occurredAt: sales.occurredAt,
      note: sales.note,
      serviceName: services.name,
      barberName: barbers.name,
    })
    .from(sales)
    .leftJoin(services, eq(services.id, sales.serviceId))
    .leftJoin(barbers, eq(barbers.id, sales.barberId))
    .where(and(gte(sales.occurredAt, from), lt(sales.occurredAt, until)))
    .orderBy(desc(sales.occurredAt));
}

export type PendingRefund = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  depositCop: number;
  startsAt: Date;
};

/** Deposits the owner still has to return by hand. */
export async function listPendingRefunds(): Promise<PendingRefund[]> {
  return db
    .select({
      bookingId: bookings.id,
      customerName: customers.name,
      customerPhone: customers.phone,
      depositCop: bookings.depositCop,
      startsAt: bookings.startsAt,
    })
    .from(bookings)
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .where(eq(bookings.depositStatus, "refund_pending"))
    .orderBy(asc(bookings.startsAt));
}
