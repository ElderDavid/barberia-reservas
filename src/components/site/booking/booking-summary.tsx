import { Avatar } from "@/components/site/avatar";
import { Icon } from "@/components/ui/icon";

type BookingSummaryProps = {
  service: string;
  price: string;
  barber: string;
  when: string;
};

/** The chosen service, barber and time, as a ticket the customer checks before confirming. */
export function BookingSummary({ service, price, barber, when }: BookingSummaryProps) {
  return (
    <div className="mt-4 rounded-card bg-cocoa p-4 text-on-cocoa">
      <div className="flex items-center gap-3">
        {barber === "Cualquiera" ? (
          <span
            aria-hidden="true"
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-on-cocoa/40"
          >
            <Icon name="users" />
          </span>
        ) : (
          <Avatar name={barber} />
        )}
        <div className="flex-1">
          <p className="font-display text-2xl tracking-tight">{service}</p>
          <p className="text-sm">
            {barber === "Cualquiera" ? "con el primer barbero libre" : `con ${barber}`}
          </p>
        </div>
        <p className="text-lg font-semibold">{price}</p>
      </div>
      <dl className="mt-4 space-y-1 border-t border-on-cocoa/30 pt-3 text-sm">
        <div className="flex items-center gap-2">
          <Icon name="calendar" className="size-4" />
          <dt className="sr-only">Fecha</dt>
          <dd className="first-letter:uppercase">{when}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Icon name="scissors" className="size-4" />
          <dt className="sr-only">Servicio</dt>
          <dd>
            {service} · {price}
          </dd>
        </div>
      </dl>
    </div>
  );
}
