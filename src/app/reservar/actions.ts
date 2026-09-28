"use server";

import { redirect } from "next/navigation";
import { createBooking } from "@/server/booking/create";

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

  const result = await createBooking(
    {
      serviceId: servicio,
      barberId: barbero,
      startsAt: hora,
      name: field(formData, "nombre"),
      phone: field(formData, "celular"),
      consent: formData.get("autorizo") === "si",
      method,
    },
    new Date(),
  );

  if (result.ok) redirect(`/cita/${result.token}`);
  const params = new URLSearchParams({ servicio, barbero, dia, hora, error: result.error });
  redirect(`/reservar?${params.toString()}`);
}
