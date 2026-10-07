import type { MetadataRoute } from "next";
import { appNames } from "@/lib/app-names";
import { getShopInfo } from "@/server/shop";

export const dynamic = "force-dynamic";

/**
 * Web app manifest. Besides installing from the browser, it is what PWABuilder / Bubblewrap read
 * to package the site as the Android app for Google Play (see docs/play-store.md). The app is
 * named after the shop (Ajustes), so the Play package picks up the real name.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { name, shortName } = appNames((await getShopInfo()).name);
  return {
    id: "/",
    name,
    short_name: shortName,
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
