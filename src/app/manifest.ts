import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Barbería — Reservas",
    short_name: "Barbería",
    description: "Reserva tu cita en la barbería desde el celular.",
    start_url: "/",
    display: "standalone",
    lang: "es-CO",
    background_color: "#0e0e10",
    theme_color: "#0e0e10",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
