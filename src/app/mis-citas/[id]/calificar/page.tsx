import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { StarRatingInput } from "@/components/site/reviews/star-rating-input";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/time";
import { findAccountBooking } from "@/server/accounts/bookings";
import { getAccountReview } from "@/server/accounts/reviews";
import { requireCustomer } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";
import { calificar } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Calificar visita" };

const ERRORS: Record<string, string> = {
  invalid_input: "Elige de 1 a 5 estrellas. El comentario puede tener hasta 500 caracteres.",
  already_replied: "La barbería ya respondió tu calificación, así que no se puede cambiar.",
  not_completed: "Solo puedes calificar una cita a la que ya fuiste.",
  not_found: "No encontramos esa cita en tu cuenta.",
};

export default async function CalificarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const user = await requireCustomer(`/mis-citas/${encodeURIComponent(id)}/calificar`);
  const view = await findAccountBooking(user.id, id);
  if (!view) notFound();
  const bookingId = view.booking.id;
  if (view.booking.status !== "completed") redirect(`/mis-citas/${bookingId}`);
  const review = await getAccountReview(user.id, bookingId);
  if (review?.ownerReply) redirect(`/mis-citas/${bookingId}`);
  const { error } = await searchParams;
  const message = error ? (ERRORS[error] ?? ERRORS.invalid_input) : null;
  const info = await getShopInfo();
  const whatsappHref = info.whatsappPhone ? whatsappUrl(info.whatsappPhone) : undefined;

  return (
    <>
      <SiteHeader
        shopName={info.name}
        whatsappHref={whatsappHref}
        accountInitial={user.name.trim().charAt(0).toLocaleUpperCase("es-CO")}
      />
      <main id="contenido" className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <Link
          href={`/mis-citas/${bookingId}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="back" className="size-4" />
          Tu cita
        </Link>
        <header className="space-y-2">
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
            ¿Cómo te fue con {view.barber.name}?
          </h1>
          <p className="text-fg-muted first-letter:uppercase">
            {view.service.name} · {formatDateTime(view.booking.startsAt, view.shop.timezone)}
          </p>
        </header>
        <form
          action={calificar}
          className="space-y-6 rounded-card border border-hairline bg-surface p-5 sm:p-6"
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <StarRatingInput
            defaultValue={review?.rating}
            describedBy={message ? "review-error" : undefined}
          />
          <div className="space-y-1">
            <label htmlFor="comment" className="block font-medium">
              Comentario (opcional)
            </label>
            <textarea
              id="comment"
              name="comment"
              rows={4}
              maxLength={500}
              defaultValue={review?.comment ?? ""}
              aria-describedby={`comment-hint${message ? " review-error" : ""}`}
              className="w-full rounded-control border border-border bg-surface px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <p id="comment-hint" className="text-sm text-fg-muted">
              Hasta 500 caracteres. Tu nombre de pila y tu comentario se verán en la página del
              barbero. Puedes cambiarlo mientras la barbería no te responda.
            </p>
          </div>
          {message ? (
            <p id="review-error" role="alert" className="text-destructive">
              {message}
            </p>
          ) : null}
          <Button type="submit" className="w-full sm:w-auto">
            {review ? "Guardar cambios" : "Enviar calificación"}
          </Button>
        </form>
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
