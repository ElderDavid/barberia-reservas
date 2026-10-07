import { beforeEach, describe, expect, it } from "vitest";
import { saveReview } from "../../src/server/accounts/reviews.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { getClient, listClients } from "../../src/server/admin/clients.ts";
import { updateLoyaltySettings } from "../../src/server/admin/settings.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-07T17:00:00Z");
let shop: ShopFixture;
let hour = 13;

async function book(
  name: string,
  phone: string,
  status: "completed" | "confirmed" | "cancelled",
  userId: string | null = null,
): Promise<string> {
  hour += 1;
  const booked = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      startsAt: `2026-10-12T${hour}:00:00.000Z`,
      name,
      phone,
      consent: true,
      method: "cash",
      userId,
    },
    now,
  );
  if (!booked.ok) throw new Error(booked.error);
  await sql`update bookings set status = ${status} where id = ${booked.bookingId}`;
  return booked.bookingId;
}

async function customerId(phone: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`select id from customers where phone = ${`57${phone}`}`;
  return row.id;
}

describe("owner's client list", () => {
  let ana: string;

  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
    hour = 13;
    await updateLoyaltySettings({ goal: 5, reward: "Corte gratis" });
    const signed = await signUpCustomer(
      {
        name: "Ana Ruiz",
        email: "ana@example.com",
        phone: "3101112233",
        password: "clave-segura-1",
        consent: true,
      },
      now,
    );
    if (!signed.ok) throw new Error(signed.error);
    ana = signed.userId;
    const first = await book("Ana Ruiz", "3101112233", "completed", ana);
    const second = await book("Ana Ruiz", "3101112233", "completed", ana);
    await book("Ana Ruiz", "3101112233", "cancelled", ana);
    await saveReview(ana, { bookingId: first, rating: "4", comment: "Bien" }, now);
    await saveReview(ana, { bookingId: second, rating: "5", comment: "" }, now);
    await book("Pedro_50% O'Neil", "3209998877", "completed");
  });

  it("lists clients with visits, last visit, account, stamps and average given", async () => {
    const rows = await listClients("");
    const anaRow = rows.find((r) => r.name === "Ana Ruiz");
    expect(anaRow).toMatchObject({
      phone: "573101112233",
      visits: 2,
      userId: ana,
      stamps: 2,
      averageGiven: 4.5,
    });
    expect(anaRow?.lastVisit?.toISOString()).toBe("2026-10-12T15:00:00.000Z");
    const pedro = rows.find((r) => r.name.startsWith("Pedro"));
    expect(pedro).toMatchObject({ visits: 1, userId: null, stamps: null, averageGiven: null });
    // The seeded customer never came, so they sort last.
    expect(rows.at(-1)?.name).toBe("Cliente Prueba");
  });

  it("searches by name or phone, literally", async () => {
    expect((await listClients("ana")).map((r) => r.name)).toEqual(["Ana Ruiz"]);
    expect((await listClients("320 999")).map((r) => r.name)).toEqual(["Pedro_50% O'Neil"]);
    expect((await listClients("50%")).map((r) => r.name)).toEqual(["Pedro_50% O'Neil"]);
    expect((await listClients("O'Neil")).map((r) => r.name)).toEqual(["Pedro_50% O'Neil"]);
    expect((await listClients("_")).map((r) => r.name)).toEqual(["Pedro_50% O'Neil"]);
    expect(await listClients("a%b")).toEqual([]);
  });

  it("details a client with bookings, reviews and loyalty", async () => {
    const detail = await getClient(await customerId("3101112233"));
    expect(detail?.bookings).toHaveLength(3);
    expect(detail?.reviews.map((r) => r.rating).sort()).toEqual([4, 5]);
    expect(detail?.loyalty).toMatchObject({ goal: 5, available: 2, full: false });
    const guest = await getClient(await customerId("3209998877"));
    expect(guest).toMatchObject({ userId: null, loyalty: null, reviews: [] });
    expect(await getClient("00000000-0000-4000-8000-000000000000")).toBeNull();
    expect(await getClient("nope")).toBeNull();
  });
});
