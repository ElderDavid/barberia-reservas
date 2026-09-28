import { beforeEach, describe, expect, it } from "vitest";
import { type CreateBookingInput, createBooking } from "../../src/server/booking/create.ts";
import { checkoutUrl, depositFor, integritySignature } from "../../src/server/payments/wompi.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-01T12:00:00Z");
const startsAt = "2026-10-05T15:00:00.000Z";
let shop: ShopFixture;

function request(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    serviceId: shop.serviceId,
    barberId: shop.barberId,
    startsAt,
    name: "Ana Gómez",
    phone: "3005550101",
    consent: true,
    method: "transfer",
    ...overrides,
  };
}

describe("Wompi checkout", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("matches Wompi's published integrity example", () => {
    expect(
      integritySignature({
        reference: "sk8-438k4-xmxm392-sn2m2",
        amountInCents: 490000,
        currency: "COP",
        secret: "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6",
      }),
    ).toBe("37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5");
  });

  it("computes the deposit", () => {
    expect(depositFor(25000, 100)).toBe(25000);
    expect(depositFor(25000, 30)).toBe(8000);
    expect(depositFor(10000, 99)).toBe(10000);
  });

  it("holds a transfer booking and creates a pending payment", async () => {
    const result = await createBooking(request(), now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [booking] = await sql<
      { status: string; hold_expires_at: Date; deposit_status: string; deposit_cop: number }[]
    >`select status, hold_expires_at, deposit_status, deposit_cop from bookings
      where id = ${result.bookingId}`;
    expect(booking.status).toBe("held");
    expect(booking.hold_expires_at.toISOString()).toBe("2026-10-01T12:15:00.000Z");
    expect(booking.deposit_status).toBe("pending");
    expect(booking.deposit_cop).toBe(15000);
    const [payment] = await sql<{ reference: string; status: string; amount_cop: number }[]>`
      select reference, status, amount_cop from payments where booking_id = ${result.bookingId}
    `;
    expect(payment).toEqual({
      reference: `BK-${result.bookingId}`,
      status: "PENDING",
      amount_cop: 15000,
    });
  });

  it("releases an expired hold and books the slot", async () => {
    const held = await createBooking(request(), now);
    if (!held.ok) throw new Error(held.error);
    const later = new Date("2026-10-01T12:20:00Z");
    const cash = await createBooking(request({ method: "cash", phone: "3005550102" }), later);
    expect(cash.ok).toBe(true);
    const [old] = await sql<{ status: string; cancelled_by: string }[]>`
      select status, cancelled_by from bookings where id = ${held.bookingId}
    `;
    expect(old).toEqual({ status: "cancelled", cancelled_by: "system" });
  });

  it("builds a signed checkout URL", () => {
    const expiresAt = new Date("2026-10-01T12:15:00.000Z");
    const url = new URL(
      checkoutUrl({
        reference: "BK-123",
        amountCop: 15000,
        expiresAt,
        redirectUrl: "http://localhost:3000/cita/abc",
      }),
    );
    expect(`${url.origin}${url.pathname}`).toBe("https://checkout.wompi.co/p/");
    const p = url.searchParams;
    expect(p.get("public-key")).toBe(process.env.WOMPI_PUBLIC_KEY);
    expect(p.get("currency")).toBe("COP");
    expect(p.get("amount-in-cents")).toBe("1500000");
    expect(p.get("reference")).toBe("BK-123");
    expect(p.get("redirect-url")).toBe("http://localhost:3000/cita/abc");
    expect(p.get("expiration-time")).toBe(expiresAt.toISOString());
    expect(p.get("signature:integrity")).toBe(
      integritySignature({
        reference: "BK-123",
        amountInCents: 1500000,
        currency: "COP",
        expirationTime: expiresAt.toISOString(),
        secret: process.env.WOMPI_INTEGRITY_SECRET ?? "",
      }),
    );
  });
});
