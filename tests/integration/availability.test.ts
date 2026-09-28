import { beforeEach, describe, expect, it } from "vitest";
import { getAvailability } from "../../src/server/booking/availability.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-01T12:00:00Z");
const day = "2026-10-05";
let shop: ShopFixture;

async function andresSlots(): Promise<string[]> {
  const slots = await getAvailability({
    day,
    serviceId: shop.serviceId,
    barberId: shop.barberId,
    now,
  });
  return slots.map((slot) => slot.startsAt.toISOString());
}

async function insertBooking(status: "confirmed" | "held", holdExpiresAt: string | null) {
  await sql`
    insert into bookings (barber_id, service_id, customer_id, starts_at, ends_at, blocked_from,
      blocked_until, status, payment_method, price_cop, manage_token_hash, hold_expires_at)
    values (${shop.barberId}, ${shop.serviceId}, ${shop.customerId}, '2026-10-05T15:00:00Z',
      '2026-10-05T15:30:00Z', '2026-10-05T15:00:00Z', '2026-10-05T15:30:00Z', ${status}, 'cash',
      15000, ${`hash-${status}`}, ${holdExpiresAt})
  `;
}

describe("getAvailability", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("excludes a slot taken by a confirmed booking", async () => {
    expect(await andresSlots()).toContain("2026-10-05T15:00:00.000Z");
    await insertBooking("confirmed", null);
    expect(await andresSlots()).not.toContain("2026-10-05T15:00:00.000Z");
  });

  it("ignores a held booking whose hold has expired", async () => {
    await insertBooking("held", "2026-10-01T11:00:00Z");
    expect(await andresSlots()).toContain("2026-10-05T15:00:00.000Z");
  });

  it("returns nothing on a day the whole shop is closed", async () => {
    await sql`
      insert into time_off (barber_id, starts_at, ends_at, reason)
      values (null, '2026-10-05T05:00:00Z', '2026-10-06T05:00:00Z', 'Festivo')
    `;
    expect(await andresSlots()).toEqual([]);
    const any = await getAvailability({ day, serviceId: shop.serviceId, barberId: "any", now });
    expect(any).toEqual([]);
  });
});
