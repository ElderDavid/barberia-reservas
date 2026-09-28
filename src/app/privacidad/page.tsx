import type { Metadata } from "next";
import Link from "next/link";
import { getShopInfo, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Política de privacidad" };

export default async function PrivacyPage() {
  const shop = await getShopInfo();
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Política de tratamiento de datos</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Responsable</h2>
        <p>
          {shop.name}
          {shop.address ? `, ${shop.address}` : ""}.
          {shop.whatsappPhone ? ` WhatsApp: ${shop.whatsappPhone}.` : ""}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué datos recogemos</h2>
        <p>Tu nombre y tu número de celular cuando reservas una cita.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Para qué los usamos</h2>
        <p>Usamos tus datos para gestionar tus citas y comunicarnos contigo sobre ellas.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Tus derechos</h2>
        <p>
          De acuerdo con la Ley 1581 de 2012 puedes conocer, actualizar, rectificar y suprimir tus
          datos, y revocar la autorización. Para hacerlo, escríbenos por WhatsApp
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
        <h2 className="text-lg font-semibold">Cuánto tiempo los guardamos</h2>
        <p>
          Mientras tengas citas con nosotros y hasta 24 meses después de tu última cita. Después los
          suprimimos.
        </p>
      </section>

      <Link
        href="/"
        className="inline-flex min-h-11 items-center text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Volver al inicio
      </Link>
    </article>
  );
}
