import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Barbería", template: "%s · Barbería" },
  description: "Reserva tu cita en la barbería desde el celular.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f1ed" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d0b" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO" className={serif.variable}>
      <body className="min-h-dvh bg-background text-fg antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-control focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
