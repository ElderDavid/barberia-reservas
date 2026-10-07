import Link from "next/link";
import type { ReactNode } from "react";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { BarberList } from "@/components/site/booking/barber-list";
import { BookingSummary } from "@/components/site/booking/booking-summary";
import { DayCalendar } from "@/components/site/booking/day-calendar";
import { PaymentOptions } from "@/components/site/booking/payment-options";
import { ServiceList } from "@/components/site/booking/service-list";
import { TimeSlots } from "@/components/site/booking/time-slots";
import { BookingProgress } from "@/components/site/booking-progress";
import { PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { formatCop } from "@/lib/money";
import { PHOTOS } from "@/lib/photos";
import { addDays, formatDateTime, formatTime, localDay, localMinutes } from "@/lib/time";
import { getAvailability } from "@/server/booking/availability";
import { getBookingOptions } from "@/server/booking/create";
import { getAccountInitial } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { reservar } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid_input: "Revisa tu nombre, tu celular y la autorización de datos.",
  slot_unavailable: "Ese horario ya no está disponible. Elige otro.",
  slot_taken: "Ese horario ya no está disponible. Elige otro.",
  too_many_bookings: "Ya tienes 3 citas pendientes. Cancela una para reservar otra.",
  transfer_unavailable: "El pago en línea aún no está disponible.",
};

type Params = { servicio?: string; barbero?: string; dia?: string; hora?: string; error?: string };

function href(params: Params): string {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return `/reservar?${query.toString()}`;
}

export default async function ReservarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const now = new Date();
  const [options, shop] = await Promise.all([getBookingOptions(), getShopInfo()]);
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const accountInitial = await getAccountInitial();
  const { timeZone } = options;
  const service = options.services.find((item) => item.id === params.servicio);
  const barberName =
    params.barbero === "any"
      ? "Cualquiera"
      : options.barbers.find((item) => item.id === params.barbero)?.name;
  const error = params.error ? ERRORS[params.error] : undefined;

  const current = !service ? 0 : !barberName ? 1 : !params.dia ? 2 : !params.hora ? 3 : 4;
  const today = localDay(now, timeZone);
  let step: ReactNode;
  if (!service) {
    step = (
      <Card title="Elige el servicio">
        <ServiceList
          services={options.services}
          hrefFor={(id) => href({ servicio: id, barbero: barberName ? params.barbero : undefined })}
        />
      </Card>
    );
  } else if (!barberName) {
    step = (
      <Card title="Elige el barbero">
        <BarberList
          barbers={options.barbers}
          hrefFor={(id) => href({ servicio: service.id, barbero: id })}
        />
      </Card>
    );
  } else if (!params.dia) {
    step = (
      <Card title="Elige el día">
        <DayCalendar
          days={Array.from({ length: 14 }, (_, i) => addDays(today, i))}
          today={today}
          hrefFor={(day) => href({ servicio: service.id, barbero: params.barbero, dia: day })}
        />
      </Card>
    );
  } else if (!params.hora) {
    const slots = await getAvailability({
      day: params.dia,
      serviceId: service.id,
      barberId: params.barbero ?? "any",
      now,
    });
    step = (
      <Card title="Elige la hora">
        <TimeSlots
          slots={slots.map((slot) => ({
            iso: slot.startsAt.toISOString(),
            label: formatTime(slot.startsAt, timeZone),
            minutes: localMinutes(slot.startsAt, timeZone),
          }))}
          hrefFor={(iso) => href({ ...params, error: undefined, hora: iso })}
        />
      </Card>
    );
  } else {
    step = (
      <Card title="Tus datos">
        <BookingSummary
          service={service.name}
          price={formatCop(service.priceCop)}
          barber={barberName}
          when={formatDateTime(new Date(params.hora), timeZone)}
        />
        <form action={reservar} className="mt-5 space-y-4">
          <input type="hidden" name="servicio" value={service.id} />
          <input type="hidden" name="barbero" value={params.barbero} />
          <input type="hidden" name="dia" value={params.dia} />
          <input type="hidden" name="hora" value={params.hora} />
          <Field label="Nombre" name="nombre" autoComplete="name" required />
          <Field label="Celular" name="celular" inputMode="numeric" autoComplete="tel" required />
          <PaymentOptions />
          <label className="flex items-start gap-2">
            <input type="checkbox" name="autorizo" value="si" required className="mt-1" />
            <span>
              Autorizo el tratamiento de mis datos (nombre y celular) para gestionar mi cita, según
              la{" "}
              <a href="/privacidad" className="underline">
                política de privacidad
              </a>
              .
            </span>
          </label>
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] -mx-5 border-t border-hairline bg-surface px-5 py-3 sm:-mx-6 sm:px-6 md:bottom-0">
            <Button type="submit" className="w-full">
              Confirmar reserva
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  // One step back, keeping everything chosen before it.
  const back = [
    "/",
    href({ barbero: barberName ? params.barbero : undefined }),
    href({ servicio: params.servicio }),
    href({ servicio: params.servicio, barbero: params.barbero }),
    href({ servicio: params.servicio, barbero: params.barbero, dia: params.dia }),
  ][current];

  return (
    <>
      <SiteHeader
        shopName={shop.name}
        whatsappHref={whatsappHref}
        accountInitial={accountInitial}
      />
      <main id="contenido">
        <PageBanner
          eyebrow="Reserva en línea"
          title="Reserva tu cita"
          subtitle="Cinco pasos cortos. Solo verás los horarios que están libres."
          photo={PHOTOS.client}
        />
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
          <Link
            href={back}
            className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon name="back" className="size-4" />
            {current === 0 ? "Inicio" : "Atrás"}
          </Link>
          <BookingProgress current={current} />
          {error ? (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          ) : null}
          <div key={current} className="rise">
            {step}
          </div>
        </div>
      </main>
      <SiteFooter
        shopName={shop.name}
        address={shop.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar current="reservar" />
    </>
  );
}
