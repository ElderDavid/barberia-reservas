import { notFound } from "next/navigation";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { BookingManage } from "@/components/site/booking/booking-manage";
import { PageBanner } from "@/components/site/page-banner";
import { RememberBooking } from "@/components/site/remember-booking";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { PHOTOS } from "@/lib/photos";
import { formatDateTime } from "@/lib/time";
import { findByToken } from "@/server/booking/manage";
import { getSessionUser } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { BOOKING_TITLES, manageProps } from "../manage-props";
import { guardarEnMiCuenta } from "./actions";

export const dynamic = "force-dynamic";

export default async function CitaPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ dia?: string; error?: string }>;
}) {
  const { token } = await params;
  const { dia, error } = await searchParams;
  const view = await findByToken(token);
  if (!view) notFound();

  const { booking, service, barber, shop } = view;
  const [info, user] = await Promise.all([getShopInfo(), getSessionUser()]);
  const whatsappHref = info.whatsappPhone ? whatsappUrl(info.whatsappPhone) : undefined;
  const props = await manageProps(view, {
    baseHref: `/cita/${token}`,
    idField: { name: "token", value: token },
    dia,
    error,
    now: new Date(),
    viaLink: true,
  });
  const canSave = user?.role === "customer" && booking.userId === null;
  const title = BOOKING_TITLES[booking.status] ?? "Tu cita";

  return (
    <>
      <SiteHeader
        shopName={info.name}
        whatsappHref={whatsappHref}
        accountInitial={user ? user.name.trim().charAt(0).toLocaleUpperCase("es-CO") : undefined}
      />
      <main id="contenido">
        <PageBanner eyebrow="Tu cita" title={title} photo={PHOTOS.detail} />
        {canSave ? (
          <form action={guardarEnMiCuenta} className="mx-auto max-w-3xl px-4 pt-12">
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="secondary" className="w-full">
              Guardar en mi cuenta
            </Button>
          </form>
        ) : null}
        <BookingManage {...props} />
      </main>
      <SiteFooter
        shopName={info.name}
        address={info.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar current="mis-citas" />
      <RememberBooking
        path={`/cita/${token}`}
        title={`${service.name} con ${barber.name} · ${title}`}
        when={formatDateTime(booking.startsAt, shop.timezone)}
      />
    </>
  );
}
