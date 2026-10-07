import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { formatCop } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export type BookingTab = "proximas" | "pasadas" | "canceladas";

type Item = {
  id: string;
  status: string;
  startsAt: Date;
  serviceName: string;
  barberName: string;
  priceCop: number;
};

type Props = {
  tab: BookingTab;
  lists: Record<BookingTab, Item[]>;
  visits: number;
  timeZone: string;
};

const TABS: { id: BookingTab; label: string }[] = [
  { id: "proximas", label: "Próximas" },
  { id: "pasadas", label: "Pasadas" },
  { id: "canceladas", label: "Canceladas" },
];

const STATUS: Record<string, { label: string; tone: string }> = {
  confirmed: { label: "Confirmada", tone: "border-border text-fg" },
  held: { label: "Pendiente de pago", tone: "border-border text-fg" },
  completed: { label: "Atendida", tone: "border-success text-success" },
  no_show: { label: "No asististe", tone: "border-destructive text-destructive" },
  cancelled: { label: "Cancelada", tone: "border-border text-fg-muted" },
};

const EMPTY: Record<BookingTab, string> = {
  proximas: "No tienes citas próximas.",
  pasadas: "Aquí verás las citas a las que ya fuiste.",
  canceladas: "No tienes citas canceladas.",
};

function visitsLine(visits: number): string {
  if (visits === 0) return "Aún no tienes visitas";
  return visits === 1 ? "Has venido 1 vez" : `Has venido ${visits} veces`;
}

/** "Mis citas" for a signed-in customer: visit count, segmented tabs and booking cards. */
export function AccountBookings({ tab, lists, visits, timeZone }: Props) {
  const items = lists[tab];
  return (
    <div className="space-y-6">
      <p className="font-display text-3xl">{visitsLine(visits)}</p>
      <nav aria-label="Tipo de citas">
        <ul className="grid grid-cols-3 rounded-control border border-border bg-surface p-1">
          {TABS.map(({ id, label }) => {
            const active = id === tab;
            return (
              <li key={id}>
                <Link
                  href={id === "proximas" ? "/mis-citas" : `/mis-citas?pestana=${id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center rounded-control text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    active ? "bg-primary text-primary-fg" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {label}
                  <span className="sr-only">: {lists[id].length}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {items.length === 0 ? (
        <div className="space-y-4 rounded-card border border-hairline bg-surface p-6 text-center">
          <p>{EMPTY[tab]}</p>
          {tab === "proximas" ? (
            <Link
              href="/reservar"
              className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-medium text-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Reservar cita
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const status = STATUS[item.status] ?? STATUS.confirmed;
            return (
              <li key={item.id}>
                <Link
                  href={`/mis-citas/${item.id}`}
                  className="flex min-h-16 items-center gap-4 rounded-card border border-hairline bg-surface p-4 hover:border-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:scale-[0.98]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {item.serviceName} con {item.barberName}
                    </span>
                    <span className="block text-sm text-fg-muted first-letter:uppercase">
                      {formatDateTime(item.startsAt, timeZone)} · {formatCop(item.priceCop)}
                    </span>
                    <span
                      className={`mt-2 inline-block rounded-control border px-2 py-0.5 text-xs ${status.tone}`}
                    >
                      {status.label}
                    </span>
                  </span>
                  <Icon name="chevron" className="size-5 shrink-0 text-fg-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
