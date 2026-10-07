import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { Avatar } from "@/components/site/avatar";
import { ReviewCard } from "@/components/site/reviews/review-card";
import { Stars } from "@/components/site/reviews/stars";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Icon } from "@/components/ui/icon";
import { formatCop } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { getBarberProfile, MIN_RATINGS } from "@/server/barbers";
import { getAccountInitial } from "@/server/session";
import { getShopInfo, whatsappUrl } from "@/server/shop";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getBarberProfile((await params).id);
  return { title: profile ? profile.name : "Barbero" };
}

const ratingFormat = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function countLine(count: number): string {
  return count === 1 ? "1 calificación" : `${count} calificaciones`;
}

export default async function BarberoPage({ params }: Props) {
  const profile = await getBarberProfile((await params).id);
  if (!profile) notFound();
  const [shop, accountInitial, timeZone] = await Promise.all([
    getShopInfo(),
    getAccountInitial(),
    getShopTimeZone(),
  ]);
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  const bookHref = `/reservar?barbero=${profile.id}`;

  return (
    <>
      <SiteHeader
        shopName={shop.name}
        whatsappHref={whatsappHref}
        accountInitial={accountInitial}
      />
      <main id="contenido">
        <section className="bg-ink text-on-ink">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_auto] md:items-end md:py-16">
            <div className="space-y-5">
              <Link
                href="/#barberos"
                className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-on-ink-muted hover:text-on-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink"
              >
                <Icon name="back" className="size-4" />
                Barberos
              </Link>
              <div className="rise flex items-center gap-4">
                <Avatar name={profile.name} size="lg" />
                <h1 className="font-display text-5xl tracking-tight break-words sm:text-6xl">
                  {profile.name}
                </h1>
              </div>
              <Link
                href={bookHref}
                className="rise-2 inline-flex min-h-11 items-center rounded-control bg-on-ink px-5 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-0.5"
              >
                Reservar con {profile.name}
              </Link>
            </div>
            <div className="rise-3 md:text-right">
              {profile.average !== null ? (
                <>
                  <p className="font-display text-7xl leading-none tracking-tight sm:text-8xl">
                    {ratingFormat.format(profile.average)}
                  </p>
                  <div className="mt-3">
                    <Stars rating={profile.average} tone="on-ink" />
                  </div>
                  <p className="mt-1 text-on-ink-muted">{countLine(profile.ratingCount)}</p>
                </>
              ) : (
                <p className="max-w-xs text-on-ink-muted">
                  Mostraremos su promedio cuando tenga {MIN_RATINGS} calificaciones.
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 lg:grid-cols-[3fr_2fr]">
          <section aria-labelledby="opiniones" className="space-y-4">
            <h2 id="opiniones" className="font-display text-4xl tracking-tight">
              Lo que dicen sus clientes
            </h2>
            {profile.reviews.length === 0 ? (
              <p className="text-fg-muted">
                Todavía no hay comentarios. Después de tu visita podrás dejar el tuyo desde Mis
                citas.
              </p>
            ) : (
              <ul className="space-y-3">
                {profile.reviews.map((review) => (
                  <li key={`${review.createdAt.toISOString()}-${review.firstName}`}>
                    <ReviewCard
                      author={review.firstName}
                      rating={review.rating}
                      comment={review.comment}
                      ownerReply={review.ownerReply}
                      date={formatDate(review.createdAt, timeZone)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="servicios" className="space-y-4">
            <h2 id="servicios" className="font-display text-4xl tracking-tight">
              Servicios
            </h2>
            {profile.services.length === 0 ? (
              <p className="text-fg-muted">Pronto publicaremos los servicios.</p>
            ) : (
              <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
                {profile.services.map((service) => (
                  <li key={service.id}>
                    <Link
                      href={`/reservar?servicio=${service.id}&barbero=${profile.id}`}
                      className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="flex-1">
                        <span className="block font-medium">{service.name}</span>
                        <span className="text-sm text-fg-muted">{service.durationMinutes} min</span>
                      </span>
                      <span className="font-medium">{formatCop(service.priceCop)}</span>
                      <Icon name="chevron" className="size-5 text-fg-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
      <SiteFooter
        shopName={shop.name}
        address={shop.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar current="inicio" />
    </>
  );
}
