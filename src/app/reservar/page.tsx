import Link from "next/link";
import type { ReactNode } from "react";
import { BookingProgress } from "@/components/site/booking-progress";
import { PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { formatCop } from "@/lib/money";
import { PHOTOS } from "@/lib/photos";
import { addDays, formatDateTime, formatTime, localDay } from "@/lib/time";
import { getAvailability } from "@/server/booking/availability";
import { getBookingOptions } from "@/server/booking/create";
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

const choice =
  "flex min-h-12 items-center justify-between rounded-control border border-border bg-surface px-4 hover:border-fg motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function href(params: Params): string {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return `/reservar?${query.toString()}`;
}

/** "lunes, 5 de octubre" for a calendar day (formatted at UTC noon, so no zone can shift it). */
function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

export default async function ReservarPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const now = new Date();
  const [options, shop] = await Promise.all([getBookingOptions(), getShopInfo()]);
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const { timeZone } = options;
  const service = options.services.find((item) => item.id === params.servicio);
  const barberName =
    params.barbero === "any"
      ? "Cualquiera"
      : options.barbers.find((item) => item.id === params.barbero)?.name;
  const error = params.error ? ERRORS[params.error] : undefined;

  const current = !service ? 0 : !barberName ? 1 : !params.dia ? 2 : !params.hora ? 3 : 4;
  let step: ReactNode;
  if (!service) {
    step = (
      <Card title="Elige el servicio">
        <ul className="mt-3 space-y-2">
          {options.services.map((item) => (
            <li key={item.id}>
              <Link href={href({ servicio: item.id })} className={choice}>
                <span>
                  {item.name} · {item.durationMinutes} min
                </span>
                <span>{formatCop(item.priceCop)}</span>
              </Link>
            </li>
          ))}
        </ul>
        {options.services.length === 0 ? (
          <p className="mt-3 text-fg-muted">No hay servicios disponibles.</p>
        ) : null}
      </Card>
    );
  } else if (!barberName) {
    step = (
      <Card title="Elige el barbero">
        <ul className="mt-3 space-y-2">
          {[{ id: "any", name: "Cualquiera" }, ...options.barbers].map((item) => (
            <li key={item.id}>
              <Link href={href({ servicio: service.id, barbero: item.id })} className={choice}>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    );
  } else if (!params.dia) {
    const today = localDay(now, timeZone);
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
    step = (
      <Card title="Elige el día">
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {days.map((day) => (
            <li key={day}>
              <Link
                href={href({ servicio: service.id, barbero: params.barbero, dia: day })}
                className={choice}
              >
                <span className="first-letter:uppercase">{dayLabel(day)}</span>
              </Link>
            </li>
          ))}
        </ul>
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
        {slots.length === 0 ? (
          <p className="mt-3 text-fg-muted">No hay horarios disponibles este día.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {slots.map((slot) => (
              <li key={slot.startsAt.toISOString()}>
                <Link
                  href={href({ ...params, error: undefined, hora: slot.startsAt.toISOString() })}
                  className={choice.replace("justify-between", "justify-center")}
                >
                  {formatTime(slot.startsAt, timeZone)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    );
  } else {
    step = (
      <Card title="Tus datos">
        <dl className="mt-3 space-y-1 text-fg-muted">
          <div>
            <dt className="inline">Servicio: </dt>
            <dd className="inline">
              {service.name} · {formatCop(service.priceCop)}
            </dd>
          </div>
          <div>
            <dt className="inline">Barbero: </dt>
            <dd className="inline">{barberName}</dd>
          </div>
          <div>
            <dt className="inline">Fecha: </dt>
            <dd className="inline">{formatDateTime(new Date(params.hora), timeZone)}</dd>
          </div>
        </dl>
        <form action={reservar} className="mt-4 space-y-4">
          <input type="hidden" name="servicio" value={service.id} />
          <input type="hidden" name="barbero" value={params.barbero} />
          <input type="hidden" name="dia" value={params.dia} />
          <input type="hidden" name="hora" value={params.hora} />
          <Field label="Nombre" name="nombre" autoComplete="name" required />
          <Field label="Celular" name="celular" inputMode="numeric" autoComplete="tel" required />
          <fieldset className="space-y-2">
            <legend className="font-medium">Método de pago</legend>
            <label className="flex min-h-11 items-center gap-2">
              <input type="radio" name="metodo" value="cash" defaultChecked />
              Efectivo en la barbería
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="radio" name="metodo" value="transfer" />
              Transferencia (pago completo en línea)
            </label>
          </fieldset>
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
          <Button type="submit" className="w-full">
            Confirmar reserva
          </Button>
        </form>
      </Card>
    );
  }

  return (
    <>
      <SiteHeader shopName={shop.name} whatsappHref={whatsappHref} />
      <main id="contenido">
        <PageBanner
          eyebrow="Reserva en línea"
          title="Reserva tu cita"
          subtitle="Cinco pasos cortos. Solo verás los horarios que están libres."
          photo={PHOTOS.client}
        />
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-12">
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
    </>
  );
}
