import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatCop } from "@/lib/money";
import { PHOTOS, photoSrc } from "@/lib/photos";
import { CHOICE } from "./choice";

type Service = { id: string; name: string; durationMinutes: number; priceCop: number };

const THUMBS = [PHOTOS.scissors, PHOTOS.razor, PHOTOS.styling, PHOTOS.detail, PHOTOS.client];

/** Services as cards with a photo, duration and price; `hrefFor` builds the next step's URL. */
export function ServiceList({
  services,
  hrefFor,
}: {
  services: Service[];
  hrefFor: (id: string) => string;
}) {
  if (services.length === 0)
    return <p className="mt-3 text-fg-muted">No hay servicios disponibles.</p>;
  return (
    <ul className="mt-4 space-y-3">
      {services.map((item, i) => {
        const photo = THUMBS[i % THUMBS.length];
        return (
          <li key={item.id}>
            <Link href={hrefFor(item.id)} className={CHOICE}>
              <span className="relative size-14 shrink-0 overflow-hidden rounded-control">
                <Image src={photoSrc(photo)} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <span className="flex-1">
                <span className="block font-medium">{item.name}</span>
                <span className="flex items-center gap-1 text-sm text-fg-muted">
                  <Icon name="clock" className="size-4" /> {item.durationMinutes} min
                </span>
              </span>
              <span className="font-medium">{formatCop(item.priceCop)}</span>
              <Icon name="chevron" className="size-5 text-fg-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
