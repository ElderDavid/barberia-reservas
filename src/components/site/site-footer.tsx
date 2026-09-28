import Link from "next/link";
import { PHOTOS } from "@/lib/photos";

type SiteFooterProps = { shopName: string; address?: string; whatsappHref?: string };

const LINK =
  "inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink";

export function SiteFooter({ shopName, address, whatsappHref }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const credits = [...new Set(Object.values(PHOTOS).map((photo) => photo.credit))].join(", ");
  return (
    <footer className="bg-ink text-on-ink">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="font-display text-4xl tracking-tight">{shopName}</p>
          {address ? <p className="text-on-ink-muted">{address}</p> : null}
        </div>
        <ul className="space-y-1 text-sm sm:justify-self-end">
          <li>
            <Link href="/reservar" className={LINK}>
              Reserva tu turno
            </Link>
          </li>
          {whatsappHref ? (
            <li>
              <a href={whatsappHref} className={LINK}>
                Escríbenos
              </a>
            </li>
          ) : null}
          <li>
            <Link href="/privacidad" className={LINK}>
              Política de privacidad
            </Link>
          </li>
        </ul>
      </div>
      <div className="mx-auto max-w-6xl space-y-2 border-t border-on-ink-muted/30 px-4 py-8 text-xs text-on-ink-muted">
        <p>
          © {year} {shopName}. Todos los derechos reservados. Prohibida la reproducción total o
          parcial de los contenidos, textos y diseño de este sitio sin autorización escrita.
        </p>
        <p>Fotos: {credits} en Unsplash, usadas bajo la licencia de Unsplash.</p>
        <p>
          Diseño y desarrollo: <span className="font-display text-base text-on-ink">IngEM</span>
        </p>
      </div>
    </footer>
  );
}
