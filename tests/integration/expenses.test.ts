import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createCategory,
  listCategories,
  listExpenses,
  recordExpense,
  setCategoryActive,
} from "../../src/server/admin/expenses.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { seedShop } from "../setup/fixtures.ts";

let rentId: string;

async function expenseCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from expenses`;
  return row.n;
}

describe("expenses", () => {
  beforeEach(async () => {
    await truncateAll();
    await seedShop();
    const [rent] = await sql<{ id: string }[]>`
      insert into expense_categories (name) values ('Arriendo') returning id
    `;
    rentId = rent.id;
  });

  it("records an expense", async () => {
    expect(
      await recordExpense({
        categoryId: rentId,
        amountCop: 800000,
        spentOn: "2026-10-01",
        description: "Octubre",
        method: "transfer",
      }),
    ).toEqual({ ok: true });
    const rows = await sql<{ category_id: string; amount_cop: number; spent_on: string }[]>`
      select category_id, amount_cop, spent_on::text from expenses
    `;
    expect(rows).toEqual([{ category_id: rentId, amount_cop: 800000, spent_on: "2026-10-01" }]);
  });

  it("rejects bad amounts and inactive categories", async () => {
    for (const amountCop of [0, -5000, 1500.5]) {
      expect(
        await recordExpense({
          categoryId: rentId,
          amountCop,
          spentOn: "2026-10-01",
          description: "",
          method: "cash",
        }),
      ).toEqual({ ok: false, error: "invalid_input" });
    }
    await setCategoryActive(rentId, false);
    expect(
      await recordExpense({
        categoryId: rentId,
        amountCop: 1000,
        spentOn: "2026-10-01",
        description: "",
        method: "cash",
      }),
    ).toEqual({ ok: false, error: "invalid_input" });
    expect(await expenseCount()).toBe(0);
  });

  it("lists an inclusive date range, newest first", async () => {
    for (const day of ["2026-09-30", "2026-10-01", "2026-10-15", "2026-10-31", "2026-11-01"]) {
      await recordExpense({
        categoryId: rentId,
        amountCop: 1000,
        spentOn: day,
        description: day,
        method: "cash",
      });
    }
    const lines = await listExpenses({ from: "2026-10-01", to: "2026-10-31" });
    expect(lines.map((l) => l.spentOn)).toEqual(["2026-10-31", "2026-10-15", "2026-10-01"]);
    expect(lines[0].categoryName).toBe("Arriendo");
  });

  it("keeps expenses of a deactivated category", async () => {
    await recordExpense({
      categoryId: rentId,
      amountCop: 800000,
      spentOn: "2026-10-01",
      description: "",
      method: "cash",
    });
    await setCategoryActive(rentId, false);
    expect(await expenseCount()).toBe(1);
    const active = await listCategories({ activeOnly: true });
    expect(active.map((c) => c.id)).not.toContain(rentId);
  });

  it("refuses a duplicate category name, ignoring case", async () => {
    expect(await createCategory("arriendo")).toEqual({ ok: false, error: "duplicate" });
    expect(await createCategory("Publicidad")).toEqual({ ok: true });
  });

  it("guards every expenses action with requireOwner()", () => {
    const source = readFileSync("src/app/admin/gastos/actions.ts", "utf8");
    const bodies = [...source.matchAll(/export async function \w+\([^)]*\)[^{]*\{\s*([^;]*;)/g)];
    expect(bodies).toHaveLength(4);
    for (const [, first] of bodies) expect(first.trim()).toBe("await requireOwner();");
  });
});
