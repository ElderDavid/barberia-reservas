const STEPS = ["Servicio", "Barbero", "Día", "Hora", "Tus datos"];

/** Numbered steps joined by a line that fills up to where the customer is; `current` is 0-based. */
export function BookingProgress({ current }: { current: number }) {
  return (
    <nav aria-label="Pasos de la reserva">
      <ol className="grid grid-cols-5">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className="relative flex flex-col items-center gap-2 text-center"
            >
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-4 right-1/2 -z-0 block h-0.5 w-full overflow-hidden bg-hairline"
                >
                  <span
                    className={`block h-full origin-left bg-primary motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out ${
                      i <= current ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </span>
              ) : null}
              <span
                className={`relative z-10 flex size-8 items-center justify-center rounded-full border text-sm font-medium ${
                  active || done
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border bg-surface text-fg-muted"
                } ${active ? "motion-safe:animate-[pop_400ms_ease-out]" : ""}`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={`text-xs ${active ? "font-medium text-fg" : "text-fg-muted"}`}>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
