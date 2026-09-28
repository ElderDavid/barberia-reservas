"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseCop } from "@/lib/money";
import { wallTimeToInstant } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { completeBooking, markNoShow, markRefunded, recordWalkIn } from "@/server/admin/sales";
import { ownerCancel, ownerReschedule } from "@/server/booking/manage";
import { requireOwner } from "@/server/session";

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const rescheduleSchema = z.object({
  dia: daySchema,
  bookingId: z.uuid(),
  fechaHora: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  barberId: z.uuid(),
});

const cancelSchema = z.object({
  dia: daySchema,
  bookingId: z.uuid(),
  anticipo: z.enum(["refund", "forfeit"]).default("refund"),
});

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value !== "") out[key] = value;
  }
  return out;
}

function back(dia: string | undefined, error: string): never {
  const day = daySchema.safeParse(dia);
  redirect(`/admin?${day.success ? `dia=${day.data}&` : ""}error=${error}`);
}

export async function reprogramarComoDueno(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const parsed = rescheduleSchema.safeParse(raw);
  if (!parsed.success) back(raw.dia, "invalid_input");
  const [day, time] = parsed.data.fechaHora.split("T");
  const newStartsAt = wallTimeToInstant(day, time, await getShopTimeZone());
  if (!newStartsAt) back(parsed.data.dia, "invalid_input");
  const result = await ownerReschedule({
    bookingId: parsed.data.bookingId,
    newStartsAt,
    newBarberId: parsed.data.barberId,
    now: new Date(),
  });
  if (!result.ok) back(parsed.data.dia, result.error);
  revalidatePath("/admin");
  redirect(`/admin?dia=${parsed.data.dia}`);
}

export async function cancelarComoDueno(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const parsed = cancelSchema.safeParse(raw);
  if (!parsed.success) back(raw.dia, "invalid_input");
  const result = await ownerCancel({
    bookingId: parsed.data.bookingId,
    depositDecision: parsed.data.anticipo,
    now: new Date(),
  });
  if (!result.ok) back(parsed.data.dia, result.error);
  revalidatePath("/admin");
  redirect(`/admin?dia=${parsed.data.dia}`);
}

const counterMethod = z.enum(["cash", "nequi", "daviplata", "card", "transfer"]);

export async function cobrar(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const parsed = z
    .object({ dia: daySchema, bookingId: z.uuid(), metodo: counterMethod })
    .safeParse(raw);
  if (!parsed.success) back(raw.dia, "invalid_input");
  const result = await completeBooking({
    bookingId: parsed.data.bookingId,
    method: parsed.data.metodo,
    now: new Date(),
  });
  if (!result.ok) back(parsed.data.dia, result.error);
  revalidatePath("/admin");
  redirect(`/admin?dia=${parsed.data.dia}`);
}

export async function marcarNoVino(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const parsed = z.object({ dia: daySchema, bookingId: z.uuid() }).safeParse(raw);
  if (!parsed.success) back(raw.dia, "invalid_input");
  const result = await markNoShow({ bookingId: parsed.data.bookingId, now: new Date() });
  if (!result.ok) back(parsed.data.dia, result.error);
  revalidatePath("/admin");
  redirect(`/admin?dia=${parsed.data.dia}`);
}

export async function registrarVentaSinCita(formData: FormData): Promise<void> {
  await requireOwner();
  const raw = fields(formData);
  const parsed = z
    .object({
      monto: z.string(),
      metodo: counterMethod,
      servicio: z.uuid().optional(),
      barbero: z.uuid().optional(),
      nota: z.string().max(200).optional(),
    })
    .safeParse(raw);
  const amountCop = parsed.success ? parseCop(parsed.data.monto) : null;
  if (!parsed.success || amountCop === null) redirect("/admin/ventas?error=invalid_input");
  const result = await recordWalkIn({
    amountCop,
    method: parsed.data.metodo,
    serviceId: parsed.data.servicio,
    barberId: parsed.data.barbero,
    note: parsed.data.nota,
    occurredAt: new Date(),
  });
  if (!result.ok) redirect(`/admin/ventas?error=${result.error}`);
  revalidatePath("/admin/ventas");
  redirect("/admin/ventas?ok=1");
}

export async function marcarReembolsado(formData: FormData): Promise<void> {
  await requireOwner();
  const parsed = z.object({ bookingId: z.uuid() }).safeParse(fields(formData));
  if (!parsed.success) redirect("/admin/ventas?error=invalid_input");
  const result = await markRefunded({ bookingId: parsed.data.bookingId, now: new Date() });
  if (!result.ok) redirect(`/admin/ventas?error=${result.error}`);
  revalidatePath("/admin/ventas");
  redirect("/admin/ventas");
}
