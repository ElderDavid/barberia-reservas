import Link from "next/link";
import { formatCop } from "@/lib/money";
import { getPublicShop, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

const LINK =
  "inline-flex min-h-11 items-center justify-center rounded-control px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default async function HomePage() {
  const shop = await getPublicShop();
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{shop.name}</h1>
        {shop.address ? <p className="text-fg-muted">{shop.address}</p> : null}
        <p>Reserva tu cita en minutos, desde el celular.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link href="/reservar" className={`${LINK} bg-primary text-primary-fg`}>
          Reservar cita
        </Link>
        {shop.whatsappPhone ? (
          <a
            href={whatsappUrl(shop.whatsappPhone)}
            className={`${LINK} border border-border bg-surface text-fg`}
          >
            Escribir por WhatsApp
          </a>
        ) : null}
      </div>

      <section aria-labelledby="servicios" className="space-y-3">
        <h2 id="servicios" className="text-lg font-semibold">
          Servicios
        </h2>
        {shop.services.length === 0 ? (
          <p className="text-fg-muted">Pronto publicaremos nuestros servicios.</p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {shop.services.map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-fg-muted">{service.durationMinutes} min</p>
                </div>
                <p className="shrink-0 font-medium">{formatCop(service.priceCop)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-border pt-4 text-sm">
        <Link
          href="/privacidad"
          className="inline-flex min-h-11 items-center text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Política de privacidad
        </Link>
      </footer>
    </div>
  );
}
