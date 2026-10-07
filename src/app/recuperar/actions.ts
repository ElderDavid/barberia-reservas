"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requestPasswordReset } from "@/server/accounts/password-reset";

export async function pedirEnlace(formData: FormData): Promise<void> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) redirect("/recuperar?error=correo");
  const result = await requestPasswordReset(email.data, new Date());
  redirect(result.ok ? "/recuperar?enviado=1" : "/recuperar");
}
