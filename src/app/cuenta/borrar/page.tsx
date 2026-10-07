import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/site/account/auth-shell";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { getSessionUser } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { borrarCuenta } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Borrar mi cuenta" };

const ERRORS: Record<string, string> = {
  confirmacion: "Escribe BORRAR, en mayúsculas, para confirmar.",
  owner_cannot_delete: "La cuenta del dueño no se puede borrar desde aquí.",
  not_found: "No encontramos tu cuenta.",
};

type Props = { searchParams: Promise<{ error?: string }> };

export default async function BorrarCuentaPage({ searchParams }: Props) {
  const [{ error }, user, shop] = await Promise.all([
    searchParams,
    getSessionUser(),
    getShopInfo(),
  ]);
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const message = error ? (ERRORS[error] ?? ERRORS.not_found) : null;
  const link = "font-medium underline underline-offset-4";

  return (
    <AuthShell
      shop={shop}
      whatsappHref={whatsappHref}
      title="Borrar mi cuenta"
      intro={
        <p>
          Se borran tu acceso, tus datos de perfil y tus autorizaciones. Las citas que ya tomaste
          quedan en los registros contables de la barbería, como pide la ley.
        </p>
      }
    >
      {user?.role === "customer" ? (
        <form action={borrarCuenta} className="space-y-5">
          <Field
            label="Escribe BORRAR para confirmar"
            name="confirmacion"
            autoComplete="off"
            autoCapitalize="characters"
            required
            error={message ?? undefined}
          />
          <Button type="submit" variant="danger" className="w-full">
            Borrar mi cuenta
          </Button>
          <p className="text-sm">
            <Link href="/cuenta" className={link}>
              Volver a mi cuenta
            </Link>
          </p>
        </form>
      ) : (
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <Link href="/entrar?volver=%2Fcuenta%2Fborrar" className={link}>
              Entra con tu correo y contraseña
            </Link>
            .
          </li>
          <li>Abre Cuenta y toca “Borrar mi cuenta”.</li>
          <li>Escribe BORRAR y confirma. El borrado es inmediato.</li>
          {whatsappHref ? (
            <li>
              Si no puedes entrar,{" "}
              <a href={whatsappHref} className={link}>
                escríbenos por WhatsApp
              </a>{" "}
              y la borramos por ti.
            </li>
          ) : null}
        </ol>
      )}
    </AuthShell>
  );
}
