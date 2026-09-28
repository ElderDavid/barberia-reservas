import { beforeEach, describe, expect, it } from "vitest";
import { getAvailability } from "../../src/server/booking/availability.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { cancelBooking, findByToken, rescheduleBooking } from "../../src/server/booking/manage.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const bookedAt = new Date("2026-10-01T12:00:00Z");
const startsAt = "2026-10-05T15:00:00.000Z"; // lunes 10:00 en Bogotá
const early = new Date("2026-10-02T12:00:00Z"); // well before the 4 h cutoff
const late = new Date("2026-10-05T12:30:00Z"); // 2.5 h before the appointment
let shop: ShopFixture;

async function book(time = startsAt, phone = "3005550101") {
  const result = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      startsAt: time,
      name: "Juan Pérez",
      phone,
      consent: true,
      method: "cash",
    },
    bookedAt,
  );
  if (!result.ok) throw new Error(result.error);
  return result;
}

async function row(id: string) {
  const [found] = await sql<
    {
      status: string;
      cancelled_by: string | null;
      cancel_reason: string | null;
      deposit_status: string;
      deposit_cop: number;
      rescheduled_from_id: string | null;
    }[]
  >`select status, cancelled_by, cancel_reason, deposit_status, deposit_cop, rescheduled_from_id
    from bookings where id = ${id}`;
  return found;
}

describe("customer self-service", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("cancels in time and frees the slot", async () => {
    const { bookingId } = await book();
    const result = await cancelBooking({
      bookingId,
      actor: "customer",
      now: early,
      enforceCutoff: true,
    });
    expect(result).toEqual({ ok: true });
    expect(await row(bookingId)).toMatchObject({ status: "cancelled", cancelled_by: "customer" });
    const slots = await getAvailability({
      day: "2026-10-05",
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      now: early,
    });
    expect(slots.map((s) => s.startsAt.toISOString())).toContain(startsAt);
  });

  it("refuses changes after the cutoff", async () => {
    const { bookingId } = await book();
    expect(
      await cancelBooking({ bookingId, actor: "customer", now: late, enforceCutoff: true }),
    ).toEqual({ ok: false, error: "cutoff_passed" });
    expect(
      await rescheduleBooking({
        bookingId,
        newStartsAt: new Date("2026-10-05T20:00:00Z"),
        actor: "customer",
        now: late,
        enforceCutoff: true,
      }),
    ).toEqual({ ok: false, error: "cutoff_passed" });
    expect((await row(bookingId)).status).toBe("confirmed");
  });

  it("reschedules to a free slot with a new token", async () => {
    const { bookingId, token } = await book();
    const result = await rescheduleBooking({
      bookingId,
      newStartsAt: new Date("2026-10-05T20:00:00Z"),
      actor: "customer",
      now: early,
      enforceCutoff: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.token) throw new Error("no token");
    expect(result.token).not.toBe(token);
    expect(await row(bookingId)).toMatchObject({
      status: "cancelled",
      cancel_reason: "reprogramada",
    });
    const moved = await findByToken(result.token);
    expect(moved?.booking.status).toBe("confirmed");
    expect(moved?.booking.rescheduledFromId).toBe(bookingId);
  });

  it("refuses a taken slot and keeps the original", async () => {
    const { bookingId } = await book();
    await book("2026-10-05T20:00:00.000Z", "3005550102");
    expect(
      await rescheduleBooking({
        bookingId,
        newStartsAt: new Date("2026-10-05T20:00:00Z"),
        actor: "customer",
        now: early,
        enforceCutoff: true,
      }),
    ).toEqual({ ok: false, error: "slot_taken" });
    expect((await row(bookingId)).status).toBe("confirmed");
  });

  it("moves or refunds a paid deposit", async () => {
    const first = await book();
    await sql`update bookings set deposit_status = 'paid', deposit_cop = 15000
      where id = ${first.bookingId}`;
    await cancelBooking({
      bookingId: first.bookingId,
      actor: "customer",
      now: early,
      enforceCutoff: true,
    });
    expect((await row(first.bookingId)).deposit_status).toBe("refund_pending");

    const second = await book("2026-10-05T16:00:00.000Z", "3005550102");
    await sql`update bookings set deposit_status = 'paid', deposit_cop = 15000
      where id = ${second.bookingId}`;
    const result = await rescheduleBooking({
      bookingId: second.bookingId,
      newStartsAt: new Date("2026-10-05T20:00:00Z"),
      actor: "customer",
      now: early,
      enforceCutoff: true,
    });
    if (!result.ok || !result.token) throw new Error("reschedule failed");
    expect((await row(second.bookingId)).deposit_status).toBe("transferred");
    const moved = await findByToken(result.token);
    expect(moved?.booking.depositStatus).toBe("paid");
    expect(moved?.booking.depositCop).toBe(15000);
  });
});
