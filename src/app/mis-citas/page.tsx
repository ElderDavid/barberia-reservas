import type { Metadata } from "next";
import Link from "next/link";
import { AccountBookings, type BookingTab } from "@/components/site/account/account-bookings";
import { ClaimSavedBookings } from "@/components/site/account/claim-saved-bookings";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { PageBanner } from "@/components/site/page-banner";
import { SavedBookingsList } from "@/components/site/saved-bookings-list";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { PHOTOS } from "@/lib/photos";
import { listAccountBookings } from "@/server/accounts/bookings";
import { getBookingOptions } from "@/server/booking/create";
import { getSessionUser } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { guardarCitasDelCelular } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mis citas" };

const TABS: BookingTab[] = ["proximas", "pasadas", "canceladas"];

type Props = { searchParams: Promise<{ pestana?: string }> };

export default async function MisCitasPage({ searchParams }: Props) {
  const [{ pestana }, shop, user] = await Promise.all([
    searchParams,
    getShopInfo(),
    getSessionUser(),
  ]);
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const customer = user?.role === "customer" ? user : null;
  const tab = TABS.find((t) => t === pestana) ?? "proximas";
  const [account, options] = customer
    ? await Promise.all([listAccountBookings(customer.id, new Date()), getBookingOptions()])
    : [null, null];
  const link =
    "inline-flex min-h-11 items-center justify-center rounded-control px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

  return (
    <>
      <SiteHeader
        shopName={shop.name}
        whatsappHref={whatsappHref}
        accountInitial={user?.name.trim().charAt(0).toLocaleUpperCase("es-CO")}
      />
      <main id="contenido">
        <PageBanner
          eyebrow="Tus reservas"
          title="Mis citas"
          subtitle={
            customer
              ? "Todas las citas de tu cuenta. Toca una para verla, cambiarla o cancelarla."
              : "Las citas que reservaste desde este celular. Toca una para verla, cambiarla o cancelarla."
          }
          photo={PHOTOS.razor}
        />
        <div className="mx-auto max-w-3xl px-4 py-12">
          {account && options ? (
            <>
              <AccountBookings
                tab={tab}
                lists={{
                  proximas: account.upcoming,
                  pasadas: account.past,
                  canceladas: account.cancelled,
                }}
                visits={account.visits}
                timeZone={options.timeZone}
              />
              <ClaimSavedBookings claim={guardarCitasDelCelular} />
            </>
          ) : (
            <div className="space-y-8">
              <SavedBookingsList />
              <section className="rounded-card bg-cocoa p-6 text-on-cocoa">
                <h2 className="font-display text-2xl">Tus citas, en cualquier celular</h2>
                <p className="mt-2">
                  Con una cuenta ves todas tus citas, cuántas veces has venido y tus sellos.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/registro" className={`${link} bg-surface text-fg`}>
                    Crear cuenta
                  </Link>
                  <Link
                    href="/entrar?volver=%2Fmis-citas"
                    className={`${link} border border-on-cocoa`}
                  >
                    Entrar
                  </Link>
                </div>
              </section>
            </div>
          )}
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
