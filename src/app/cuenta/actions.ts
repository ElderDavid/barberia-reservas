"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { deleteAccount } from "@/server/accounts/delete";
import { changePassword, updateProfile } from "@/server/accounts/profile";
import { auth } from "@/server/auth";
import { requireCustomer } from "@/server/session";

export async function guardarPerfil(formData: FormData): Promise<void> {
  const user = await requireCustomer();
  const result = await updateProfile(
    user.id,
    { name: String(formData.get("nombre") ?? ""), phone: String(formData.get("celular") ?? "") },
    new Date(),
  );
  if (!result.ok) redirect("/cuenta?error=perfil");
  revalidatePath("/cuenta");
  redirect("/cuenta?ok=perfil");
}

export async function cambiarClave(formData: FormData): Promise<void> {
  await requireCustomer();
  const result = await changePassword(await headers(), {
    current: String(formData.get("actual") ?? ""),
    next: String(formData.get("nueva") ?? ""),
  });
  if (!result.ok) redirect(`/cuenta?error=${result.error}`);
  redirect("/cuenta?ok=clave");
}

export async function salir(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/entrar?cerrada=1");
}

export async function borrarCuenta(formData: FormData): Promise<void> {
  const user = await requireCustomer("/cuenta/borrar");
  if (String(formData.get("confirmacion") ?? "").trim() !== "BORRAR") {
    redirect("/cuenta/borrar?error=confirmacion");
  }
  const requestHeaders = await headers();
  await auth.api.signOut({ headers: requestHeaders });
  const result = await deleteAccount(user.id, new Date());
  if (!result.ok) redirect(`/cuenta/borrar?error=${result.error}`);
  redirect("/?cuenta=borrada");
}
