import Link from "next/link";
import { Stars } from "@/components/site/reviews/stars";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { countUnanswered, listReviews, type ReviewFilter } from "@/server/admin/reviews";
import { ocultarOpinion, responderOpinion } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid_input: "Escribe una respuesta de hasta 500 caracteres.",
  not_found: "No encontramos esa opinión.",
};

const FILTERS: { id: ReviewFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "sin-responder", label: "Sin responder" },
];

export default async function AdminOpinionesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; error?: string }>;
}) {
  const params = await searchParams;
  const filter: ReviewFilter = params.filtro === "sin-responder" ? "sin-responder" : "todas";
  const [items, unanswered, timeZone] = await Promise.all([
    listReviews(filter),
    countUnanswered(),
    getShopTimeZone(),
  ]);
  const error = params.error ? (ERRORS[params.error] ?? ERRORS.invalid_input) : null;

  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Opiniones</h1>
      <p className="text-fg-muted">
        {unanswered === 0
          ? "Respondiste todas las opiniones."
          : unanswered === 1
            ? "1 opinión espera tu respuesta."
            : `${unanswered} opiniones esperan tu respuesta.`}
      </p>
      <nav aria-label="Filtrar opiniones">
        <ul className="inline-grid grid-cols-2 rounded-control border border-border bg-surface p-1">
          {FILTERS.map(({ id, label }) => (
            <li key={id}>
              <Link
                href={id === "todas" ? "/admin/opiniones" : `/admin/opiniones?filtro=${id}`}
                aria-current={id === filter ? "page" : undefined}
                className={`flex min-h-11 items-center justify-center rounded-control px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  id === filter ? "bg-primary text-primary-fg" : "text-fg-muted hover:text-fg"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="text-fg-muted">
          {filter === "todas" ? "Aún no hay opiniones." : "No hay opiniones sin responder."}
        </p>
      ) : null}
      {items.map((item) => (
        <Card key={item.id} className={item.hidden ? "border-dashed" : undefined}>
          <article aria-label={`Opinión de ${item.customerName}`} className="space-y-3">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{item.customerName}</p>
              <Stars rating={item.rating} size="sm" />
            </header>
            <div className="text-sm text-fg-muted">
              <p>
                {item.serviceName} con {item.barberName},{" "}
                {formatDateTime(item.bookingStartsAt, timeZone)}
              </p>
              <p>Calificó el {formatDate(item.createdAt, timeZone)}</p>
            </div>
            {item.hidden ? (
              <p className="text-sm font-medium text-destructive">
                Oculta: no se muestra en la página del barbero.
              </p>
            ) : null}
            {item.comment ? (
              <p className="leading-relaxed">{item.comment}</p>
            ) : (
              <p className="text-fg-muted">Sin comentario.</p>
            )}
            <form action={responderOpinion} className="space-y-2">
              <input type="hidden" name="reviewId" value={item.id} />
              <input type="hidden" name="filtro" value={filter} />
              <label htmlFor={`reply-${item.id}`} className="block font-medium">
                {item.ownerReply ? "Tu respuesta" : "Responder"}
              </label>
              <textarea
                id={`reply-${item.id}`}
                name="reply"
                rows={3}
                maxLength={500}
                required
                defaultValue={item.ownerReply ?? ""}
                className="w-full rounded-control border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="submit">
                  {item.ownerReply ? "Guardar respuesta" : "Enviar respuesta"}
                </Button>
              </div>
            </form>
            <form action={ocultarOpinion}>
              <input type="hidden" name="reviewId" value={item.id} />
              <input type="hidden" name="filtro" value={filter} />
              <input type="hidden" name="hidden" value={item.hidden ? "0" : "1"} />
              <Button type="submit" variant={item.hidden ? "secondary" : "danger"}>
                {item.hidden ? "Mostrar de nuevo" : "Ocultar"}
              </Button>
            </form>
          </article>
        </Card>
      ))}
    </section>
  );
}
