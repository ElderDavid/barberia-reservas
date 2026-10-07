import Image from "next/image";
import Link from "next/link";
import { PHOTOS, photoSrc } from "@/lib/photos";

type HeroProps = {
  shopName: string;
  address?: string;
  whatsappHref?: string;
  /** "h2" when a greeting above already holds the page's only h1. */
  titleAs?: "h1" | "h2";
};

export function Hero({ shopName, address, whatsappHref, titleAs: Title = "h1" }: HeroProps) {
  const photo = PHOTOS.chair;
  return (
    <section className="relative isolate overflow-hidden bg-ink text-on-ink">
      <div className="mx-auto grid min-h-[78dvh] max-w-6xl items-end gap-10 px-4 py-14 md:min-h-0 md:grid-cols-2 md:items-center md:py-24">
        <div className="relative z-10 space-y-6">
          <p className="rise text-xs uppercase tracking-[0.3em] text-on-ink-muted">
            Barbería · Tradición y oficio
          </p>
          <Title className="rise-2 font-display text-5xl tracking-tight sm:text-display">
            {shopName}
          </Title>
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
        {/* On the phone the photo fills the band behind the text, like an app's welcome screen. */}
        <div className="unveil absolute inset-0 -z-10 overflow-hidden md:relative md:inset-auto md:z-0 md:aspect-[4/5] md:rounded-card">
          <Image
            src={photoSrc(photo)}
            alt={photo.alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="slow-zoom object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/20 md:hidden" />
        </div>
      </div>
    </section>
  );
}
