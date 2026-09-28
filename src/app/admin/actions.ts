"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { wallTimeToInstant } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
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
