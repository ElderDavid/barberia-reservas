import Link from "next/link";
import type { ReactNode } from "react";
import { AppTabBar } from "@/components/site/app-tab-bar";
import { PageBanner } from "@/components/site/page-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { POLICY_DATE_LABEL } from "@/lib/legal";
import { PHOTOS } from "@/lib/photos";
import { whatsappUrl } from "@/server/shop";

export type LegalSection = { id: string; title: string; body: ReactNode };

type LegalPageProps = {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  shop: { name: string; address: string; whatsappPhone: string };
};

const LINK =
  "underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Long legal text: numbered sections with an index, readable at 320px and printable. */
export function LegalPage({ eyebrow, title, intro, sections, shop }: LegalPageProps) {
  const whatsappHref = shop.whatsappPhone ? whatsappUrl(shop.whatsappPhone) : undefined;
  return (
    <>
      <SiteHeader shopName={shop.name} whatsappHref={whatsappHref} />
      <main id="contenido">
        <PageBanner eyebrow={eyebrow} title={title} photo={PHOTOS.tools} />
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[16rem_1fr]">
          <nav aria-label="Contenido" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs uppercase tracking-[0.3em] text-fg-muted">Contenido</p>
            <ol className="mt-3 space-y-1 text-sm">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={`inline-flex min-h-11 items-center ${LINK}`}
                  >
                    {i + 1}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="max-w-3xl space-y-10">
            <div className="space-y-3 text-fg-muted">
              {intro}
              <p className="text-sm">Vigente desde el {POLICY_DATE_LABEL}.</p>
            </div>
            {sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-titulo`}
                className="scroll-mt-24 space-y-3 border-t border-hairline pt-6 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed"
              >
                <h2 id={`${section.id}-titulo`} className="font-display text-3xl tracking-tight">
                  <span className="text-fg-muted">{i + 1}.</span> {section.title}
                </h2>
                {section.body}
              </section>
            ))}
            <p className="border-t border-hairline pt-6">
              <Link href="/" className={`inline-flex min-h-11 items-center ${LINK}`}>
                Volver al inicio
              </Link>
            </p>
          </article>
        </div>
      </main>
      <SiteFooter
        shopName={shop.name}
        address={shop.address || undefined}
        whatsappHref={whatsappHref}
      />
      <AppTabBar />
    </>
  );
}

/** A responsible-party value, or a visible "por completar" mark while the owner has not set it. */
export function Fill({ value }: { value: string }) {
  return value ? (
    <>{value}</>
  ) : (
    <span className="rounded-control bg-hairline px-1 italic text-fg-muted">por completar</span>
  );
}
