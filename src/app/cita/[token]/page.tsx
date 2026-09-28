import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCop } from "@/lib/money";
import { addDays, formatDateTime, formatTime, localDay } from "@/lib/time";
import { getAvailability } from "@/server/booking/availability";
import { findByToken, withinSelfServiceWindow } from "@/server/booking/manage";
import { cancelar, reprogramar } from "./actions";

export const dynamic = "force-dynamic";

const TITLES: Record<string, string> = {
  confirmed: "Cita confirmada",
  cancelled: "Cita cancelada",
  completed: "Cita atendida",
  no_show: "No asististe a esta cita",
  held: "Pendiente de pago",
};

const ERRORS: Record<string, string> = {
  cutoff_passed: "Ya no puedes cambiarla desde aquí. Llama o escribe a la barbería.",
  slot_taken: "Ese horario ya no está disponible. Elige otro.",
  invalid_state: "Esta cita ya no se puede cambiar.",
};

const METHODS: Record<string, string> = {
  cash: "Efectivo en la barbería",
  transfer: "Transferencia",
};

const choice =
  "flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

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

  const now = new Date();
  const { booking, service, barber, shop } = view;
  const canManage = booking.status === "confirmed" && withinSelfServiceWindow(view, now);
  const message = error ? ERRORS[error] : undefined;

  const today = localDay(now, shop.timezone);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const slots =
    canManage && dia
      ? await getAvailability({ day: dia, serviceId: service.id, barberId: barber.id, now })
      : [];

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {TITLES[booking.status] ?? "Tu cita"}
      </h1>
      {message ? (
        <p role="alert" className="text-destructive">
          {message}
        </p>
      ) : null}
      {booking.status === "cancelled" && booking.cancelReason === "reprogramada" ? (
        <p>Esta cita fue reprogramada; usa el enlace nuevo.</p>
      ) : null}

      <Card>
        <dl className="space-y-1">
          <div>
            <dt className="inline text-fg-muted">Servicio: </dt>
            <dd className="inline">{service.name}</dd>
          </div>
          <div>
            <dt className="inline text-fg-muted">Barbero: </dt>
            <dd className="inline">{barber.name}</dd>
          </div>
          <div>
            <dt className="inline text-fg-muted">Fecha: </dt>
            <dd className="inline">{formatDateTime(booking.startsAt, shop.timezone)}</dd>
          </div>
          <div>
            <dt className="inline text-fg-muted">Precio: </dt>
            <dd className="inline">{formatCop(booking.priceCop)}</dd>
          </div>
          <div>
            <dt className="inline text-fg-muted">Pago: </dt>
            <dd className="inline">{METHODS[booking.paymentMethod]}</dd>
          </div>
        </dl>
      </Card>

      <p className="text-fg-muted">
        Guarda este enlace: con él puedes cancelar o cambiar tu cita hasta{" "}
        {shop.selfServiceCutoffHours} horas antes.
      </p>
      <a href={`https://wa.me/${shop.whatsappPhone}`} className="inline-block underline">
        Escribir a la barbería
      </a>

      {booking.status === "confirmed" && !canManage ? (
        <p>Ya no puedes cambiarla desde aquí. Llama o escribe a la barbería.</p>
      ) : null}

      {canManage ? (
        <>
          <Card title="Cambiar hora">
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {days.map((day) => (
                <li key={day}>
                  <Link href={`/cita/${token}?dia=${day}`} className={choice}>
                    {dayLabel(day)}
                  </Link>
                </li>
              ))}
            </ul>
            {dia ? (
              slots.length === 0 ? (
                <p className="mt-3 text-fg-muted">No hay horarios disponibles este día.</p>
              ) : (
                <form action={reprogramar} className="mt-3 grid grid-cols-3 gap-2">
                  <input type="hidden" name="token" value={token} />
                  {slots.map((slot) => (
                    <Button
                      key={slot.startsAt.toISOString()}
                      type="submit"
                      name="hora"
                      value={slot.startsAt.toISOString()}
                      variant="secondary"
                    >
                      {formatTime(slot.startsAt, shop.timezone)}
                    </Button>
                  ))}
                </form>
              )
            ) : null}
          </Card>
          <form action={cancelar}>
            <input type="hidden" name="token" value={token} />
            <Button type="submit" variant="danger" className="w-full">
              Cancelar cita
            </Button>
          </form>
        </>
      ) : null}
    </section>
  );
}
