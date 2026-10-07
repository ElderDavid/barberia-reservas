import type { MetadataRoute } from "next";

/**
 * Web app manifest. Besides installing from the browser, it is what PWABuilder / Bubblewrap read
 * to package the site as the Android app for Google Play (see docs/play-store.md).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Barbería — Reservas",
    short_name: "Barbería",
    description: "Reserva tu cita en la barbería desde el celular.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-CO",
    dir: "ltr",
    categories: ["lifestyle", "business"],
    background_color: "#0b0a08",
    theme_color: "#0b0a08",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Reservar cita", short_name: "Reservar", url: "/reservar" },
      { name: "Mis citas", url: "/mis-citas" },
    ],
  };
}
