import { beforeEach, describe, expect, it } from "vitest";
import { getAccountHome } from "../../src/server/accounts/home.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { getLoyalty } from "../../src/server/loyalty.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-07T17:00:00Z");
let shop: ShopFixture;
let ana: string;

async function account(name: string, email: string): Promise<string> {
  const signed = await signUpCustomer(
    { name, email, phone: "3001234567", password: "clave-segura-1", consent: true },
    now,
  );
  if (!signed.ok) throw new Error(signed.error);
  return signed.userId;
}

async function book(startsAt: string, userId: string, status?: string): Promise<string> {
  const booked = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      startsAt,
      name: "Ana",
      phone: "3001234567",
      consent: true,
      method: "cash",
      userId,
    },
    new Date("2026-10-01T12:00:00Z"),
  );
  if (!booked.ok) throw new Error(booked.error);
  if (status) await sql`update bookings set status = ${status} where id = ${booked.bookingId}`;
  return booked.bookingId;
}

describe("account home", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
    ana = await account("  Ana María  Pérez ", "ana@example.com");
  });

  it("greets with the first name only", async () => {
    expect((await getAccountHome(ana, now))?.firstName).toBe("Ana");
  });

  it("has no next booking when there is none", async () => {
    expect((await getAccountHome(ana, now))?.next).toBeNull();
  });

  it("picks the earliest upcoming booking of the account", async () => {
    const later = await book("2026-10-14T15:00:00.000Z", ana);
    const sooner = await book("2026-10-12T15:00:00.000Z", ana);
    const home = await getAccountHome(ana, now);
    expect(home?.next?.id).toBe(sooner);
    expect(home?.next?.id).not.toBe(later);
    expect(home?.next?.serviceName).toBeTruthy();
    expect(home?.next?.barberName).toBeTruthy();
  });

  it("ignores started, cancelled and other accounts' bookings", async () => {
    const bruno = await account("Bruno", "bruno@example.com");
    await book("2026-10-07T16:00:00.000Z", ana); // started an hour ago
    await book("2026-10-12T15:00:00.000Z", ana, "cancelled");
    await book("2026-10-12T16:00:00.000Z", bruno);
    expect((await getAccountHome(ana, now))?.next).toBeNull();
  });

  it("carries the same loyalty card as Cuenta", async () => {
    await book("2026-10-02T15:00:00.000Z", ana, "completed");
    expect((await getAccountHome(ana, now))?.loyalty).toEqual(await getLoyalty(ana));
  });

  it("is null for an unknown account", async () => {
    expect(await getAccountHome("nadie", now)).toBeNull();
  });
});
