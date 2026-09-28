import Image from "next/image";
import type { ReactNode } from "react";
import { type Photo, photoSrc } from "@/lib/photos";

type PageBannerProps = { eyebrow?: string; title: ReactNode; subtitle?: string; photo: Photo };

/** Dark title band for inner pages; the photo is decoration, so it has an empty alt. */
export function PageBanner({ eyebrow, title, subtitle, photo }: PageBannerProps) {
  return (
    <section className="relative overflow-hidden bg-ink text-on-ink">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 md:grid-cols-3 md:py-16">
        <div className="space-y-3 md:col-span-2">
          {eyebrow ? (
            <p className="rise text-xs uppercase tracking-[0.3em] text-on-ink-muted">{eyebrow}</p>
          ) : null}
          <h1 className="rise-2 font-display text-4xl tracking-tight break-words sm:text-5xl">
            {title}
          </h1>
          {subtitle ? <p className="rise-3 max-w-xl text-on-ink-muted">{subtitle}</p> : null}
        </div>
        <div className="unveil relative hidden aspect-square overflow-hidden rounded-card md:block">
          <Image
            src={photoSrc(photo)}
            alt=""
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="slow-zoom object-cover"
          />
        </div>
      </div>
    </section>
  );
}
