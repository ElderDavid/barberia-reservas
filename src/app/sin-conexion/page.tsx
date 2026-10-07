import type { Metadata } from "next";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Sin conexión" };

/** Static page the service worker shows when the app is opened without internet. */
export default function SinConexionPage() {
  return (
    <main
      id="contenido"
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ink px-6 text-center text-on-ink"
    >
      <Icon name="wifiOff" className="size-12" />
      <h1 className="font-display text-4xl tracking-tight">Sin conexión</h1>
      <p className="max-w-sm text-on-ink-muted">
        Para ver los horarios libres y reservar necesitas internet. Revisa tu conexión e inténtalo
        de nuevo.
      </p>
      <a
        href="/"
        className="inline-flex min-h-11 items-center rounded-control bg-on-ink px-5 font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-ink"
      >
        Reintentar
      </a>
    </main>
  );
}
