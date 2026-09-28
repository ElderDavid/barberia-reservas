import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Barbería</h1>
      <p className="text-fg-muted">Reserva tu cita en minutos, desde el celular.</p>
      <Link
        href="/reservar"
        className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-medium text-primary-fg"
      >
        Reservar cita
      </Link>
    </section>
  );
}
