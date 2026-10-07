import { WelcomeBand } from "@/components/site/account/welcome-band";
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
import { getAccountHome } from "@/server/accounts/home";
import { getBookingOptions } from "@/server/booking/create";
import { getSessionUser } from "@/server/session";
import { getPublicShop, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [shop, user] = await Promise.all([getPublicShop(), getSessionUser()]);
  const [home, options] =
    user?.role === "customer"
      ? await Promise.all([getAccountHome(user.id, new Date()), getBookingOptions()])
      : [null, null];
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const accountInitial = user ? (user.name.trim()[0] ?? "?").toLocaleUpperCase("es-CO") : undefined;
  const address = shop.address || undefined;
  const marquee = shop.services.length
    ? shop.services.map((service) => service.name)
    : ["Corte", "Barba", "Afeitado con navaja"];
  return (
    <>
      <SiteHeader
        shopName={shop.name}
        whatsappHref={whatsappHref}
        accountInitial={accountInitial}
      />
      <main id="contenido">
        {home && options ? (
          <WelcomeBand
            firstName={home.firstName}
            next={home.next}
            loyalty={home.loyalty}
            timeZone={options.timeZone}
          />
        ) : null}
        <Hero
          shopName={shop.name}
          address={address}
          whatsappHref={whatsappHref}
          titleAs={home ? "h2" : "h1"}
        />
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
