import { eq } from "drizzle-orm";
import { localDay } from "../../lib/time.ts";
import { db } from "../db/client.ts";
import { barbers, bookings, customers, services, shopSettings } from "../db/schema.ts";
import { getAvailability } from "./availability.ts";
import { lockBarberSchedule } from "./create.ts";
import { hashToken, newManageToken } from "./token.ts";

type Booking = typeof bookings.$inferSelect;
type Actor = "customer" | "owner";

export type ManageResult =
  | { ok: true; token?: string; bookingId?: string }
  | { ok: false; error: "not_found" | "invalid_state" | "cutoff_passed" | "slot_taken" };

export type BookingView = {
  booking: Booking;
  service: { id: string; name: string; durationMinutes: number; bufferAfterMinutes: number };
  barber: { id: string; name: string };
  customer: { name: string; phone: string };
  shop: { timezone: string; whatsappPhone: string; selfServiceCutoffHours: number };
};

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

function isExclusionViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23P01" || e?.cause?.code === "23P01";
}

class SlotTaken extends Error {}

async function loadView(where: ReturnType<typeof eq>): Promise<BookingView | null> {
  const [row] = await db
    .select({
      booking: bookings,
      service: {
        id: services.id,
        name: services.name,
        durationMinutes: services.durationMinutes,
        bufferAfterMinutes: services.bufferAfterMinutes,
      },
      barber: { id: barbers.id, name: barbers.name },
      customer: { name: customers.name, phone: customers.phone },
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(barbers, eq(barbers.id, bookings.barberId))
    .innerJoin(customers, eq(customers.id, bookings.customerId))
    .where(where);
  if (!row) return null;
  const [shop] = await db
    .select({
      timezone: shopSettings.timezone,
      whatsappPhone: shopSettings.whatsappPhone,
      selfServiceCutoffHours: shopSettings.selfServiceCutoffHours,
    })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  return { ...row, shop };
}

/** The booking behind a manage link, or null. Only the token's hash is ever compared. */
export async function findByToken(token: string): Promise<BookingView | null> {
  return loadView(eq(bookings.manageTokenHash, hashToken(token)));
}

/** The booking with that id, or null. Callers check who may see it. */
export async function findById(bookingId: string): Promise<BookingView | null> {
  return loadView(eq(bookings.id, bookingId));
}

/** Whether the customer may still cancel or reschedule by themselves. */
export function withinSelfServiceWindow(view: BookingView, now: Date): boolean {
  const cutoff = view.booking.startsAt.getTime() - view.shop.selfServiceCutoffHours * HOUR_MS;
  return now.getTime() <= cutoff;
}

async function checkManageable(
  bookingId: string,
  now: Date,
  enforceCutoff: boolean,
): Promise<{ ok: true; view: BookingView } | Extract<ManageResult, { ok: false }>> {
  const view = await loadView(eq(bookings.id, bookingId));
  if (!view) return { ok: false, error: "not_found" };
  if (view.booking.status !== "confirmed") return { ok: false, error: "invalid_state" };
  if (enforceCutoff && !withinSelfServiceWindow(view, now)) {
    return { ok: false, error: "cutoff_passed" };
  }
  return { ok: true, view };
}

export async function cancelBooking(input: {
  bookingId: string;
  actor: Actor;
  now: Date;
  enforceCutoff: boolean;
  depositDecision?: "refund" | "forfeit";
}): Promise<ManageResult> {
  const check = await checkManageable(input.bookingId, input.now, input.enforceCutoff);
  if (!check.ok) return check;
  const { booking } = check.view;
  const forfeit = input.actor === "owner" && input.depositDecision === "forfeit";
  await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: input.now,
      cancelledBy: input.actor,
      depositStatus:
        booking.depositStatus === "paid"
          ? forfeit
            ? "forfeited"
            : "refund_pending"
          : booking.depositStatus,
      updatedAt: input.now,
    })
    .where(eq(bookings.id, booking.id));
  return { ok: true };
}

export async function rescheduleBooking(input: {
  bookingId: string;
  newStartsAt: Date;
  newBarberId?: string;
  actor: Actor;
  now: Date;
  enforceCutoff: boolean;
}): Promise<ManageResult> {
  const check = await checkManageable(input.bookingId, input.now, input.enforceCutoff);
  if (!check.ok) return check;
  const { booking, service, shop } = check.view;
  const barberId = input.newBarberId ?? booking.barberId;

  if (input.actor === "customer") {
    const slots = await getAvailability({
      day: localDay(input.newStartsAt, shop.timezone),
      serviceId: service.id,
      barberId,
      now: input.now,
    });
    if (!slots.some((slot) => slot.startsAt.getTime() === input.newStartsAt.getTime())) {
      return { ok: false, error: "slot_taken" };
    }
  }

  const endsAt = new Date(input.newStartsAt.getTime() + service.durationMinutes * MINUTE_MS);
  const blockedUntil = new Date(endsAt.getTime() + service.bufferAfterMinutes * MINUTE_MS);
  const paid = booking.depositStatus === "paid";
  const { token, hash } = newManageToken();
  let newId = "";

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({
          status: "cancelled",
          cancelledAt: input.now,
          cancelledBy: input.actor,
          cancelReason: "reprogramada",
          depositStatus: paid ? "transferred" : booking.depositStatus,
          updatedAt: input.now,
        })
        .where(eq(bookings.id, booking.id));
      await lockBarberSchedule(tx, barberId);
      try {
        const [inserted] = await tx
          .insert(bookings)
          .values({
            barberId,
            serviceId: booking.serviceId,
            customerId: booking.customerId,
            userId: booking.userId,
            startsAt: input.newStartsAt,
            endsAt,
            blockedFrom: input.newStartsAt,
            blockedUntil,
            status: "confirmed",
            paymentMethod: booking.paymentMethod,
            priceCop: booking.priceCop,
            depositCop: paid ? booking.depositCop : 0,
            depositStatus: paid ? "paid" : "none",
            manageTokenHash: hash,
            rescheduledFromId: booking.id,
          })
          .returning({ id: bookings.id });
        newId = inserted.id;
      } catch (error) {
        if (isExclusionViolation(error)) throw new SlotTaken();
        throw error;
      }
    });
  } catch (error) {
    if (error instanceof SlotTaken) return { ok: false, error: "slot_taken" };
    throw error;
  }
  return { ok: true, token, bookingId: newId };
}

/** Owner reschedule: no cutoff, no opening-hours check, may change barber; overlaps still fail. */
export function ownerReschedule(input: {
  bookingId: string;
  newStartsAt: Date;
  newBarberId?: string;
  now: Date;
}): Promise<ManageResult> {
  return rescheduleBooking({ ...input, actor: "owner", enforceCutoff: false });
}

/** Owner cancel: no cutoff; a paid deposit is refunded or forfeited as the owner decides. */
export function ownerCancel(input: {
  bookingId: string;
  depositDecision: "refund" | "forfeit";
  now: Date;
}): Promise<ManageResult> {
  return cancelBooking({ ...input, actor: "owner", enforceCutoff: false });
}
