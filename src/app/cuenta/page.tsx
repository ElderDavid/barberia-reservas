import type { Metadata } from "next";
import Link from "next/link";
import { AccountSection } from "@/components/site/account/account-section";
import { MemberCard } from "@/components/site/account/member-card";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { getProfile } from "@/server/accounts/profile";
import { requireCustomer } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { cambiarClave, guardarPerfil, salir } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mi cuenta" };

const NOTICES: Record<string, string> = {
  perfil: "Datos guardados.",
  clave: "Contraseña cambiada. Cerramos tu sesión en los otros dispositivos.",
};
const ERRORS: Record<string, string> = {
  perfil: "Revisa el nombre (2 letras o más) y el celular (10 dígitos, empieza por 3).",
  wrong_password: "La contraseña actual no es correcta.",
  invalid_input: "La contraseña nueva debe tener al menos 10 caracteres.",
};

const sinceFormat = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

type Props = { searchParams: Promise<{ ok?: string; error?: string; bienvenida?: string }> };

export default async function CuentaPage({ searchParams }: Props) {
  const user = await requireCustomer();
  const [{ ok, error, bienvenida }, profile, shop] = await Promise.all([
    searchParams,
    getProfile(user.id),
    getShopInfo(),
  ]);
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const name = profile?.name ?? user.name;
  const phone = (profile?.phone ?? "").replace(/^57/, "");
  const notice = bienvenida ? `Tu cuenta en ${shop.name} está lista.` : ok && NOTICES[ok];
  const alert = error ? (ERRORS[error] ?? ERRORS.perfil) : null;
  const link =
    "flex min-h-11 items-center justify-between border-b border-hairline last:border-b-0 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <>
      <SiteHeader
        shopName={shop.name}
        whatsappHref={whatsappHref}
        accountInitial={name.trim().charAt(0).toLocaleUpperCase("es-CO")}
      />
      <main id="contenido" className="bg-background px-4 py-10 md:py-16">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="rise font-display text-4xl md:text-5xl">Mi cuenta</h1>
          {notice ? (
            <p role="status" className="text-success">
              {notice}
            </p>
          ) : null}
          {alert ? (
            <p role="alert" className="text-destructive">
              {alert}
            </p>
          ) : null}
          <MemberCard
            name={name}
            email={user.email}
            since={sinceFormat.format(profile?.createdAt ?? new Date())}
          />
          <div className="grid gap-6 md:grid-cols-2">
            <AccountSection title="Tus datos">
              <form action={guardarPerfil} className="space-y-4">
                <Field
                  label="Nombre"
                  name="nombre"
                  defaultValue={name}
                  autoComplete="name"
                  required
                />
                <Field
                  label="Celular"
                  name="celular"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  defaultValue={phone}
                  required
                />
                <Button type="submit" variant="secondary" className="w-full">
                  Guardar datos
                </Button>
              </form>
            </AccountSection>
            <AccountSection title="Contraseña">
              <form action={cambiarClave} className="space-y-4">
                <Field
                  label="Contraseña actual"
                  name="actual"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <Field
                  label="Contraseña nueva"
                  name="nueva"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
                <Button type="submit" variant="secondary" className="w-full">
                  Cambiar contraseña
                </Button>
              </form>
            </AccountSection>
          </div>
          <AccountSection title="Tus datos personales">
            <ul>
              <li>
                <a href="/cuenta/datos" download className={link}>
                  Descargar mis datos
                </a>
              </li>
              <li>
                <Link href="/privacidad" className={link}>
                  Política de tratamiento de datos
                </Link>
              </li>
              <li>
                <Link href="/terminos" className={link}>
                  Términos y condiciones
                </Link>
              </li>
              <li>
                <Link href="/cuenta/borrar" className={`${link} text-destructive`}>
                  Borrar mi cuenta
                </Link>
              </li>
            </ul>
          </AccountSection>
          <form action={salir}>
            <Button type="submit" variant="secondary" className="w-full md:w-auto">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </main>
      <SiteFooter
        shopName={shop.name}
        address={shop.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar current="cuenta" />
    </>
  );
}
