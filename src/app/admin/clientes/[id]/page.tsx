import Link from "next/link";
import { notFound } from "next/navigation";
import { Stars } from "@/components/site/reviews/stars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatCop } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { getClient } from "@/server/admin/clients";
import { canjearPremio } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  held: "Pendiente de pago",
  confirmed: "Confirmada",
  completed: "Atendida",
  no_show: "No vino",
  cancelled: "Cancelada",
};

const ERRORS: Record<string, string> = {
  not_enough: "Este cliente todavía no completa la tarjeta.",
  disabled: "La tarjeta de fidelidad está apagada en Ajustes.",
  not_found: "Este cliente ya no tiene cuenta.",
  invalid_input: "No se pudo canjear el premio.",
};

export default async function AdminClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; canjeado?: string }>;
}) {
  const client = await getClient((await params).id);
  if (!client) notFound();
  const [{ error, canjeado }, timeZone] = await Promise.all([searchParams, getShopTimeZone()]);
  const loyalty = client.loyalty;
  const message = error ? (ERRORS[error] ?? ERRORS.invalid_input) : null;

  return (
    <section className="space-y-6">
      <Link
        href="/admin/clientes"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Icon name="back" className="size-4" />
        Clientes
      </Link>
      <header className="space-y-1">
        <h1 className="font-display text-4xl tracking-tight">{client.name}</h1>
        <p className="text-fg-muted">
          <a href={`https://wa.me/${client.phone}`} className="underline">
            +{client.phone}
          </a>
          {client.userId ? ", con cuenta" : ", sin cuenta"}
        </p>
        <p className="text-fg-muted">
          {client.visits === 1 ? "1 visita" : `${client.visits} visitas`}
          {client.lastVisit ? `, la última el ${formatDate(client.lastVisit, timeZone)}` : ""}
        </p>
      </header>

      {message ? (
        <p role="alert" className="text-destructive">
          {message}
        </p>
      ) : null}
      {canjeado ? (
        <p role="status" className="text-success">
          Premio entregado. La tarjeta empieza de nuevo.
        </p>
      ) : null}

      {loyalty && loyalty.goal > 0 ? (
        <Card title="Tarjeta de fidelidad">
          <p className="mt-2 font-display text-3xl">
            {loyalty.onCard} <span className="text-fg-muted">de {loyalty.goal} sellos</span>
          </p>
          {loyalty.full ? (
            <form action={canjearPremio} className="mt-4 space-y-2">
              <input type="hidden" name="clientId" value={client.id} />
              <input type="hidden" name="userId" value={client.userId ?? ""} />
              <p>
                Completó la tarjeta: le corresponde {loyalty.reward.toLocaleLowerCase("es-CO")}.
              </p>
              <Button type="submit">Canjear premio</Button>
            </form>
          ) : (
            <p className="mt-1 text-fg-muted">
              Le faltan {loyalty.goal - loyalty.onCard} para{" "}
              {loyalty.reward.toLocaleLowerCase("es-CO")}.
            </p>
          )}
        </Card>
      ) : null}

      <Card title="Citas">
        {client.bookings.length === 0 ? (
          <p className="mt-2 text-fg-muted">No tiene citas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {client.bookings.map((booking) => (
              <li key={booking.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                <span>
                  <span className="block font-medium">
                    {booking.serviceName} con {booking.barberName}
                  </span>
                  <span className="block text-sm text-fg-muted first-letter:uppercase">
                    {formatDateTime(booking.startsAt, timeZone)}
                  </span>
                </span>
                <span className="text-right text-sm">
                  <span className="block">{formatCop(booking.priceCop)}</span>
                  <span className="block text-fg-muted">
                    {STATUS[booking.status] ?? booking.status}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Calificaciones">
        {client.reviews.length === 0 ? (
          <p className="mt-2 text-fg-muted">Todavía no ha calificado.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {client.reviews.map((review) => (
              <li key={review.createdAt.toISOString()} className="space-y-1">
                <p className="flex flex-wrap items-center gap-2">
                  <Stars rating={review.rating} size="sm" />
                  <span className="text-sm text-fg-muted">
                    {review.barberName}, {formatDate(review.createdAt, timeZone)}
                  </span>
                </p>
                {review.comment ? <p>{review.comment}</p> : null}
                {review.ownerReply ? (
                  <p className="border-l-2 border-cocoa pl-3 text-fg-muted">{review.ownerReply}</p>
                ) : (
                  <Link href="/admin/opiniones?filtro=sin-responder" className="text-sm underline">
                    Responder en Opiniones
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
