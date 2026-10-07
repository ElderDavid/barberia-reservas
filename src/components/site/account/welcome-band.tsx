import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/time";

type NextBooking = {
  id: string;
  startsAt: Date;
  serviceName: string;
  barberName: string;
  status: "held" | "confirmed";
};

type Props = {
  firstName: string;
  next: NextBooking | null;
  loyalty: { goal: number; reward: string; onCard: number; full: boolean };
  timeZone: string;
};

const BUTTON =
  "inline-flex min-h-11 items-center gap-2 rounded-control px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5";

function lowerFirst(text: string): string {
  return text.charAt(0).toLocaleLowerCase("es-CO") + text.slice(1);
}

/**
 * The top of Inicio for a signed-in customer: a greeting, the next booking as a ticket and the
 * loyalty stamps in small, each linking to the screen with the details.
 */
export function WelcomeBand({ firstName, next, loyalty, timeZone }: Props) {
  const left = loyalty.goal - loyalty.onCard;
  return (
    <section aria-labelledby="saludo" className="bg-background px-4 pt-8 pb-10 md:pt-12 md:pb-14">
      <div className="mx-auto max-w-6xl">
        <h1 id="saludo" className="rise font-display text-4xl break-words md:text-5xl">
          Hola, {firstName}
        </h1>
        <div
          className={`mt-6 grid gap-4 ${loyalty.goal > 0 ? "md:grid-cols-[3fr_2fr]" : "md:max-w-2xl"}`}
        >
          <article
            aria-labelledby="proxima-cita"
            className="unveil flex flex-col justify-between gap-6 rounded-card bg-cocoa p-6 text-on-cocoa md:p-8"
          >
            <div>
              <h2 id="proxima-cita" className="text-xs uppercase tracking-[0.3em]">
                Tu próxima cita
              </h2>
              {next ? (
                <>
                  <p className="mt-3 font-display text-3xl break-words first-letter:uppercase md:text-4xl">
                    {formatDateTime(next.startsAt, timeZone)}
                  </p>
                  <p className="mt-2 break-words">
                    {next.serviceName} con {next.barberName}
                    {next.status === "held" ? " · Pendiente de pago" : null}
                  </p>
                </>
              ) : (
                <p className="mt-3 font-display text-3xl">No tienes citas próximas.</p>
              )}
            </div>
            <div>
              {next ? (
                <Link
                  href={`/mis-citas/${next.id}`}
                  className={`${BUTTON} bg-on-cocoa text-cocoa focus-visible:outline-on-cocoa`}
                >
                  Ver cita
                  <Icon name="chevron" className="size-4" />
                </Link>
              ) : (
                <Link
                  href="/reservar"
                  className={`${BUTTON} bg-on-cocoa text-cocoa focus-visible:outline-on-cocoa`}
                >
                  Reservar cita
                  <Icon name="chevron" className="size-4" />
                </Link>
              )}
            </div>
          </article>
          {loyalty.goal > 0 ? (
            <article
              aria-labelledby="sellos"
              className="rise-2 flex flex-col justify-between gap-6 rounded-card border border-hairline bg-surface p-6 md:p-8"
            >
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="sellos" className="font-display text-2xl">
                    Tus sellos
                  </h2>
                  <p className="font-display text-2xl">
                    {loyalty.onCard} <span className="text-fg-muted">de {loyalty.goal}</span>
                  </p>
                </div>
                <ol aria-hidden="true" className="mt-4 flex flex-wrap gap-1.5">
                  {Array.from({ length: loyalty.goal }, (_, i) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positions, not items.
                      key={i}
                      className={`size-4 rounded-full ${
                        i < loyalty.onCard ? "bg-primary" : "border border-dashed border-border"
                      }`}
                    />
                  ))}
                </ol>
                <p className="mt-4 text-fg-muted">
                  {loyalty.full
                    ? `¡Ganaste ${lowerFirst(loyalty.reward)}!`
                    : `Te ${left === 1 ? "falta 1 visita" : `faltan ${left} visitas`} para ${lowerFirst(loyalty.reward)}.`}
                </p>
              </div>
              <Link
                href="/cuenta"
                className="inline-flex min-h-11 items-center gap-2 self-start font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Ver mi tarjeta
                <Icon name="chevron" className="size-4" />
              </Link>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}
