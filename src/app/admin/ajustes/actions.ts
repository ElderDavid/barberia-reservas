"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseCop } from "@/lib/money";
import {
  addTimeOff,
  removeTimeOff,
  type SettingsResult,
  setWorkingHours,
  updateLegalInfo,
  updateLoyaltySettings,
  updateShopSettings,
  upsertBarber,
  upsertService,
} from "@/server/admin/settings";
import { requireOwner } from "@/server/session";

function fields(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value.trim();
  }
  return out;
}

function int(value: string | undefined): number {
  return value && /^-?\d+$/.test(value) ? Number(value) : Number.NaN;
}

function done(result: SettingsResult): never {
  if (!result.ok) redirect(`/admin/ajustes?error=${result.error}`);
  revalidatePath("/admin/ajustes");
  redirect("/admin/ajustes?ok=1");
}

export async function guardarBarberia(formData: FormData): Promise<void> {
  await requireOwner();
  const f = fields(formData);
  done(
    await updateShopSettings({
      name: f.nombre ?? "",
      whatsappPhone: f.whatsapp ?? "",
      address: f.direccion ?? "",
      depositPercent: int(f.anticipo),
      selfServiceCutoffHours: int(f.plazo),
      holdMinutes: int(f.minutosPago),
    }),
  );
}

export async function guardarServicio(formData: FormData): Promise<void> {
  await requireOwner();
  const f = fields(formData);
  done(
    await upsertService({
      id: f.id || undefined,
      name: f.nombre ?? "",
      durationMinutes: int(f.duracion),
      priceCop: parseCop(f.precio ?? "") ?? 0,
      bufferAfterMinutes: int(f.bufer || "0"),
      active: f.activo === "si",
      sortOrder: int(f.orden || "0"),
    }),
  );
}

export async function guardarBarbero(formData: FormData): Promise<void> {
  await requireOwner();
  const f = fields(formData);
  done(
    await upsertBarber({
      id: f.id || undefined,
      name: f.nombre ?? "",
      active: f.activo === "si",
      sortOrder: int(f.orden || "0"),
    }),
  );
}

export async function guardarHorario(formData: FormData): Promise<void> {
  await requireOwner();
  const f = fields(formData);
  const barberId = z.uuid().safeParse(f.barberId);
  if (!barberId.success) done({ ok: false, error: "invalid_input" });
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const closed = f[`cerrado_${weekday}`] === "si";
    const start = f[`inicio_${weekday}`] ?? "";
    const end = f[`fin_${weekday}`] ?? "";
    const result = await setWorkingHours({
      barberId: barberId.data,
      weekday,
      ranges: closed || !start || !end ? [] : [{ start, end }],
    });
    if (!result.ok) done(result);
  }
  done({ ok: true });
}

export async function agregarDiaLibre(formData: FormData): Promise<void> {
  await requireOwner();
  const f = fields(formData);
  done(
    await addTimeOff({
      barberId: f.barbero ? f.barbero : null,
      from: f.desde ?? "",
      to: f.hasta || f.desde || "",
      reason: f.motivo ?? "",
    }),
  );
}

export async function quitarDiaLibre(formData: FormData): Promise<void> {
  await requireOwner();
  const id = z.uuid().safeParse(fields(formData).id);
  done(id.success ? await removeTimeOff(id.data) : { ok: false, error: "invalid_input" });
}

export async function guardarDatosLegales(formData: FormData): Promise<void> {
  await requireOwner();
  const f = fields(formData);
  done(
    await updateLegalInfo({
      legalName: f.responsable ?? "",
      legalIdType: f.tipoDocumento ?? "",
      legalIdNumber: (f.numeroDocumento ?? "").replace(/[.\s]/g, ""),
      privacyEmail: f.correoDatos ?? "",
    }),
  );
}

export async function guardarFidelidad(formData: FormData): Promise<void> {
  await requireOwner();
  const f = fields(formData);
  done(await updateLoyaltySettings({ goal: int(f.sellos), reward: f.premio ?? "" }));
}
