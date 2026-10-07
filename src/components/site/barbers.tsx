import Link from "next/link";
import { Avatar } from "@/components/site/avatar";
import { Icon } from "@/components/ui/icon";

type Barber = { id: string; name: string };

/** The team as tappable cards; each one opens the barber's page with ratings and a booking link. */
export function Barbers({ barbers }: { barbers: Barber[] }) {
  return (
    <section id="barberos" aria-labelledby="barberos-titulo" className="scroll-mt-4 bg-background">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-fg-muted">El equipo</p>
        <h2 id="barberos-titulo" className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          Nuestros barberos
        </h2>
        {barbers.length === 0 ? (
          <p className="mt-8 text-fg-muted">Pronto presentaremos a nuestro equipo.</p>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((barber) => (
              <li key={barber.id} className="reveal">
                <Link
                  href={`/barberos/${barber.id}`}
                  className="flex min-h-20 items-center gap-4 rounded-card border border-hairline bg-surface p-4 hover:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <Avatar name={barber.name} />
                  <span className="flex-1">
                    <span className="block font-display text-2xl tracking-tight">
                      {barber.name}
                    </span>
                    <span className="text-sm text-fg-muted">Ver perfil y reservar</span>
                  </span>
                  <Icon name="chevron" className="size-5 text-fg-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
