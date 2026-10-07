import Link from "next/link";
import { Avatar } from "@/components/site/avatar";
import { Icon } from "@/components/ui/icon";
import { CHOICE } from "./choice";

type Barber = { id: string; name: string };

/** "Cualquiera" first (the earliest free barber), then each barber with an initials avatar. */
export function BarberList({
  barbers,
  hrefFor,
}: {
  barbers: Barber[];
  hrefFor: (id: string) => string;
}) {
  return (
    <ul className="mt-4 space-y-3">
      <li>
        <Link href={hrefFor("any")} className={CHOICE}>
          <span
            aria-hidden="true"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border text-fg"
          >
            <Icon name="users" />
          </span>
          <span className="flex-1">
            <span className="block font-medium">Cualquiera</span>
            <span className="block text-sm text-fg-muted">El primero que esté libre</span>
          </span>
          <Icon name="chevron" className="size-5 text-fg-muted" />
        </Link>
      </li>
      {barbers.map((item) => (
        <li key={item.id}>
          <Link href={hrefFor(item.id)} className={CHOICE}>
            <Avatar name={item.name} />
            <span className="flex-1 font-medium">{item.name}</span>
            <Icon name="chevron" className="size-5 text-fg-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
