import { beforeEach, describe, expect, it } from "vitest";
import { exportAccount } from "../../src/server/accounts/export.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { rescheduleBooking } from "../../src/server/booking/manage.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-07T17:00:00Z");
let shop: ShopFixture;

async function customer(name: string, email: string): Promise<string> {
  const result = await signUpCustomer(
    { name, email, phone: "3001234567", password: "clave-segura-1", consent: true },
    now,
  );
  if (!result.ok) throw new Error(result.error);
  return result.userId;
}

async function book(startsAt: string, phone: string, userId?: string | null) {
  const result = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      startsAt,
      name: "Cliente",
      phone,
      consent: true,
      method: "cash",
      userId,
    },
    now,
  );
  if (!result.ok) throw new Error(result.error);
  return result;
}

async function userIdOf(bookingId: string): Promise<string | null> {
  const [row] = await sql<{ user_id: string | null }[]>`
    select user_id from bookings where id = ${bookingId}
  `;
  return row.user_id;
}

describe("bookings linked to an account", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("stores the account on the booking, and none for guests", async () => {
    const ana = await customer("Ana", "ana@example.com");
    const linked = await book("2026-10-12T15:00:00.000Z", "3001234567", ana);
    const guest = await book("2026-10-12T16:00:00.000Z", "3001234568");
    expect(await userIdOf(linked.bookingId)).toBe(ana);
    expect(await userIdOf(guest.bookingId)).toBeNull();
  });

  it("keeps the account when the booking is rescheduled", async () => {
    const ana = await customer("Ana", "ana@example.com");
    const original = await book("2026-10-12T15:00:00.000Z", "3001234567", ana);
    const moved = await rescheduleBooking({
      bookingId: original.bookingId,
      newStartsAt: new Date("2026-10-12T17:00:00.000Z"),
      actor: "customer",
      now,
      enforceCutoff: true,
    });
    expect(moved.ok).toBe(true);
    if (!moved.ok || !moved.bookingId) throw new Error("no booking id");
    expect(await userIdOf(moved.bookingId)).toBe(ana);
  });

  it("exports the account's own bookings only", async () => {
    const ana = await customer("Ana", "ana@example.com");
    const beto = await customer("Beto", "beto@example.com");
    await book("2026-10-12T15:00:00.000Z", "3001234567", ana);
    await book("2026-10-12T16:00:00.000Z", "3001234568", beto);
    const data = await exportAccount(ana, now);
    expect(data?.bookings).toEqual([
      {
        service: "Corte clásico",
        barber: "Andrés",
        startsAt: "2026-10-12T15:00:00.000Z",
        status: "confirmed",
        priceCop: 15000,
      },
    ]);
  });
});
