import { beforeEach, describe, expect, it } from "vitest";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const TABLES = [
  "user",
  "session",
  "account",
  "verification",
  "shop_settings",
  "barbers",
  "services",
  "working_hours",
  "time_off",
  "customers",
  "bookings",
  "payments",
  "sales",
  "expense_categories",
  "expenses",
];

let shop: ShopFixture;
let tokenCounter = 0;

async function insertBooking(from: string, until: string, status: "confirmed" | "cancelled") {
  tokenCounter += 1;
  await sql`
    insert into bookings (barber_id, service_id, customer_id, starts_at, ends_at, blocked_from,
      blocked_until, status, payment_method, price_cop, manage_token_hash)
    values (${shop.barberId}, ${shop.serviceId}, ${shop.customerId}, ${from}, ${until}, ${from},
      ${until}, ${status}, 'cash', 15000, ${`hash-${tokenCounter}`})
  `;
}

describe("database schema", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("creates every table of the data model", async () => {
    for (const table of TABLES) {
      const [row] = await sql<{ reg: string | null }[]>`
        select to_regclass(${`public."${table}"`})::text as reg
      `;
      expect(row.reg, table).not.toBeNull();
    }
  });

  it("rejects overlapping confirmed bookings of one barber with 23P01", async () => {
    await insertBooking("2026-10-05T14:00:00Z", "2026-10-05T14:30:00Z", "confirmed");
    await expect(
      insertBooking("2026-10-05T14:15:00Z", "2026-10-05T14:45:00Z", "confirmed"),
    ).rejects.toMatchObject({ code: "23P01" });
  });

  it("accepts an overlapping booking when it is cancelled", async () => {
    await insertBooking("2026-10-05T14:00:00Z", "2026-10-05T14:30:00Z", "confirmed");
    await expect(
      insertBooking("2026-10-05T14:15:00Z", "2026-10-05T14:45:00Z", "cancelled"),
    ).resolves.toBeUndefined();
  });

  it("accepts contiguous bookings that only touch", async () => {
    await insertBooking("2026-10-05T14:00:00Z", "2026-10-05T14:30:00Z", "confirmed");
    await expect(
      insertBooking("2026-10-05T14:30:00Z", "2026-10-05T15:00:00Z", "confirmed"),
    ).resolves.toBeUndefined();
  });

  it("enables row level security on every public table", async () => {
    const rows = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select relname, relrowsecurity from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `;
    expect(rows.length).toBeGreaterThanOrEqual(TABLES.length);
    for (const row of rows) expect(row.relrowsecurity, row.relname).toBe(true);
  });
});
