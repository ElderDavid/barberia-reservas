import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/site/account/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { getSessionUser } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { crearCuenta } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Crear cuenta" };

const ERRORS: Record<string, string> = {
  invalid_input:
    "Revisa los datos: nombre de al menos 2 letras, celular colombiano, contraseña de 10 caracteres o más y la autorización marcada.",
  email_taken: "Ese correo ya tiene cuenta. Entra con él o recupera la contraseña.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function RegistroPage({ searchParams }: Props) {
  if (await getSessionUser()) redirect("/cuenta");
  const { error } = await searchParams;
  const shop = await getShopInfo();
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const message = error ? (ERRORS[error] ?? ERRORS.invalid_input) : null;
  const link = "font-medium underline underline-offset-4";

  return (
    <AuthShell
      shop={shop}
      whatsappHref={whatsappHref}
      title="Crear cuenta"
      intro={<p>Guarda tus citas, mira cuántas veces has venido y acumula sellos.</p>}
    >
      <form action={crearCuenta} className="space-y-5">
        <Field label="Nombre" name="nombre" autoComplete="name" minLength={2} required />
        <Field label="Correo" name="email" type="email" autoComplete="email" required />
        <Field
          label="Celular"
          name="celular"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          hint="Para avisarte de tus citas por WhatsApp."
          required
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          hint="Al menos 10 caracteres."
          required
        />
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            name="autorizo"
            value="si"
            required
            className="mt-1 size-5 shrink-0 accent-primary"
          />
          <span className="text-sm">
            Autorizo el tratamiento de mis datos según la{" "}
            <Link href="/privacidad" className={link}>
              Política de tratamiento de datos
            </Link>{" "}
            y acepto los{" "}
            <Link href="/terminos" className={link}>
              Términos y condiciones
            </Link>
            . Tengo 14 años o más.
          </span>
        </label>
        {message ? (
          <p role="alert" className="text-destructive">
            {message}
          </p>
        ) : null}
        <Button type="submit" className="w-full">
          Crear cuenta
        </Button>
      </form>
      <p className="text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className={link}>
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
