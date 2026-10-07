import type { Metadata } from "next";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { PageBanner } from "@/components/site/page-banner";
import { SavedBookingsList } from "@/components/site/saved-bookings-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PHOTOS } from "@/lib/photos";
import { getAccountInitial } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mis citas" };

export default async function MisCitasPage() {
  const shop = await getShopInfo();
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const accountInitial = await getAccountInitial();
  return (
    <>
      <SiteHeader
        shopName={shop.name}
        whatsappHref={whatsappHref}
        accountInitial={accountInitial}
      />
      <main id="contenido">
        <PageBanner
          eyebrow="Tus reservas"
          title="Mis citas"
          subtitle="Las citas que reservaste desde este celular. Toca una para verla, cambiarla o cancelarla."
          photo={PHOTOS.razor}
        />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <SavedBookingsList />
        </div>
      </main>
      <SiteFooter
        shopName={shop.name}
        address={shop.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar current="mis-citas" />
    </>
  );
}
