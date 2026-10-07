import type { Metadata } from "next";
import { LegalPage } from "@/components/site/legal/legal-page";
import { privacySections } from "@/components/site/legal/privacy-sections";
import { getLegalInfo } from "@/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Política de tratamiento de datos" };

export default async function PrivacyPage() {
  const info = await getLegalInfo();
  return (
    <LegalPage
      eyebrow="Ley 1581 de 2012 · Habeas data"
      title="Política de tratamiento de datos"
      intro={
        <p>
          Cómo {info.shopName} recoge, usa y protege tus datos personales, y cómo ejerces tus
          derechos sobre ellos.
        </p>
      }
      sections={privacySections(info)}
      shop={{ name: info.shopName, address: info.address, whatsappPhone: info.whatsappPhone }}
    />
  );
}
