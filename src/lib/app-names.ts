/** Launchers cut longer labels under the icon, so the short name stays within 12 characters. */
const SHORT_MAX = 12;

/** The installed app's names (manifest, Play Store package) from the shop's name in Ajustes. */
export function appNames(shopName: string): { name: string; shortName: string } {
  const shop = shopName.trim().replace(/\s+/g, " ") || "Barbería";
  const shortName = shop.length > SHORT_MAX ? `${shop.slice(0, SHORT_MAX).trimEnd()}…` : shop;
  return { name: `${shop} — Reservas`, shortName };
}
