import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type FormAction = (formData: FormData) => Promise<void>;

export type BookingManageProps = {
  details: { service: string; barber: string; when: string; price: string; payment: string };
  rescheduled: boolean;
  message?: string;
  pay?: { amount: string; until: string; url: string; refreshHref: string };
  holdExpired: boolean;
  /** Shown on the private-link page only: that link is how a guest gets back here. */
  linkHint?: { cutoffHours: number };
  whatsappHref: string;
  locked: boolean;
  /** Present while the customer may still change or cancel the booking. */
  manage?: {
    baseHref: string;
    idField: { name: "token" | "cita"; value: string };
    days: { day: string; label: string }[];
    dia?: string;
    slots: { iso: string; label: string }[];
    cancelar: FormAction;
    reprogramar: FormAction;
  };
};

const choice =
  "flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-3 hover:border-fg motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Details, payment and self-service changes of one booking, shared by both ways to open it. */
export function BookingManage(props: BookingManageProps) {
  const { details, pay, manage } = props;
  return (
    <section className="mx-auto max-w-3xl space-y-4 px-4 py-12">
      {props.message ? (
        <p role="alert" className="text-destructive">
          {props.message}
        </p>
      ) : null}
      {props.rescheduled ? <p>Esta cita fue reprogramada; usa el enlace nuevo.</p> : null}

      <Card>
        <dl className="space-y-1">
          {(
            [
              ["Servicio", details.service],
              ["Barbero", details.barber],
              ["Fecha", details.when],
              ["Precio", details.price],
              ["Pago", details.payment],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="inline text-fg-muted">{label}: </dt>
              <dd className="inline">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {pay ? (
        <Card title="Pendiente de pago">
          <p className="mt-2 text-2xl font-semibold">{pay.amount}</p>
          <p className="mt-1">Tu horario queda apartado hasta las {pay.until}.</p>
          <a
            href={pay.url}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-control bg-primary px-4 font-medium text-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Pagar con Wompi
          </a>
          <Link href={pay.refreshHref} className="mt-3 inline-block underline">
            Ya pagué, actualizar
          </Link>
        </Card>
      ) : null}
      {props.holdExpired ? <p>El tiempo para pagar terminó y el horario se liberó.</p> : null}

      {props.linkHint ? (
        <p className="text-fg-muted">
          Guarda este enlace: con él puedes cancelar o cambiar tu cita hasta{" "}
          {props.linkHint.cutoffHours} horas antes.
        </p>
      ) : null}
      <a href={props.whatsappHref} className="inline-block underline">
        Escribir a la barbería
      </a>

      {props.locked ? (
        <p>Ya no puedes cambiarla desde aquí. Llama o escribe a la barbería.</p>
      ) : null}

      {manage ? (
        <>
          <Card title="Cambiar hora">
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {manage.days.map(({ day, label }) => (
                <li key={day}>
                  <Link href={`${manage.baseHref}?dia=${day}`} className={choice}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            {manage.dia ? (
              manage.slots.length === 0 ? (
                <p className="mt-3 text-fg-muted">No hay horarios disponibles este día.</p>
              ) : (
                <form action={manage.reprogramar} className="mt-3 grid grid-cols-3 gap-2">
                  <input type="hidden" name={manage.idField.name} value={manage.idField.value} />
                  {manage.slots.map((slot) => (
                    <Button
                      key={slot.iso}
                      type="submit"
                      name="hora"
                      value={slot.iso}
                      variant="secondary"
                    >
                      {slot.label}
                    </Button>
                  ))}
                </form>
              )
            ) : null}
          </Card>
          <form action={manage.cancelar}>
            <input type="hidden" name={manage.idField.name} value={manage.idField.value} />
            <Button type="submit" variant="danger" className="w-full">
              Cancelar cita
            </Button>
          </form>
        </>
      ) : null}
    </section>
  );
}
