import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BOOKING_TITLES, manageProps } from "@/app/cita/manage-props";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { BookingManage } from "@/components/site/booking/booking-manage";
import { PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Icon } from "@/components/ui/icon";
import { PHOTOS } from "@/lib/photos";
import { findAccountBooking } from "@/server/accounts/bookings";
import { requireCustomer } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tu cita" };

export default async function CitaDeLaCuentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dia?: string; error?: string }>;
}) {
  const { id } = await params;
  const user = await requireCustomer(`/mis-citas/${encodeURIComponent(id)}`);
  const view = await findAccountBooking(user.id, id);
  if (!view) notFound();
  const { dia, error } = await searchParams;
  const info = await getShopInfo();
  const whatsappHref = info.whatsappPhone ? whatsappUrl(info.whatsappPhone) : undefined;
  const props = await manageProps(view, {
    baseHref: `/mis-citas/${view.booking.id}`,
    idField: { name: "cita", value: view.booking.id },
    dia,
    error,
    now: new Date(),
    viaLink: false,
  });

  return (
    <>
      <SiteHeader
        shopName={info.name}
        whatsappHref={whatsappHref}
        accountInitial={user.name.trim().charAt(0).toLocaleUpperCase("es-CO")}
      />
      <main id="contenido">
        <PageBanner
          eyebrow="Tu cita"
          title={BOOKING_TITLES[view.booking.status] ?? "Tu cita"}
          photo={PHOTOS.detail}
        />
        <div className="mx-auto max-w-3xl px-4 pt-8">
          <Link
            href="/mis-citas"
            className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon name="back" className="size-4" />
            Mis citas
          </Link>
        </div>
        <BookingManage {...props} />
      </main>
      <SiteFooter
        shopName={info.name}
        address={info.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar current="mis-citas" />
    </>
  );
}
