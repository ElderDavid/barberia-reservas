"use server";

import { redirect } from "next/navigation";
import { createBooking } from "@/server/booking/create";
import { getSessionUser } from "@/server/session";

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function reservar(formData: FormData): Promise<void> {
  const servicio = field(formData, "servicio");
  const barbero = field(formData, "barbero");
  const dia = field(formData, "dia");
  const hora = field(formData, "hora");
  const method = field(formData, "metodo") === "transfer" ? "transfer" : "cash";
  // Only a customer's account collects bookings; the owner booking for someone stays a guest.
  const user = await getSessionUser();

  const result = await createBooking(
    {
      serviceId: servicio,
      barberId: barbero,
      startsAt: hora,
      name: field(formData, "nombre"),
      phone: field(formData, "celular"),
      consent: formData.get("autorizo") === "si",
      method,
      userId: user?.role === "customer" ? user.id : null,
    },
    new Date(),
  );

  if (result.ok) redirect(`/cita/${result.token}`);
  const params = new URLSearchParams({ servicio, barbero, dia, hora, error: result.error });
  redirect(`/reservar?${params.toString()}`);
}
