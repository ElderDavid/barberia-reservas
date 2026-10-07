import Link from "next/link";
import { dayPart } from "@/lib/calendar";

type Slot = { iso: string; label: string; minutes: number };

/** Free times as chips, grouped into morning, afternoon and evening. */
export function TimeSlots({ slots, hrefFor }: { slots: Slot[]; hrefFor: (iso: string) => string }) {
  if (slots.length === 0) {
    return <p className="mt-3 text-fg-muted">No hay horarios disponibles este día.</p>;
  }
  const groups = new Map<string, Slot[]>();
  for (const slot of slots) {
    const part = dayPart(slot.minutes);
    groups.set(part, [...(groups.get(part) ?? []), slot]);
  }
  return (
    <div className="mt-4 space-y-5">
      {[...groups].map(([part, items]) => (
        <section key={part} aria-label={part}>
          <p className="mb-2 text-sm font-medium text-fg-muted">{part}</p>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((slot) => (
              <li key={slot.iso}>
                <Link
                  href={hrefFor(slot.iso)}
                  className="flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-2 text-sm hover:border-primary hover:bg-primary hover:text-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out active:scale-95"
                >
                  {slot.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
