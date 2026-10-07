import { beforeEach, describe, expect, it } from "vitest";
import { deleteAccount } from "../../src/server/accounts/delete.ts";
import { exportAccount } from "../../src/server/accounts/export.ts";
import { updateProfile } from "../../src/server/accounts/profile.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { auth } from "../../src/server/auth.ts";
import { createBooking } from "../../src/server/booking/create.ts";
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

describe("customer account", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("updates name and normalizes the phone; rejects a bad phone", async () => {
    const id = await customer("Ana", "ana@example.com");
    expect(
      await updateProfile(id, { name: " Ana María ", phone: "+57 310 555 0101" }, now),
    ).toEqual({ ok: true });
    const [row] = await sql<{ name: string; phone: string }[]>`
      select name, phone from "user" where id = ${id}
    `;
    expect(row).toEqual({ name: "Ana María", phone: "573105550101" });
    expect(await updateProfile(id, { name: "Ana", phone: "12" }, now)).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });

  it("exports only the customer's own data", async () => {
    const ana = await customer("Ana", "ana@example.com");
    await customer("Beto", "beto@example.com");
    const data = await exportAccount(ana, now);
    expect(data?.profile).toMatchObject({ name: "Ana", email: "ana@example.com" });
    expect(data?.consents).toHaveLength(2);
    expect(data?.bookings).toEqual([]);
    expect(JSON.stringify(data)).not.toContain("beto@example.com");
  });

  it("deletes the user and sessions but keeps bookings", async () => {
    const id = await customer("Ana", "ana@example.com");
    await auth.api.signInEmail({ body: { email: "ana@example.com", password: "clave-segura-1" } });
    const booked = await createBooking(
      {
        serviceId: shop.serviceId,
        barberId: shop.barberId,
        startsAt: "2026-10-12T15:00:00.000Z",
        name: "Ana",
        phone: "3001234567",
        consent: true,
        method: "cash",
      },
      now,
    );
    if (!booked.ok) throw new Error(booked.error);
    expect(await deleteAccount(id, now)).toEqual({ ok: true });
    const [counts] = await sql<{ users: number; sessions: number; consents: number }[]>`
      select (select count(*)::int from "user") as users,
        (select count(*)::int from session) as sessions,
        (select count(*)::int from consents where user_id is not null) as consents
    `;
    expect(counts).toEqual({ users: 0, sessions: 0, consents: 0 });
    const [booking] = await sql<{ customer_id: string | null }[]>`
      select customer_id from bookings where id = ${booked.bookingId}
    `;
    expect(booking.customer_id).toBeTruthy();
  });

  it("refuses to delete the owner", async () => {
    const id = await customer("Dueño", "owner@example.com");
    await sql`update "user" set role = 'owner' where id = ${id}`;
    expect(await deleteAccount(id, now)).toEqual({ ok: false, error: "owner_cannot_delete" });
    const [row] = await sql<{ n: number }[]>`select count(*)::int as n from "user"`;
    expect(row.n).toBe(1);
  });
});
