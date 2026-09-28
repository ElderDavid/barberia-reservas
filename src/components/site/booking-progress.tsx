const STEPS = ["Servicio", "Barbero", "Día", "Hora", "Tus datos"];

/** Where the customer is in the booking flow; `current` is 0-based. */
export function BookingProgress({ current }: { current: number }) {
  return (
    <nav aria-label="Pasos de la reserva">
      <ol className="grid grid-cols-5 gap-1">
        {STEPS.map((step, i) => (
          <li key={step} aria-current={i === current ? "step" : undefined} className="space-y-2">
            <span className="block h-1 overflow-hidden rounded-full bg-hairline">
              <span
                className={`block h-full origin-left bg-primary motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out ${
                  i <= current ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </span>
            <span
              className={`block text-xs ${i === current ? "font-medium text-fg" : "text-fg-muted"}`}
            >
              {step}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
