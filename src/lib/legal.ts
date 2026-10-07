/** Version of the privacy policy and terms; bump it when their text changes so users re-accept. */
export const POLICY_VERSION = "2026-10-07";

/** Shown as the date the current texts took effect. */
export const POLICY_DATE_LABEL = "7 de octubre de 2026";

export type LegalInfo = {
  shopName: string;
  address: string;
  whatsappPhone: string;
  legalName: string;
  legalIdType: "CC" | "NIT" | "";
  legalIdNumber: string;
  privacyEmail: string;
  cancelCutoffHours: number;
};

/** Companies that process personal data on the shop's behalf (encargados, Ley 1581). */
export const LEGAL_PROCESSORS = [
  { name: "Supabase", purpose: "guarda la base de datos", country: "Estados Unidos" },
  { name: "Vercel", purpose: "aloja la página y la app", country: "Estados Unidos" },
  { name: "Wompi (Bancolombia)", purpose: "procesa los pagos en línea", country: "Colombia" },
  { name: "Resend", purpose: "envía los correos de la cuenta", country: "Estados Unidos" },
] as const;

/** Names of the responsible-party fields still empty; the legal pages and the panel flag them. */
export function legalGaps(info: LegalInfo): string[] {
  const gaps: string[] = [];
  if (!info.legalName) gaps.push("nombre del responsable");
  if (!info.legalIdType) gaps.push("tipo de documento");
  if (!info.legalIdNumber) gaps.push("número de documento");
  if (!info.privacyEmail) gaps.push("correo para datos personales");
  return gaps;
}
