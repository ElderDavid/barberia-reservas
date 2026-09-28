import Link from "next/link";

type SiteHeaderProps = { shopName: string; whatsappHref?: string };

const LINK =
  "inline-flex min-h-11 items-center px-2 text-sm text-fg underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function SiteHeader({ shopName, whatsappHref }: SiteHeaderProps) {
  return (
    <header className="bg-surface">
      <p className="border-b border-hairline px-4 py-2 text-center text-xs text-fg-muted">
        Reserva en línea · Paga en efectivo, Nequi, PSE o tarjeta
      </p>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 py-3">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {shopName}
        </Link>
        <nav aria-label="Principal">
          <ul className="flex flex-wrap items-center">
            <li>
              <Link href="/#servicios" className={LINK}>
                Servicios
              </Link>
            </li>
            {whatsappHref ? (
              <li>
                <a href={whatsappHref} className={LINK}>
                  WhatsApp
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/entrar" className={LINK}>
                Ingresar
              </Link>
            </li>
            <li>
              <Link
                href="/reservar"
                className="ml-2 inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-sm font-medium text-primary-fg motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Reservar
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
