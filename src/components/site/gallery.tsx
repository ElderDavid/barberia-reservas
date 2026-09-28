import Image from "next/image";
import { PHOTOS, type Photo, photoSrc } from "@/lib/photos";

const ITEMS: { photo: Photo; title: string; text: string }[] = [
  { photo: PHOTOS.scissors, title: "El corte", text: "Tijera y máquina, a tu medida." },
  { photo: PHOTOS.razor, title: "La navaja", text: "Perfilado y afeitado tradicional." },
  { photo: PHOTOS.styling, title: "El acabado", text: "Lavado, secado y peinado." },
];

export function Gallery() {
  return (
    <section aria-labelledby="oficio" className="mx-auto max-w-6xl px-4 py-24">
      <div className="reveal mx-auto max-w-2xl space-y-4 text-center">
        <h2 id="oficio" className="font-display text-4xl tracking-tight sm:text-5xl">
          El oficio
        </h2>
        <p className="text-fg-muted">
          Cada visita es un ritual: conversación, buen pulso y el tiempo que tu corte necesita.
        </p>
      </div>
      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {ITEMS.map((item) => (
          <li key={item.title} className="reveal group">
            <div className="reveal-image relative aspect-[3/4] overflow-hidden rounded-card bg-ink">
              <Image
                src={photoSrc(item.photo)}
                alt={item.photo.alt}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out group-hover:scale-105"
              />
            </div>
            <div className="relative -mt-16 mr-8 rounded-card bg-surface p-6">
              <h3 className="font-display text-3xl tracking-tight">{item.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
