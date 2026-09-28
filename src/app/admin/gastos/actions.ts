"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseCop } from "@/lib/money";
import {
  createCategory,
  deleteExpense,
  type ExpenseMethod,
  recordExpense,
  setCategoryActive,
} from "@/server/admin/expenses";
import { requireOwner } from "@/server/session";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function page(mes: string | undefined, extra = ""): string {
  const month = monthSchema.safeParse(mes);
  const query = [month.success ? `mes=${month.data}` : "", extra].filter(Boolean).join("&");
  return `/admin/gastos${query ? `?${query}` : ""}`;
}

export async function registrarGasto(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const result = await recordExpense({
    categoryId: raw.categoria ?? "",
    amountCop: parseCop(raw.monto ?? "") ?? 0,
    spentOn: raw.fecha ?? "",
    description: raw.descripcion ?? "",
    // recordExpense validates the method with zod; an unknown value becomes invalid_input.
    method: (raw.metodo ?? "cash") as ExpenseMethod,
  });
  if (!result.ok) redirect(page(raw.mes, `error=${result.error}`));
  revalidatePath("/admin/gastos");
  redirect(page(raw.mes));
}

export async function borrarGasto(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const id = z.uuid().safeParse(raw.id);
  if (id.success) await deleteExpense(id.data);
  revalidatePath("/admin/gastos");
  redirect(page(raw.mes));
}

export async function crearCategoria(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const result = await createCategory(raw.nombre ?? "");
  if (!result.ok) redirect(page(raw.mes, `error=${result.error}`));
  revalidatePath("/admin/gastos");
  redirect(page(raw.mes));
}

export async function cambiarEstadoCategoria(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const id = z.uuid().safeParse(raw.id);
  if (id.success) await setCategoryActive(id.data, raw.activa === "si");
  revalidatePath("/admin/gastos");
  redirect(page(raw.mes));
}
