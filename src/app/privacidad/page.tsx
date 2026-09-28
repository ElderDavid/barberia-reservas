import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PHOTOS } from "@/lib/photos";
import { getShopInfo, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Política de privacidad" };

export default async function PrivacyPage() {
  const shop = await getShopInfo();
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  return (
    <>
      <SiteHeader shopName={shop.name} whatsappHref={whatsappHref} />
      <main id="contenido">
        <PageBanner
          eyebrow="Ley 1581 de 2012"
          title="Política de tratamiento de datos"
          photo={PHOTOS.tools}
        />
        <article className="mx-auto max-w-3xl space-y-8 px-4 py-12">
          <section className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight">Responsable</h2>
            <p>
              {shop.name}
              {shop.address ? `, ${shop.address}` : ""}.
              {shop.whatsappPhone ? ` WhatsApp: ${shop.whatsappPhone}.` : ""}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight">Qué datos recogemos</h2>
            <p>Tu nombre y tu número de celular cuando reservas una cita.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight">Para qué los usamos</h2>
            <p>Usamos tus datos para gestionar tus citas y comunicarnos contigo sobre ellas.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight">Tus derechos</h2>
            <p>
              De acuerdo con la Ley 1581 de 2012 puedes conocer, actualizar, rectificar y suprimir
              tus datos, y revocar la autorización. Para hacerlo, escríbenos por WhatsApp
              {shop.whatsappPhone ? (
                <>
                  {" "}
                  al{" "}
                  <a
                    href={whatsappUrl(shop.whatsappPhone)}
                    className="text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {shop.whatsappPhone}
                  </a>
                </>
              ) : null}
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight">Cuánto tiempo los guardamos</h2>
            <p>
              Mientras tengas citas con nosotros y hasta 24 meses después de tu última cita. Después
              los suprimimos.
            </p>
          </section>

          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Volver al inicio
          </Link>
        </article>
      </main>
      <SiteFooter
        shopName={shop.name}
        address={shop.address || undefined}
        whatsappHref={whatsappHref}
      />
    </>
  );
}
