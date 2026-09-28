import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Barbería", template: "%s · Barbería" },
  description: "Reserva tu cita en la barbería desde el celular.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh bg-background text-fg antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        <main id="contenido" className="mx-auto w-full max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
