import Image from "next/image";
import Link from "next/link";
import { formatCop } from "@/lib/money";
import { PHOTOS, photoSrc } from "@/lib/photos";

type Service = { id: string; name: string; durationMinutes: number; priceCop: number };

/** The price list as a printed menu: serif names, dotted leaders, prices on the right. */
export function ServicesMenu({ services }: { services: Service[] }) {
  const photo = PHOTOS.tools;
  return (
    <section id="servicios" aria-labelledby="servicios-titulo" className="bg-surface">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 md:grid-cols-5">
        <div className="reveal-image relative hidden min-h-[32rem] overflow-hidden rounded-card md:col-span-2 md:block">
          <Image src={photoSrc(photo)} alt={photo.alt} fill sizes="40vw" className="object-cover" />
        </div>
        <div className="md:col-span-3">
          <p className="text-xs uppercase tracking-[0.3em] text-fg-muted">La carta</p>
          <h2
            id="servicios-titulo"
            className="mt-3 font-display text-4xl tracking-tight sm:text-5xl"
          >
            Servicios
          </h2>
          {services.length === 0 ? (
            <p className="mt-8 text-fg-muted">Pronto publicaremos nuestros servicios.</p>
          ) : (
            <ul className="mt-8 divide-y divide-hairline">
              {services.map((service) => (
                <li key={service.id} className="reveal">
                  <Link
                    href={`/reservar?servicio=${service.id}`}
                    className="group flex flex-col gap-1 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-2xl tracking-tight motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out group-hover:translate-x-1 sm:text-3xl">
                        {service.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className="min-w-4 flex-1 translate-y-[-0.3em] border-b border-dotted border-border"
                      />
                      <span className="shrink-0 font-medium">{formatCop(service.priceCop)}</span>
                    </span>
                    <span className="text-sm text-fg-muted">
                      {service.durationMinutes} min · <span className="underline">Reservar</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
