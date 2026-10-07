import { AppTabBar } from "@/components/site/app-tab-bar";
import { Barbers } from "@/components/site/barbers";
import { Gallery } from "@/components/site/gallery";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { ServicesMenu } from "@/components/site/services-menu";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Steps } from "@/components/site/steps";
import { Visit } from "@/components/site/visit";
import { getPublicShop, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const shop = await getPublicShop();
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const address = shop.address || undefined;
  const marquee = shop.services.length
    ? shop.services.map((service) => service.name)
    : ["Corte", "Barba", "Afeitado con navaja"];
  return (
    <>
      <SiteHeader shopName={shop.name} whatsappHref={whatsappHref} />
      <main id="contenido">
        <Hero shopName={shop.name} address={address} whatsappHref={whatsappHref} />
        <Marquee items={[...new Set(marquee)]} />
        <Steps />
        <ServicesMenu services={shop.services} />
        <Barbers barbers={shop.barbers} />
        <Gallery />
        <Visit address={address} whatsappHref={whatsappHref} />
      </main>
      <SiteFooter shopName={shop.name} address={address} whatsappHref={whatsappHref} />
      <AppTabBar current="inicio" />
    </>
  );
}
