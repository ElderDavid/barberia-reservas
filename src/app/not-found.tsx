import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenido" className="mx-auto max-w-3xl space-y-6 px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-fg-muted">Error 404</p>
      <h1 className="font-display text-5xl tracking-tight">Esta página no existe</h1>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
