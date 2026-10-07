"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { claimBookings, findAccountBooking } from "@/server/accounts/bookings";
import { cancelBooking, findByToken, rescheduleBooking } from "@/server/booking/manage";
import { requireCustomer } from "@/server/session";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The booking a form refers to: by its private link, or by id for the signed-in customer who
 * owns it. Anything else goes back to the booking start.
 */
async function target(formData: FormData): Promise<{ bookingId: string; href: string }> {
  const cita = field(formData, "cita");
  if (cita) {
    const user = await requireCustomer(`/mis-citas/${encodeURIComponent(cita)}`);
    const view = await findAccountBooking(user.id, cita);
    if (!view) redirect("/mis-citas");
    return { bookingId: view.booking.id, href: `/mis-citas/${view.booking.id}` };
  }
  const token = tokenSchema.safeParse(field(formData, "token"));
  if (!token.success) redirect("/reservar");
  const view = await findByToken(token.data);
  if (!view) redirect("/reservar");
  return { bookingId: view.booking.id, href: `/cita/${token.data}` };
}

export async function cancelar(formData: FormData): Promise<void> {
  const { bookingId, href } = await target(formData);
  const result = await cancelBooking({
    bookingId,
    actor: "customer",
    now: new Date(),
    enforceCutoff: true,
  });
  if (!result.ok) redirect(`${href}?error=${result.error}`);
  revalidatePath(href);
  redirect(href);
}

export async function reprogramar(formData: FormData): Promise<void> {
  const { bookingId, href } = await target(formData);
  const hora = z.iso.datetime({ offset: true }).safeParse(field(formData, "hora"));
  if (!hora.success) redirect(`${href}?error=slot_taken`);
  const result = await rescheduleBooking({
    bookingId,
    newStartsAt: new Date(hora.data),
    actor: "customer",
    now: new Date(),
    enforceCutoff: true,
  });
  if (!result.ok || !result.token || !result.bookingId) {
    redirect(`${href}?error=${result.ok ? "slot_taken" : result.error}`);
  }
  redirect(
    href.startsWith("/mis-citas") ? `/mis-citas/${result.bookingId}` : `/cita/${result.token}`,
  );
}

/** "Guardar en mi cuenta" on a booking opened by its private link. */
export async function guardarEnMiCuenta(formData: FormData): Promise<void> {
  const token = tokenSchema.safeParse(field(formData, "token"));
  if (!token.success) redirect("/mis-citas");
  const user = await requireCustomer(`/cita/${token.data}`);
  await claimBookings(user.id, [token.data], new Date());
  redirect("/mis-citas");
}
