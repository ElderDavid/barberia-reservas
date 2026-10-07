import { asc, eq } from "drizzle-orm";
import type { LegalInfo } from "../lib/legal.ts";
import { db } from "./db/client.ts";
import { barbers, services, shopSettings } from "./db/schema.ts";

export type ShopInfo = {
  name: string;
  address: string;
  whatsappPhone: string;
};

export type PublicShop = ShopInfo & {
  services: { id: string; name: string; durationMinutes: number; priceCop: number }[];
  barbers: { id: string; name: string }[];
};

/** The shop's public identity, used on the home and privacy pages. */
export async function getShopInfo(): Promise<ShopInfo> {
  const [row] = await db
    .select({
      name: shopSettings.name,
      address: shopSettings.address,
      whatsappPhone: shopSettings.whatsappPhone,
    })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  return row ?? { name: "Barbería", address: "", whatsappPhone: "" };
}

/** Shop identity plus active services and barbers in display order, for the public home page. */
export async function getPublicShop(): Promise<PublicShop> {
  const info = await getShopInfo();
  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      durationMinutes: services.durationMinutes,
      priceCop: services.priceCop,
    })
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder), asc(services.name));
  const barberRows = await db
    .select({ id: barbers.id, name: barbers.name })
    .from(barbers)
    .where(eq(barbers.active, true))
    .orderBy(asc(barbers.sortOrder), asc(barbers.name));
  return { ...info, services: serviceRows, barbers: barberRows };
}

/** WhatsApp click-to-chat link; wa.me wants digits only, with country code. */
export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

/** Shop identity plus the responsible party's data, for /privacidad, /terminos and the panel. */
export async function getLegalInfo(): Promise<LegalInfo> {
  const [row] = await db
    .select({
      shopName: shopSettings.name,
      address: shopSettings.address,
      whatsappPhone: shopSettings.whatsappPhone,
      legalName: shopSettings.legalName,
      legalIdType: shopSettings.legalIdType,
      legalIdNumber: shopSettings.legalIdNumber,
      privacyEmail: shopSettings.privacyEmail,
      cancelCutoffHours: shopSettings.selfServiceCutoffHours,
    })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  if (!row) {
    return {
      shopName: "Barbería",
      address: "",
      whatsappPhone: "",
      legalName: "",
      legalIdType: "",
      legalIdNumber: "",
      privacyEmail: "",
      cancelCutoffHours: 4,
    };
  }
  const idType = row.legalIdType === "CC" || row.legalIdType === "NIT" ? row.legalIdType : "";
  return { ...row, legalIdType: idType };
}
