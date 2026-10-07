import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/site/account/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { guardarClave } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nueva contraseña" };

const ERRORS: Record<string, string> = {
  distintas: "Las dos contraseñas no coinciden.",
  invalid_input: "La contraseña debe tener al menos 10 caracteres.",
  invalid_token: "El enlace venció o ya se usó. Pide uno nuevo.",
};

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export default async function RestablecerPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  const shop = await getShopInfo();
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const message = error ? (ERRORS[error] ?? ERRORS.invalid_input) : null;

  return (
    <AuthShell
      shop={shop}
      whatsappHref={whatsappHref}
      eyebrow="Tu cuenta"
      title="Nueva contraseña"
      intro={<p>Elige una contraseña de al menos 10 caracteres. El enlace dura una hora.</p>}
    >
      {!token ? (
        <p role="alert" className="text-destructive">
          Este enlace no es válido.{" "}
          <Link href="/recuperar" className="underline underline-offset-4">
            Pide uno nuevo
          </Link>
          .
        </p>
      ) : (
        <form action={guardarClave} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <Field
            label="Contraseña nueva"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          <Field
            label="Repite la contraseña"
            name="confirmar"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
          {message ? (
            <p role="alert" className="text-destructive">
              {message}{" "}
              {error === "invalid_token" ? (
                <Link href="/recuperar" className="underline underline-offset-4">
                  Pedir enlace
                </Link>
              ) : null}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            Guardar contraseña
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
