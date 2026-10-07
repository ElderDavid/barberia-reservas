import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal/legal-page";
import { termsSections } from "@/components/site/legal/terms-sections";
import { getLegalInfo } from "@/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default async function TermsPage() {
  const info = await getLegalInfo();
  return (
    <LegalPage
      eyebrow="Ley 1480 de 2011 · Ley 527 de 1999"
      title="Términos y condiciones"
      intro={
        <p>
          Las reglas para reservar, pagar, usar tu cuenta y la tarjeta de fidelidad de{" "}
          {info.shopName}, escritas en palabras sencillas.
        </p>
      }
      sections={termsSections(info)}
      shop={{ name: info.shopName, address: info.address, whatsappPhone: info.whatsappPhone }}
    />
  );
}
