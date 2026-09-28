"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { cancelBooking, findByToken, rescheduleBooking } from "@/server/booking/manage";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function cancelar(formData: FormData): Promise<void> {
  const token = tokenSchema.safeParse(field(formData, "token"));
  if (!token.success) redirect("/reservar");
  const view = await findByToken(token.data);
  if (!view) redirect("/reservar");
  const result = await cancelBooking({
    bookingId: view.booking.id,
    actor: "customer",
    now: new Date(),
    enforceCutoff: true,
  });
  if (!result.ok) redirect(`/cita/${token.data}?error=${result.error}`);
  revalidatePath(`/cita/${token.data}`);
  redirect(`/cita/${token.data}`);
}

export async function reprogramar(formData: FormData): Promise<void> {
  const token = tokenSchema.safeParse(field(formData, "token"));
  if (!token.success) redirect("/reservar");
  const hora = z.iso.datetime({ offset: true }).safeParse(field(formData, "hora"));
  if (!hora.success) redirect(`/cita/${token.data}?error=slot_taken`);
  const view = await findByToken(token.data);
  if (!view) redirect("/reservar");
  const result = await rescheduleBooking({
    bookingId: view.booking.id,
    newStartsAt: new Date(hora.data),
    actor: "customer",
    now: new Date(),
    enforceCutoff: true,
  });
  if (!result.ok || !result.token) {
    redirect(`/cita/${token.data}?error=${result.ok ? "slot_taken" : result.error}`);
  }
  redirect(`/cita/${result.token}`);
}
