import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.ts";
import { expenseCategories, expenses } from "../db/schema.ts";

export type ExpenseMethod = "cash" | "nequi" | "daviplata" | "card" | "transfer";

export type ExpenseResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "duplicate" | "not_found" };

const expenseSchema = z.object({
  categoryId: z.uuid(),
  amountCop: z.number().int().positive(),
  spentOn: z.iso.date(),
  description: z.string().trim().max(200),
  method: z.enum(["cash", "nequi", "daviplata", "card", "transfer"]),
});

export async function recordExpense(input: {
  categoryId: string;
  amountCop: number;
  spentOn: string;
  description: string;
  method: ExpenseMethod;
}): Promise<ExpenseResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const [category] = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(
      and(eq(expenseCategories.id, parsed.data.categoryId), eq(expenseCategories.active, true)),
    );
  if (!category) return { ok: false, error: "invalid_input" };
  await db.insert(expenses).values(parsed.data);
  return { ok: true };
}

export type ExpenseLine = {
  id: string;
  categoryName: string;
  amountCop: number;
  spentOn: string;
  description: string;
  method: string;
};

/** Expenses with `spent_on` in [from, to] (inclusive calendar days), newest first. */
export async function listExpenses(range: { from: string; to: string }): Promise<ExpenseLine[]> {
  return db
    .select({
      id: expenses.id,
      categoryName: expenseCategories.name,
      amountCop: expenses.amountCop,
      spentOn: expenses.spentOn,
      description: expenses.description,
      method: expenses.method,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(and(gte(expenses.spentOn, range.from), lte(expenses.spentOn, range.to)))
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt));
}

/** Expenses are the owner's own records, so unlike bookings they may be deleted. */
export async function deleteExpense(id: string): Promise<ExpenseResult> {
  const deleted = await db
    .delete(expenses)
    .where(eq(expenses.id, id))
    .returning({ id: expenses.id });
  return deleted.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

export async function listCategories(options: {
  activeOnly: boolean;
}): Promise<{ id: string; name: string; active: boolean }[]> {
  return db
    .select({
      id: expenseCategories.id,
      name: expenseCategories.name,
      active: expenseCategories.active,
    })
    .from(expenseCategories)
    .where(options.activeOnly ? eq(expenseCategories.active, true) : undefined)
    .orderBy(asc(expenseCategories.name));
}

export async function createCategory(name: string): Promise<ExpenseResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) return { ok: false, error: "invalid_input" };
  const [existing] = await db
    .select({ id: expenseCategories.id })
    .from(expenseCategories)
    .where(sql`lower(${expenseCategories.name}) = lower(${trimmed})`);
  if (existing) return { ok: false, error: "duplicate" };
  await db.insert(expenseCategories).values({ name: trimmed });
  return { ok: true };
}

export async function setCategoryActive(id: string, active: boolean): Promise<ExpenseResult> {
  const updated = await db
    .update(expenseCategories)
    .set({ active })
    .where(eq(expenseCategories.id, id))
    .returning({ id: expenseCategories.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}
