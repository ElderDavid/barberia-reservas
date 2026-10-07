import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/site/account/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { mailEnv } from "@/lib/env";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { pedirEnlace } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Recuperar contraseña" };

type Props = { searchParams: Promise<{ enviado?: string; error?: string }> };

export default async function RecuperarPage({ searchParams }: Props) {
  const { enviado, error } = await searchParams;
  const shop = await getShopInfo();
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const mailOn = mailEnv() !== null;

  return (
    <AuthShell
      shop={shop}
      whatsappHref={whatsappHref}
      title="Recuperar contraseña"
      intro={<p>Escribe el correo con el que te registraste y te enviamos un enlace.</p>}
    >
      {!mailOn ? (
        <p>
          Por ahora la barbería cambia contraseñas a mano.{" "}
          {whatsappHref ? (
            <a href={whatsappHref} className="font-medium underline underline-offset-4">
              Escríbenos por WhatsApp
            </a>
          ) : (
            "Pídelo en la barbería"
          )}{" "}
          y te ayudamos.
        </p>
      ) : enviado ? (
        <p role="status" className="text-success">
          Si el correo está registrado, te enviamos un enlace. Revisa también la carpeta de spam.
        </p>
      ) : (
        <form action={pedirEnlace} className="space-y-5">
          <Field
            label="Correo"
            name="email"
            type="email"
            autoComplete="email"
            required
            error={error ? "Escribe un correo válido." : undefined}
          />
          <Button type="submit" className="w-full">
            Enviar enlace
          </Button>
        </form>
      )}
      <p className="text-sm">
        <Link href="/entrar" className="underline underline-offset-4">
          Volver a entrar
        </Link>
      </p>
    </AuthShell>
  );
}
