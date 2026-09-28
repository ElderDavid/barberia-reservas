import { beforeEach, describe, expect, it } from "vitest";
import { type CreateBookingInput, createBooking } from "../../src/server/booking/create.ts";
import { hashToken } from "../../src/server/booking/token.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-01T12:00:00Z");
const startsAt = "2026-10-05T15:00:00.000Z"; // lunes 10:00 en Bogotá
let shop: ShopFixture;

function request(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    serviceId: shop.serviceId,
    barberId: shop.barberId,
    startsAt,
    name: "Juan Pérez",
    phone: "300 555 0101",
    consent: true,
    method: "cash",
    ...overrides,
  };
}

async function bookingCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from bookings`;
  return row.n;
}

describe("createBooking (cash)", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("confirms a valid cash booking and stores only the token hash", async () => {
    const result = await createBooking(request(), now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [row] = await sql<
      {
        status: string;
        payment_method: string;
        deposit_cop: number;
        price_cop: number;
        manage_token_hash: string;
      }[]
    >`select status, payment_method, deposit_cop, price_cop, manage_token_hash
      from bookings where id = ${result.bookingId}`;
    expect(row).toMatchObject({
      status: "confirmed",
      payment_method: "cash",
      deposit_cop: 0,
      price_cop: 15000,
    });
    expect(row.manage_token_hash).toBe(hashToken(result.token));
  });

  it("lets exactly one of 50 parallel requests win the same slot", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        createBooking(request({ phone: `3${String(i).padStart(9, "0")}` }), now),
      ),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.error === "slot_taken")).toHaveLength(49);
    expect(await bookingCount()).toBe(1);
  });

  it("rejects times that are not offered", async () => {
    for (const time of [
      "2026-10-05T12:00:00.000Z", // 07:00, before opening
      "2026-10-01T12:30:00.000Z", // inside the minimum notice
      "2026-12-01T15:00:00.000Z", // beyond max_advance_days
    ]) {
      expect(await createBooking(request({ startsAt: time }), now)).toEqual({
        ok: false,
        error: "slot_unavailable",
      });
    }
    expect(await bookingCount()).toBe(0);
  });

  it("rejects an invalid phone or missing consent", async () => {
    for (const bad of [{ phone: "2015550101" }, { phone: "30055501" }, { consent: false }]) {
      expect(await createBooking(request(bad), now)).toEqual({
        ok: false,
        error: "invalid_input",
      });
    }
    expect(await bookingCount()).toBe(0);
  });

  it("limits a phone to 3 pending bookings", async () => {
    for (const time of [
      "2026-10-05T15:00:00.000Z",
      "2026-10-05T16:00:00.000Z",
      "2026-10-05T17:00:00.000Z",
    ]) {
      expect((await createBooking(request({ startsAt: time }), now)).ok).toBe(true);
    }
    expect(await createBooking(request({ startsAt: "2026-10-05T18:00:00.000Z" }), now)).toEqual({
      ok: false,
      error: "too_many_bookings",
    });
  });

  it("with any barber, falls through to the next free one", async () => {
    const first = await createBooking(request({ phone: "3005550101" }), now);
    expect(first.ok).toBe(true);
    const second = await createBooking(request({ barberId: "any", phone: "3005550102" }), now);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const [row] = await sql<{ barber_id: string }[]>`
      select barber_id from bookings where id = ${second.bookingId}
    `;
    expect(row.barber_id).toBe(shop.barber2Id);
  });
});
