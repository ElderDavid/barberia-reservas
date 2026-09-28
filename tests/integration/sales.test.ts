import { beforeEach, describe, expect, it } from "vitest";
import {
  completeBooking,
  markNoShow,
  markRefunded,
  recordWalkIn,
} from "../../src/server/admin/sales.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const bookedAt = new Date("2026-10-01T12:00:00Z");
const now = new Date("2026-10-05T16:00:00Z");
let shop: ShopFixture;
let comboId: string;

async function bookCombo(phone = "3005550101"): Promise<string> {
  const result = await createBooking(
    {
      serviceId: comboId,
      barberId: shop.barberId,
      startsAt: "2026-10-05T15:00:00.000Z",
      name: "Juan Pérez",
      phone,
      consent: true,
      method: "cash",
    },
    bookedAt,
  );
  if (!result.ok) throw new Error(result.error);
  return result.bookingId;
}

async function salesFor(bookingId: string | null) {
  return bookingId === null
    ? sql<{ kind: string; method: string; amount_cop: number; booking_id: string | null }[]>`
        select kind, method, amount_cop, booking_id from sales where booking_id is null`
    : sql<{ kind: string; method: string; amount_cop: number; booking_id: string | null }[]>`
        select kind, method, amount_cop, booking_id from sales where booking_id = ${bookingId}`;
}

async function booking(id: string) {
  const [row] = await sql<{ status: string; deposit_status: string }[]>`
    select status, deposit_status from bookings where id = ${id}
  `;
  return row;
}

describe("owner charges and sales ledger", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
    const [combo] = await sql<{ id: string }[]>`
      insert into services (name, duration_minutes, price_cop, buffer_after_minutes, sort_order)
      values ('Corte + barba', 45, 25000, 0, 2) returning id
    `;
    comboId = combo.id;
  });

  it("charges a cash booking in full with the chosen method", async () => {
    const id = await bookCombo();
    expect(await completeBooking({ bookingId: id, method: "nequi", now })).toEqual({ ok: true });
    expect((await booking(id)).status).toBe("completed");
    expect(await salesFor(id)).toEqual([
      { kind: "balance", method: "nequi", amount_cop: 25000, booking_id: id },
    ]);
  });

  it("charges only the balance after an online deposit", async () => {
    const partial = await bookCombo("3005550101");
    await sql`update bookings set deposit_status = 'paid', deposit_cop = 8000 where id = ${partial}`;
    await completeBooking({ bookingId: partial, method: "cash", now });
    expect(await salesFor(partial)).toEqual([
      { kind: "balance", method: "cash", amount_cop: 17000, booking_id: partial },
    ]);
    expect((await booking(partial)).deposit_status).toBe("applied");

    await sql`update bookings set status = 'cancelled' where id = ${partial}`;
    const full = await bookCombo("3005550102");
    await sql`update bookings set deposit_status = 'paid', deposit_cop = 25000 where id = ${full}`;
    await completeBooking({ bookingId: full, method: "cash", now });
    expect(await salesFor(full)).toEqual([]);
    expect((await booking(full)).deposit_status).toBe("applied");
  });

  it("marks a no-show and keeps a paid deposit", async () => {
    const id = await bookCombo();
    await sql`update bookings set deposit_status = 'paid', deposit_cop = 25000 where id = ${id}`;
    expect(await markNoShow({ bookingId: id, now })).toEqual({ ok: true });
    expect(await booking(id)).toEqual({ status: "no_show", deposit_status: "forfeited" });
    expect(await salesFor(id)).toEqual([]);
  });

  it("records a walk-in sale without a booking", async () => {
    expect(await recordWalkIn({ amountCop: 15000, method: "cash", occurredAt: now })).toEqual({
      ok: true,
    });
    expect(await salesFor(null)).toEqual([
      { kind: "walk_in", method: "cash", amount_cop: 15000, booking_id: null },
    ]);
  });

  it("marks a pending refund as returned, once", async () => {
    const id = await bookCombo();
    await sql`update bookings set status = 'cancelled', deposit_status = 'refund_pending',
      deposit_cop = 25000 where id = ${id}`;
    expect(await markRefunded({ bookingId: id, now })).toEqual({ ok: true });
    expect(await markRefunded({ bookingId: id, now })).toEqual({ ok: true });
    expect((await booking(id)).deposit_status).toBe("refunded");
    expect(await salesFor(id)).toEqual([
      { kind: "refund", method: "wompi", amount_cop: -25000, booking_id: id },
    ]);
  });

  it("refuses to charge a completed booking twice", async () => {
    const id = await bookCombo();
    await completeBooking({ bookingId: id, method: "cash", now });
    expect(await completeBooking({ bookingId: id, method: "cash", now })).toEqual({
      ok: false,
      error: "invalid_state",
    });
    expect(await salesFor(id)).toHaveLength(1);
  });
});
