"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { forgetBooking, readSaved, type SavedBooking } from "@/lib/saved-bookings";

/** Bookings remembered on this phone; read after mount, since the server cannot see them. */
export function SavedBookingsList() {
  const [items, setItems] = useState<SavedBooking[] | null>(null);
  useEffect(() => setItems(readSaved()), []);

  if (items === null) return <p className="text-fg-muted">Cargando tus citas…</p>;
  if (items.length === 0) {
    return (
      <div className="space-y-4 rounded-card border border-hairline bg-surface p-6 text-center">
        <p>Aún no tienes citas guardadas en este celular.</p>
        <Link
          href="/reservar"
          className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-medium text-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Reservar cita
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.path} className="flex items-stretch gap-2">
          <Link
            href={item.path}
            className="flex min-h-16 flex-1 items-center gap-3 rounded-card border border-hairline bg-surface p-4 hover:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out active:scale-[0.98]"
          >
            <Icon name="ticket" className="size-6 shrink-0" />
            <span className="flex-1">
              <span className="block font-medium">{item.title}</span>
              <span className="block text-sm text-fg-muted first-letter:uppercase">
                {item.when}
              </span>
            </span>
            <Icon name="chevron" className="size-5 text-fg-muted" />
          </Link>
          <button
            type="button"
            onClick={() => setItems(forgetBooking(item.path))}
            className="min-h-11 rounded-control px-3 text-sm text-fg-muted underline hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Quitar
          </button>
        </li>
      ))}
    </ul>
  );
}
