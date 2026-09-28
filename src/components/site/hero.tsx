import Image from "next/image";
import Link from "next/link";
import { PHOTOS, photoSrc } from "@/lib/photos";

type HeroProps = { shopName: string; address?: string; whatsappHref?: string };

export function Hero({ shopName, address, whatsappHref }: HeroProps) {
  const photo = PHOTOS.chair;
  return (
    <section className="bg-ink text-on-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-24">
        <div className="space-y-6">
          <p className="rise text-xs uppercase tracking-[0.3em] text-on-ink-muted">
            Barbería · Tradición y oficio
          </p>
          <h1 className="rise-2 font-display text-5xl tracking-tight sm:text-display">
            {shopName}
          </h1>
          <p className="rise-3 max-w-md text-lg text-on-ink-muted">
            Cortes, barba y afeitado con navaja. Escoge tu barbero y tu hora en un minuto, sin
            llamadas ni filas.
          </p>
          <div className="rise-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/reservar"
              className="inline-flex min-h-11 items-center rounded-control bg-on-ink px-5 font-medium text-ink motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink"
            >
              Reservar cita
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink"
              >
                Escribir por WhatsApp
              </a>
            ) : null}
          </div>
          {address ? <p className="text-sm text-on-ink-muted">{address}</p> : null}
        </div>
        <div className="unveil relative aspect-[4/5] overflow-hidden rounded-card">
          <Image
            src={photoSrc(photo)}
            alt={photo.alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="slow-zoom object-cover"
          />
        </div>
      </div>
    </section>
  );
}
