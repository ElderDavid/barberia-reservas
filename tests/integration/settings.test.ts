import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  setWorkingHours,
  updateLegalInfo,
  updateShopSettings,
  upsertBarber,
  upsertService,
} from "../../src/server/admin/settings.ts";
import { getAvailability } from "../../src/server/booking/availability.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { getLegalInfo } from "../../src/server/shop.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-01T12:00:00Z");
let shop: ShopFixture;

const baseSettings = {
  name: "Barbería Test",
  whatsappPhone: "3001112233",
  address: "Calle 1 # 2-3",
  depositPercent: 100,
  selfServiceCutoffHours: 4,
  holdMinutes: 15,
};

async function book(startsAt: string, phone: string) {
  const result = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      startsAt,
      name: "Cliente",
      phone,
      consent: true,
      method: "cash",
    },
    now,
  );
  if (!result.ok) throw new Error(result.error);
  return result.bookingId;
}

async function priceOf(bookingId: string): Promise<number> {
  const [row] = await sql<{ price_cop: number }[]>`
    select price_cop from bookings where id = ${bookingId}
  `;
  return row.price_cop;
}

describe("owner settings", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("new prices apply only to new bookings", async () => {
    const before = await book("2026-10-05T15:00:00.000Z", "3005550101");
    expect(
      await upsertService({
        id: shop.serviceId,
        name: "Corte clásico",
        durationMinutes: 30,
        priceCop: 18000,
        bufferAfterMinutes: 0,
        active: true,
        sortOrder: 1,
      }),
    ).toEqual({ ok: true });
    const after = await book("2026-10-05T16:00:00.000Z", "3005550102");
    expect(await priceOf(before)).toBe(15000);
    expect(await priceOf(after)).toBe(18000);
  });

  it("accepts a cutoff of 3 to 5 hours only", async () => {
    for (const hours of [3, 4, 5]) {
      expect(await updateShopSettings({ ...baseSettings, selfServiceCutoffHours: hours })).toEqual({
        ok: true,
      });
    }
    for (const hours of [2, 6]) {
      expect(await updateShopSettings({ ...baseSettings, selfServiceCutoffHours: hours })).toEqual({
        ok: false,
        error: "invalid_input",
      });
    }
    const [row] = await sql<{ self_service_cutoff_hours: number }[]>`
      select self_service_cutoff_hours from shop_settings where id = 1
    `;
    expect(row.self_service_cutoff_hours).toBe(5);
  });

  it("rejects a deposit percent outside 10–100", async () => {
    for (const depositPercent of [9, 101]) {
      expect(await updateShopSettings({ ...baseSettings, depositPercent })).toEqual({
        ok: false,
        error: "invalid_input",
      });
    }
  });

  it("new weekday hours bound the offered slots", async () => {
    expect(
      await setWorkingHours({
        barberId: shop.barberId,
        weekday: 2,
        ranges: [{ start: "10:00", end: "14:00" }],
      }),
    ).toEqual({ ok: true });
    const slots = await getAvailability({
      day: "2026-10-06", // martes
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      now,
    });
    expect(slots.length).toBeGreaterThan(0);
    const first = slots[0].startsAt.toISOString();
    const last = slots.at(-1)?.startsAt.getTime() ?? 0;
    expect(first).toBe("2026-10-06T15:00:00.000Z"); // 10:00 local
    expect(last + 30 * 60_000).toBeLessThanOrEqual(Date.parse("2026-10-06T19:00:00Z")); // 14:00
  });

  it("a deactivated barber leaves 'any' and existing bookings stay as they were", async () => {
    const id = await book("2026-10-05T15:00:00.000Z", "3005550101");
    expect(
      await upsertBarber({ id: shop.barberId, name: "Andrés", active: false, sortOrder: 1 }),
    ).toEqual({ ok: true });
    const slots = await getAvailability({
      day: "2026-10-05",
      serviceId: shop.serviceId,
      barberId: "any",
      now,
    });
    expect(slots.every((s) => s.barberId === shop.barber2Id)).toBe(true);
    const [row] = await sql<{ status: string; barber_id: string }[]>`
      select status, barber_id from bookings where id = ${id}
    `;
    expect(row).toEqual({ status: "confirmed", barber_id: shop.barberId });
  });

  it("guards every settings action with requireOwner()", () => {
    const source = readFileSync("src/app/admin/ajustes/actions.ts", "utf8");
    const bodies = [...source.matchAll(/export async function \w+\([^)]*\)[^{]*\{\s*([^;]*;)/g)];
    expect(bodies).toHaveLength(8);
    for (const [, first] of bodies) expect(first.trim()).toBe("await requireOwner();");
  });

  it("saves the legal responsible party and rejects an unknown document type", async () => {
    const legal = {
      legalName: "Ana Gómez",
      legalIdType: "CC",
      legalIdNumber: "12345678",
      privacyEmail: "datos@example.com",
    };
    expect(await updateLegalInfo({ ...legal, legalIdType: "RUT" })).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(await updateLegalInfo({ ...legal, legalIdNumber: "12a" })).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(await updateLegalInfo(legal)).toEqual({ ok: true });
    expect(
      await updateLegalInfo({ ...legal, legalIdType: "NIT", legalIdNumber: "900123456-7" }),
    ).toEqual({ ok: true });
    const info = await getLegalInfo();
    expect(info).toMatchObject({
      legalName: "Ana Gómez",
      legalIdType: "NIT",
      legalIdNumber: "900123456-7",
      privacyEmail: "datos@example.com",
    });
  });
});
