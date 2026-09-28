const STEPS = [
  {
    title: "Elige tu servicio y tu barbero",
    text: "Corte, barba o el combo completo. Con tu barbero de siempre o el primero libre.",
  },
  {
    title: "Escoge el día y la hora",
    text: "Solo ves los horarios que de verdad están libres. Nadie te quita el turno.",
  },
  {
    title: "Paga como prefieras",
    text: "En efectivo al llegar, o en línea con Nequi, PSE o tarjeta a través de Wompi.",
  },
];

export function Steps() {
  return (
    <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-4 py-24">
      <div className="reveal mx-auto max-w-2xl space-y-4 text-center">
        <h2 id="como-funciona" className="font-display text-4xl tracking-tight sm:text-5xl">
          Tu turno, en tres pasos
        </h2>
        <p className="text-fg-muted">
          Sin crear cuenta. Te llega un enlace privado para cambiar o cancelar la cita cuando lo
          necesites.
        </p>
      </div>
      <ol className="mt-12 grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className={`reveal flex min-h-56 flex-col justify-between gap-8 rounded-card p-6 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-1 ${
              i === 0 ? "bg-cocoa text-on-cocoa" : "border border-hairline bg-surface"
            }`}
          >
            <h3 className="font-display text-3xl tracking-tight">{step.title}</h3>
            <div className="space-y-3">
              <p className={i === 0 ? "text-sm" : "text-sm text-fg-muted"}>{step.text}</p>
              <p className={i === 0 ? "text-sm" : "text-sm text-fg-muted"}>0{i + 1}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
