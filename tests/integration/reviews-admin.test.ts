import { beforeEach, describe, expect, it } from "vitest";
import { saveReview } from "../../src/server/accounts/reviews.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import {
  countUnanswered,
  listReviews,
  replyToReview,
  setReviewHidden,
} from "../../src/server/admin/reviews.ts";
import { getBarberProfile } from "../../src/server/barbers.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-07T17:00:00Z");
let shop: ShopFixture;
let seq = 0;

/** A new customer whose attended visit with `barberId` got `rating` stars. Returns the review id. */
async function rated(
  rating: number,
  comment: string,
  options: { name?: string; barberId?: string; createdAt?: string } = {},
): Promise<string> {
  seq += 1;
  const phone = `30012345${String(seq).padStart(2, "0")}`;
  const signed = await signUpCustomer(
    {
      name: options.name ?? `Cliente ${seq}`,
      email: `c${seq}@example.com`,
      phone,
      password: "clave-segura-1",
      consent: true,
    },
    now,
  );
  if (!signed.ok) throw new Error(signed.error);
  const hour = String(13 + seq).padStart(2, "0");
  const booked = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: options.barberId ?? shop.barberId,
      startsAt: `2026-10-12T${hour}:00:00.000Z`,
      name: "Cliente",
      phone,
      consent: true,
      method: "cash",
      userId: signed.userId,
    },
    now,
  );
  if (!booked.ok) throw new Error(booked.error);
  await sql`update bookings set status = 'completed', completed_at = now()
    where id = ${booked.bookingId}`;
  const at = new Date(options.createdAt ?? `2026-10-07T1${seq % 10}:00:00Z`);
  const saved = await saveReview(
    signed.userId,
    { bookingId: booked.bookingId, rating: String(rating), comment },
    at,
  );
  if (!saved.ok) throw new Error(saved.error);
  const [row] = await sql<{ id: string }[]>`
    select id from reviews where booking_id = ${booked.bookingId}
  `;
  return row.id;
}

describe("owner reviews and barber profile", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
    seq = 0;
  });

  it("lists newest first, filters unanswered and counts them", async () => {
    const older = await rated(4, "Bien", { createdAt: "2026-10-07T10:00:00Z" });
    const newer = await rated(5, "", { createdAt: "2026-10-07T12:00:00Z" });
    expect((await listReviews("todas")).map((r) => r.id)).toEqual([newer, older]);
    expect(await countUnanswered()).toBe(2);
    expect(await replyToReview({ reviewId: older, reply: "  ¡Gracias!  " }, now)).toEqual({
      ok: true,
    });
    expect((await listReviews("sin-responder")).map((r) => r.id)).toEqual([newer]);
    expect(await countUnanswered()).toBe(1);
    const [reply] = (await listReviews("todas")).filter((r) => r.id === older);
    expect(reply).toMatchObject({
      ownerReply: "¡Gracias!",
      rating: 4,
      barberName: "Andrés",
      serviceName: "Corte clásico",
    });
  });

  it("edits a reply and rejects empty or unknown ones", async () => {
    const id = await rated(5, "Excelente");
    await replyToReview({ reviewId: id, reply: "Gracias" }, now);
    expect(await replyToReview({ reviewId: id, reply: "Gracias, Ana" }, now)).toEqual({
      ok: true,
    });
    const [row] = await listReviews("todas");
    expect(row.ownerReply).toBe("Gracias, Ana");
    expect(await replyToReview({ reviewId: id, reply: "   " }, now)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(await replyToReview({ reviewId: id, reply: "a".repeat(501) }, now)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(
      await replyToReview({ reviewId: "00000000-0000-4000-8000-000000000000", reply: "Hola" }, now),
    ).toEqual({ ok: false, error: "not_found" });
  });

  it("averages from 3 ratings, shows first names only and hides hidden reviews", async () => {
    await rated(4, "Muy buen corte", { name: "Ana María Pérez" });
    await rated(5, "");
    expect(await getBarberProfile(shop.barberId)).toMatchObject({
      name: "Andrés",
      ratingCount: 2,
      average: null,
    });
    await rated(4, "Volveré");
    const bad = await rated(1, "Comentario ofensivo");
    await rated(5, "Excelente", { barberId: shop.barber2Id });
    let profile = await getBarberProfile(shop.barberId);
    expect(profile).toMatchObject({ ratingCount: 4, average: 3.5 });
    expect(await setReviewHidden({ reviewId: bad, hidden: "1" }, now)).toEqual({ ok: true });
    expect(await countUnanswered()).toBe(4);
    profile = await getBarberProfile(shop.barberId);
    expect(profile?.ratingCount).toBe(3);
    expect(profile?.average).toBeCloseTo(13 / 3);
    expect(profile?.reviews.map((r) => r.comment).sort()).toEqual(["Muy buen corte", "Volveré"]);
    expect(profile?.reviews.find((r) => r.comment === "Muy buen corte")?.firstName).toBe("Ana");
    expect(profile?.services.map((s) => s.name)).toEqual(["Corte clásico"]);
    expect((await listReviews("todas")).find((r) => r.id === bad)?.hidden).toBe(true);
    await setReviewHidden({ reviewId: bad, hidden: "0" }, now);
    expect((await getBarberProfile(shop.barberId))?.ratingCount).toBe(4);
  });

  it("returns no profile for unknown, malformed or inactive barbers", async () => {
    expect(await getBarberProfile("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await getBarberProfile("andres")).toBeNull();
    await sql`update barbers set active = false where id = ${shop.barber2Id}`;
    expect(await getBarberProfile(shop.barber2Id)).toBeNull();
  });
});
