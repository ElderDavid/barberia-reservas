import Link from "next/link";
import { Stars } from "@/components/site/reviews/stars";

type Review = { rating: number; comment: string; ownerReply: string | null };

const action =
  "inline-flex min-h-11 items-center rounded-control px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** On an attended booking: the invitation to rate it, or the customer's rating and the reply. */
export function VisitReview({
  bookingId,
  review,
  justSaved,
}: {
  bookingId: string;
  review: Review | null;
  justSaved: boolean;
}) {
  const href = `/mis-citas/${bookingId}/calificar`;
  if (!review) {
    return (
      <section className="space-y-4 rounded-card bg-cocoa p-6 text-on-cocoa">
        <h2 className="font-display text-3xl tracking-tight">¿Cómo te fue?</h2>
        <p>Califica esta visita. Tu opinión le llega directo a la barbería.</p>
        <Link href={href} className={`${action} bg-surface text-fg`}>
          Calificar visita
        </Link>
      </section>
    );
  }
  return (
    <section className="space-y-3 rounded-card border border-hairline bg-surface p-6">
      <h2 className="font-display text-2xl tracking-tight">Tu calificación</h2>
      {justSaved ? (
        <p role="status" className="text-success">
          ¡Gracias! Guardamos tu calificación.
        </p>
      ) : null}
      <Stars rating={review.rating} size="lg" />
      {review.comment ? <p className="leading-relaxed">{review.comment}</p> : null}
      {review.ownerReply ? (
        <div className="border-l-2 border-cocoa pl-4">
          <p className="text-sm font-medium">Respuesta de la barbería</p>
          <p className="mt-1 leading-relaxed text-fg-muted">{review.ownerReply}</p>
        </div>
      ) : (
        <Link href={href} className={`${action} -ml-2 px-2 underline underline-offset-4`}>
          Cambiar calificación
        </Link>
      )}
    </section>
  );
}
