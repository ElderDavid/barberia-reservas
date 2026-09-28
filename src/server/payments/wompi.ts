import { createHash } from "node:crypto";
import { wompiEnv } from "../../lib/env.ts";

const CHECKOUT_URL = "https://checkout.wompi.co/p/";

/** Wompi integrity signature: SHA-256 hex of reference + cents + currency + expiration + secret. */
export function integritySignature(input: {
  reference: string;
  amountInCents: number;
  currency: string;
  expirationTime?: string;
  secret: string;
}): string {
  return createHash("sha256")
    .update(
      `${input.reference}${input.amountInCents}${input.currency}${input.expirationTime ?? ""}${input.secret}`,
    )
    .digest("hex");
}

/** Online deposit in COP: the full price at 100 %, else the percentage rounded up to the thousand. */
export function depositFor(priceCop: number, depositPercent: number): number {
  if (depositPercent >= 100) return priceCop;
  return Math.min(priceCop, Math.ceil((priceCop * depositPercent) / 100 / 1000) * 1000);
}

/** Hosted Web Checkout link for a held booking's deposit. */
export function checkoutUrl(input: {
  reference: string;
  amountCop: number;
  expiresAt: Date;
  redirectUrl: string;
}): string {
  const env = wompiEnv();
  const amountInCents = input.amountCop * 100;
  const expirationTime = input.expiresAt.toISOString();
  const params = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    currency: "COP",
    "amount-in-cents": String(amountInCents),
    reference: input.reference,
    "signature:integrity": integritySignature({
      reference: input.reference,
      amountInCents,
      currency: "COP",
      expirationTime,
      secret: env.WOMPI_INTEGRITY_SECRET,
    }),
    "redirect-url": input.redirectUrl,
    "expiration-time": expirationTime,
  });
  return `${CHECKOUT_URL}?${params.toString()}`;
}
