import { beforeEach, describe, expect, it } from "vitest";
import { listAccountBookings } from "../../src/server/accounts/bookings.ts";
import { deleteAccount } from "../../src/server/accounts/delete.ts";
import { exportAccount } from "../../src/server/accounts/export.ts";
import { getAccountReview, saveReview } from "../../src/server/accounts/reviews.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-07T17:00:00Z");
let shop: ShopFixture;

async function customer(name: string, email: string, phone: string): Promise<string> {
  const result = await signUpCustomer(
    { name, email, phone, password: "clave-segura-1", consent: true },
    now,
  );
  if (!result.ok) throw new Error(result.error);
  return result.userId;
}

async function book(startsAt: string, phone: string, userId: string): Promise<string> {
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
  return result.bookingId;
}

async function complete(bookingId: string): Promise<void> {
  await sql`update bookings set status = 'completed', completed_at = now() where id = ${bookingId}`;
}

describe("customer reviews", () => {
  let ana: string;
  let bookingId: string;

  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
    ana = await customer("Ana", "ana@example.com", "3001234567");
    bookingId = await book("2026-10-12T15:00:00.000Z", "3001234567", ana);
  });

  it("rates an attended booking of the account and edits it before a reply", async () => {
    await complete(bookingId);
    expect(await saveReview(ana, { bookingId, rating: "5", comment: "  Excelente  " }, now)).toEqual(
      { ok: true },
    );
    expect(await getAccountReview(ana, bookingId)).toMatchObject({
      rating: 5,
      comment: "Excelente",
      ownerReply: null,
    });
    expect(await saveReview(ana, { bookingId, rating: "4", comment: "" }, now)).toEqual({
      ok: true,
    });
    expect(await getAccountReview(ana, bookingId)).toMatchObject({ rating: 4, comment: "" });
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int from reviews`;
    expect(count).toBe(1);
  });

  it("refuses edits once the owner replied", async () => {
    await complete(bookingId);
    await saveReview(ana, { bookingId, rating: "5", comment: "Bien" }, now);
    await sql`update reviews set owner_reply = 'Gracias', replied_at = now()`;
    expect(await saveReview(ana, { bookingId, rating: "1", comment: "" }, now)).toEqual({
      ok: false,
      error: "already_replied",
    });
    expect(await getAccountReview(ana, bookingId)).toMatchObject({
      rating: 5,
      ownerReply: "Gracias",
    });
  });

  it("refuses another account's booking and bookings that were not attended", async () => {
    const beto = await customer("Beto", "beto@example.com", "3001234568");
    await complete(bookingId);
    expect(await saveReview(beto, { bookingId, rating: "5", comment: "" }, now)).toEqual({
      ok: false,
      error: "not_found",
    });
    const pending = await book("2026-10-13T15:00:00.000Z", "3001234567", ana);
    expect(await saveReview(ana, { bookingId: pending, rating: "5", comment: "" }, now)).toEqual({
      ok: false,
      error: "not_completed",
    });
    expect(await getAccountReview(beto, bookingId)).toBeNull();
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int from reviews`;
    expect(count).toBe(0);
  });

  it("rejects malformed input", async () => {
    await complete(bookingId);
    for (const input of [
      { bookingId, rating: "0", comment: "" },
      { bookingId, rating: "6", comment: "" },
      { bookingId, rating: "x", comment: "" },
      { bookingId, rating: "4.5", comment: "" },
      { bookingId, rating: "5", comment: "a".repeat(501) },
      { bookingId: "nope", rating: "5", comment: "" },
      null,
    ]) {
      expect(await saveReview(ana, input, now)).toEqual({ ok: false, error: "invalid_input" });
    }
  });

  it("shows the rating on Mis citas, exports it and deletes it with the account", async () => {
    await complete(bookingId);
    await saveReview(ana, { bookingId, rating: "4", comment: "Muy bien" }, now);
    const lists = await listAccountBookings(ana, now);
    expect(lists.past.map((b) => b.rating)).toEqual([4]);
    const data = await exportAccount(ana, now);
    expect(data?.reviews).toEqual([
      {
        bookingStartsAt: "2026-10-12T15:00:00.000Z",
        rating: 4,
        comment: "Muy bien",
        ownerReply: null,
      },
    ]);
    expect(await deleteAccount(ana, now)).toEqual({ ok: true });
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int from reviews`;
    expect(count).toBe(0);
  });
});
