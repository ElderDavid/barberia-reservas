import Image from "next/image";
import Link from "next/link";
import { PHOTOS, photoSrc } from "@/lib/photos";

type VisitProps = { address?: string; whatsappHref?: string };

export function Visit({ address, whatsappHref }: VisitProps) {
  const photo = PHOTOS.classicChair;
  return (
    <section aria-labelledby="visitanos" className="bg-cocoa text-on-cocoa">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
        <div className="reveal-image relative aspect-[4/3] overflow-hidden rounded-card">
          <Image
            src={photoSrc(photo)}
            alt={photo.alt}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="reveal space-y-5">
          <h2 id="visitanos" className="font-display text-4xl tracking-tight sm:text-5xl">
            Te esperamos en el sillón
          </h2>
          {address ? <p className="text-lg">{address}</p> : null}
          <p>
            Llega unos minutos antes. Si se te complica, cambia o cancela tu cita desde el enlace
            que te damos al reservar.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/reservar"
              className="inline-flex min-h-11 items-center rounded-control bg-on-cocoa px-5 font-medium text-cocoa motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-cocoa"
            >
              Agenda tu turno
            </Link>
            {whatsappHref ? (
              <a
                href={whatsappHref}
                className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-cocoa"
              >
                Preguntar por WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
