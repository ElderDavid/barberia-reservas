import { beforeEach, describe, expect, it } from "vitest";
import {
  claimBookings,
  findAccountBooking,
  listAccountBookings,
} from "../../src/server/accounts/bookings.ts";
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

  it("sorts the account's bookings into tabs and counts visits", async () => {
    const ana = await customer("Ana", "ana@example.com");
    const ids: Record<string, string> = {};
    const plan: [string, string, string][] = [
      ["done1", "2026-10-08T15:00:00.000Z", "completed"],
      ["done2", "2026-10-08T16:00:00.000Z", "completed"],
      ["noshow", "2026-10-08T17:00:00.000Z", "no_show"],
      ["stale", "2026-10-08T18:00:00.000Z", "confirmed"],
      ["soon", "2026-10-13T15:00:00.000Z", "confirmed"],
      ["later", "2026-10-14T15:00:00.000Z", "confirmed"],
      ["gone", "2026-10-13T17:00:00.000Z", "cancelled"],
    ];
    // Different phones: one phone may hold only 3 pending bookings.
    for (const [index, [key, startsAt, status]] of plan.entries()) {
      ids[key] = (await book(startsAt, `300123456${index}`, ana)).bookingId;
      await sql`update bookings set status = ${status}::booking_status where id = ${ids[key]}`;
    }
    const moved = (await book("2026-10-13T18:00:00.000Z", "3001234569", ana)).bookingId;
    await sql`update bookings set status = 'cancelled', cancel_reason = 'reprogramada' where id = ${moved}`;
    const later = new Date("2026-10-10T12:00:00Z");
    const list = await listAccountBookings(ana, later);
    expect(list.visits).toBe(2);
    expect(list.upcoming.map((b) => b.id)).toEqual([ids.soon, ids.later]);
    expect(list.past.map((b) => b.id)).toEqual([ids.stale, ids.noshow, ids.done2, ids.done1]);
    expect(list.cancelled.map((b) => b.id)).toEqual([ids.gone]);
    expect(list.upcoming[0]).toMatchObject({
      serviceName: "Corte clásico",
      barberName: "Andrés",
      priceCop: 15000,
      status: "confirmed",
    });
  });

  it("claims guest bookings by their private link, never someone else's", async () => {
    const ana = await customer("Ana", "ana@example.com");
    const beto = await customer("Beto", "beto@example.com");
    const guest = await book("2026-10-12T15:00:00.000Z", "3001234567");
    const betos = await book("2026-10-12T16:00:00.000Z", "3001234568", beto);
    expect(await claimBookings(ana, [guest.token], now)).toEqual({ ok: true, claimed: 1 });
    expect(await userIdOf(guest.bookingId)).toBe(ana);
    expect(await claimBookings(ana, [guest.token], now)).toEqual({ ok: true, claimed: 0 });
    expect(await claimBookings(ana, [betos.token], now)).toEqual({ ok: true, claimed: 0 });
    expect(await userIdOf(betos.bookingId)).toBe(beto);
  });

  it("ignores malformed tokens and looks at 20 at most", async () => {
    const ana = await customer("Ana", "ana@example.com");
    const guest = await book("2026-10-12T15:00:00.000Z", "3001234567");
    const junk = Array.from({ length: 20 }, (_, i) => `x${i}`.padEnd(43, "a"));
    expect(await claimBookings(ana, ["no", "", ...junk, guest.token], now)).toEqual({
      ok: true,
      claimed: 0,
    });
    expect(await claimBookings(ana, ["no", guest.token], now)).toEqual({ ok: true, claimed: 1 });
  });

  it("shows a booking only to the account that owns it", async () => {
    const ana = await customer("Ana", "ana@example.com");
    const beto = await customer("Beto", "beto@example.com");
    const own = await book("2026-10-12T15:00:00.000Z", "3001234567", ana);
    expect((await findAccountBooking(ana, own.bookingId))?.booking.id).toBe(own.bookingId);
    expect(await findAccountBooking(beto, own.bookingId)).toBeNull();
    expect(await findAccountBooking(ana, "no-es-un-uuid")).toBeNull();
  });
});
