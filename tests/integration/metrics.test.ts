import { beforeAll, describe, expect, it } from "vitest";
import { getMetrics } from "../../src/server/admin/metrics.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { seedShop } from "../setup/fixtures.ts";

async function categoryId(name: string): Promise<string> {
  const [row] = await sql<{ id: string }[]>`
    insert into expense_categories (name) values (${name})
    on conflict (name) do update set name = excluded.name returning id
  `;
  return row.id;
}

describe("getMetrics", () => {
  beforeAll(async () => {
    await truncateAll();
    const shop = await seedShop();

    const salesRows: [string, number, string, string][] = [
      ["deposit", 15000, "wompi", "2026-10-03T15:00:00Z"],
      ["balance", 25000, "cash", "2026-10-03T16:00:00Z"],
      ["walk_in", 15000, "nequi", "2026-10-10T20:00:00Z"],
      ["refund", -15000, "wompi", "2026-10-12T14:00:00Z"],
      ["walk_in", 10000, "cash", "2026-11-01T02:00:00Z"],
    ];
    for (const [kind, amount, method, at] of salesRows) {
      await sql`insert into sales (kind, amount_cop, method, occurred_at)
        values (${kind}, ${amount}, ${method}, ${at})`;
    }

    const rent = await categoryId("Arriendo");
    const products = await categoryId("Productos");
    await sql`insert into expenses (category_id, amount_cop, spent_on) values
      (${rent}, 800000, '2026-10-01'),
      (${products}, 120000, '2026-10-15'),
      (${products}, 30000, '2026-11-01')`;

    const bookingRows: [string, string, string][] = [
      ["completed", "2026-10-03T15:00:00Z", "2026-10-03T15:30:00Z"],
      ["completed", "2026-10-03T15:30:00Z", "2026-10-03T16:00:00Z"],
      ["no_show", "2026-10-05T15:00:00Z", "2026-10-05T15:30:00Z"],
    ];
    for (const [i, [status, from, until]] of bookingRows.entries()) {
      await sql`insert into bookings (barber_id, service_id, customer_id, starts_at, ends_at,
          blocked_from, blocked_until, status, payment_method, price_cop, manage_token_hash)
        values (${shop.barberId}, ${shop.serviceId}, ${shop.customerId}, ${from}, ${until},
          ${from}, ${until}, ${status}, 'cash', 15000, ${`metrics-${i}`})`;
    }
  });

  it("totals money in, money out and profit", async () => {
    const m = await getMetrics({ from: "2026-10-01", to: "2026-10-31" });
    expect(m.collectedCop).toBe(50000);
    expect(m.spentCop).toBe(920000);
    expect(m.profitCop).toBe(-870000);
  });

  it("counts customers served and no-shows", async () => {
    const m = await getMetrics({ from: "2026-10-01", to: "2026-10-31" });
    expect(m.customersServed).toBe(4);
    expect(m.noShows).toBe(1);
  });

  it("breaks income down by payment method", async () => {
    const m = await getMetrics({ from: "2026-10-01", to: "2026-10-31" });
    const byMethod = Object.fromEntries(m.byMethod.map((r) => [r.method, r.totalCop]));
    expect(byMethod).toEqual({ cash: 35000, nequi: 15000, wompi: 0 });
  });

  it("orders expenses by category, largest first", async () => {
    const m = await getMetrics({ from: "2026-10-01", to: "2026-10-31" });
    expect(m.expensesByCategory).toEqual([
      { category: "Arriendo", totalCop: 800000 },
      { category: "Productos", totalCop: 120000 },
    ]);
  });

  it("cuts days at Bogotá midnight", async () => {
    const m = await getMetrics({ from: "2026-10-01", to: "2026-10-31" });
    expect(m.byDay.find((r) => r.day === "2026-10-31")?.totalCop).toBe(10000);
    const november = await getMetrics({ from: "2026-11-01", to: "2026-11-30" });
    expect(november.collectedCop).toBe(0);
  });
});
