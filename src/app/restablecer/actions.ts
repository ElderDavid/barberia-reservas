"use server";

import { redirect } from "next/navigation";
import { resetPasswordWithToken } from "@/server/accounts/password-reset";

export async function guardarClave(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const back = `/restablecer?token=${encodeURIComponent(token)}`;
  if (password !== String(formData.get("confirmar") ?? "")) redirect(`${back}&error=distintas`);
  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) redirect(`${back}&error=${result.error}`);
  redirect("/entrar?restablecida=1");
}
