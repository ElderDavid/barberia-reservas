"use server";

import { redirect } from "next/navigation";
import { signUpCustomer } from "@/server/accounts/sign-up";

export async function crearCuenta(formData: FormData): Promise<void> {
  const text = (key: string) => String(formData.get(key) ?? "");
  const result = await signUpCustomer(
    {
      name: text("nombre"),
      email: text("email"),
      phone: text("celular"),
      password: text("password"),
      consent: formData.get("autorizo") === "si",
    },
    new Date(),
  );
  if (!result.ok) redirect(`/registro?error=${result.error}`);
  redirect("/cuenta?bienvenida=1");
}
