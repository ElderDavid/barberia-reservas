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
  "consents",
  "reviews",
  "loyalty_redemptions",
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

  it("user.role defaults to customer and rejects other values", async () => {
    await sql`insert into "user" (id, name, email) values ('u1', 'Ana', 'ana@example.com')`;
    const [row] = await sql<{ role: string; phone: string | null }[]>`
      select role, phone from "user" where id = 'u1'
    `;
    expect(row).toEqual({ role: "customer", phone: null });
    await expect(
      sql`insert into "user" (id, name, email, role) values ('u2', 'Bo', 'bo@example.com', 'admin')`,
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("consents and legal columns exist", async () => {
    await sql`insert into "user" (id, name, email) values ('u1', 'Ana', 'ana@example.com')`;
    await sql`
      insert into consents (user_id, kind, version, channel)
      values ('u1', 'privacy', '2026-10-07', 'registro')
    `;
    await expect(
      sql`insert into consents (user_id, kind, version, channel) values ('u1', 'otro', 'v', 'registro')`,
    ).rejects.toMatchObject({ code: "23514" });
    const [settings] = await sql<Record<string, string>[]>`
      select legal_name, legal_id_type, legal_id_number, privacy_email from shop_settings where id = 1
    `;
    expect(settings).toEqual({
      legal_name: "",
      legal_id_type: "",
      legal_id_number: "",
      privacy_email: "",
    });
  });
});
