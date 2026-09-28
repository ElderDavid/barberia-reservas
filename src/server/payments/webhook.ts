import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { wompiEventsEnv } from "../../lib/env.ts";
import { db } from "../db/client.ts";
import { bookings, payments, sales } from "../db/schema.ts";

type SignedEvent = {
  data: unknown;
  signature: { properties: string[] };
  timestamp: number | string;
};

const eventSchema = z.object({
  event: z.string(),
  data: z.object({
    transaction: z.object({
      id: z.string(),
      status: z.string(),
      reference: z.string(),
      amount_in_cents: z.number().int(),
    }),
  }),
  signature: z.object({ properties: z.array(z.string()), checksum: z.string() }),
  timestamp: z.union([z.number(), z.string()]),
});

const FINAL_STATUSES = ["APPROVED", "DECLINED", "VOIDED", "ERROR"] as const;
type FinalStatus = (typeof FINAL_STATUSES)[number];

function valueAt(data: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node !== null && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      data,
    );
}

/** Wompi event checksum: values named in signature.properties, then timestamp, then secret. */
export function eventChecksum(event: SignedEvent, secret: string): string {
  const values = event.signature.properties.map((path) => String(valueAt(event.data, path) ?? ""));
  return createHash("sha256")
    .update(`${values.join("")}${event.timestamp}${secret}`)
    .digest("hex");
}

function isExclusionViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23P01" || e?.cause?.code === "23P01";
}

/**
 * Applies a Wompi transaction event. Never trusts the body before the checksum matches, and is
 * idempotent: replays of an event that already reached its final status change nothing.
 */
export async function handleWompiEvent(body: unknown, now: Date): Promise<{ status: 200 | 400 }> {
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return { status: 400 };
  const event = parsed.data;
  const expected = eventChecksum(event, wompiEventsEnv().WOMPI_EVENTS_SECRET);
  if (expected.toLowerCase() !== event.signature.checksum.toLowerCase()) return { status: 400 };

  const transaction = event.data.transaction;
  if (event.event !== "transaction.updated") return { status: 200 };
  if (!FINAL_STATUSES.includes(transaction.status as FinalStatus)) return { status: 200 };
  const status = transaction.status as FinalStatus;

  await db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.reference, transaction.reference))
      .for("update");
    if (!payment || payment.status === status) return;

    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .for("update");
    if (!booking) return;

    if (status === "APPROVED" && transaction.amount_in_cents !== payment.amountCop * 100) {
      await tx
        .update(payments)
        .set({
          status: "ERROR",
          wompiTransactionId: transaction.id,
          lastEventAt: now,
          updatedAt: now,
        })
        .where(eq(payments.id, payment.id));
      return;
    }

    await tx
      .update(payments)
      .set({ status, wompiTransactionId: transaction.id, lastEventAt: now, updatedAt: now })
      .where(eq(payments.id, payment.id));

    if (status !== "APPROVED") {
      if (booking.status === "held") {
        await tx
          .update(bookings)
          .set({
            status: "cancelled",
            cancelledBy: "system",
            cancelledAt: now,
            cancelReason: "pago rechazado",
            depositStatus: "none",
            updatedAt: now,
          })
          .where(eq(bookings.id, booking.id));
      }
      return;
    }

    await tx
      .insert(sales)
      .values({
        bookingId: booking.id,
        barberId: booking.barberId,
        serviceId: booking.serviceId,
        kind: "deposit",
        method: "wompi",
        amountCop: booking.depositCop,
        occurredAt: now,
      })
      .onConflictDoNothing();

    const confirm = {
      status: "confirmed" as const,
      holdExpiresAt: null,
      depositStatus: "paid" as const,
      cancelledAt: null,
      cancelledBy: null,
      cancelReason: null,
      updatedAt: now,
    };
    if (booking.status === "held") {
      await tx.update(bookings).set(confirm).where(eq(bookings.id, booking.id));
    } else if (booking.status === "cancelled" && booking.cancelledBy === "system") {
      // Paid after the hold lapsed: take the slot back if it is still free.
      try {
        await tx.transaction(async (savepoint) => {
          await savepoint.update(bookings).set(confirm).where(eq(bookings.id, booking.id));
        });
      } catch (error) {
        if (!isExclusionViolation(error)) throw error;
        await tx
          .update(bookings)
          .set({ depositStatus: "refund_pending", updatedAt: now })
          .where(eq(bookings.id, booking.id));
      }
    }
  });

  return { status: 200 };
}
