import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "../../src/app/api/webhooks/wompi/route.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { eventChecksum } from "../../src/server/payments/webhook.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-01T12:00:00Z");
const startsAt = "2026-10-05T15:00:00.000Z";
const secret = process.env.WOMPI_EVENTS_SECRET ?? "";
let shop: ShopFixture;

type Event = {
  event: string;
  data: {
    transaction: { id: string; status: string; reference: string; amount_in_cents: number };
  };
  signature: { properties: string[]; checksum: string };
  timestamp: number;
};

function signedEvent(reference: string, status: string, amountInCents: number): Event {
  const event: Event = {
    event: "transaction.updated",
    data: { transaction: { id: "1234-TX", status, reference, amount_in_cents: amountInCents } },
    signature: {
      properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      checksum: "",
    },
    timestamp: 1_790_000_000,
  };
  event.signature.checksum = eventChecksum(event, secret);
  return event;
}

async function post(event: unknown): Promise<number> {
  const response = await POST(
    new Request("http://localhost/api/webhooks/wompi", {
      method: "POST",
      body: JSON.stringify(event),
    }),
  );
  return response.status;
}

async function transferBooking(phone = "3005550101") {
  const result = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      startsAt,
      name: "Ana Gómez",
      phone,
      consent: true,
      method: "transfer",
    },
    now,
  );
  if (!result.ok) throw new Error(result.error);
  return { bookingId: result.bookingId, reference: `BK-${result.bookingId}` };
}

async function state(bookingId: string) {
  const [booking] = await sql<
    { status: string; deposit_status: string; cancelled_by: string | null }[]
  >`select status, deposit_status, cancelled_by from bookings where id = ${bookingId}`;
  const [payment] = await sql<{ status: string }[]>`
    select status from payments where booking_id = ${bookingId}
  `;
  const deposits = await sql<{ method: string; amount_cop: number }[]>`
    select method, amount_cop from sales where booking_id = ${bookingId} and kind = 'deposit'
  `;
  return { booking, payment, deposits };
}

describe("Wompi webhook", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("matches Wompi's published checksum example", () => {
    const example = {
      data: {
        transaction: { id: "1234-1610641025-49201", status: "APPROVED", amount_in_cents: 4490000 },
      },
      signature: {
        properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      },
      timestamp: 1530291411,
    };
    const checksum = eventChecksum(example, "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z");
    expect(checksum).toBe("5a18ec5e8fdb7df463e9f94774cba8f583ba21bd04a09ceff2ea68a4bc0aefbe");
  });

  it("rejects a bad checksum without writing", async () => {
    const { bookingId, reference } = await transferBooking();
    const event = signedEvent(reference, "APPROVED", 1_500_000);
    event.signature.checksum = "0".repeat(64);
    expect(await post(event)).toBe(400);
    expect(await state(bookingId)).toMatchObject({
      booking: { status: "held" },
      payment: { status: "PENDING" },
      deposits: [],
    });
  });

  it("confirms a held booking on APPROVED, once even if replayed", async () => {
    const { bookingId, reference } = await transferBooking();
    const event = signedEvent(reference, "APPROVED", 1_500_000);
    event.signature.checksum = event.signature.checksum.toUpperCase();
    expect(await post(event)).toBe(200);
    expect(await post(event)).toBe(200);
    expect(await state(bookingId)).toEqual({
      booking: { status: "confirmed", deposit_status: "paid", cancelled_by: null },
      payment: { status: "APPROVED" },
      deposits: [{ method: "wompi", amount_cop: 15000 }],
    });
  });

  it("releases the slot on DECLINED, VOIDED or ERROR", async () => {
    for (const [i, status] of ["DECLINED", "VOIDED", "ERROR"].entries()) {
      await truncateAll();
      shop = await seedShop();
      const { bookingId, reference } = await transferBooking(`300555010${i}`);
      expect(await post(signedEvent(reference, status, 1_500_000))).toBe(200);
      expect((await state(bookingId)).booking).toMatchObject({
        status: "cancelled",
        cancelled_by: "system",
      });
      const again = await createBooking(
        {
          serviceId: shop.serviceId,
          barberId: shop.barberId,
          startsAt,
          name: "Otra Persona",
          phone: "3115550199",
          consent: true,
          method: "cash",
        },
        now,
      );
      expect(again.ok).toBe(true);
    }
  });

  it("keeps a late payment as refund_pending when the slot was taken", async () => {
    const { bookingId, reference } = await transferBooking();
    const later = new Date("2026-10-01T12:30:00Z");
    const taken = await createBooking(
      {
        serviceId: shop.serviceId,
        barberId: shop.barberId,
        startsAt,
        name: "Otra Persona",
        phone: "3115550199",
        consent: true,
        method: "cash",
      },
      later,
    );
    expect(taken.ok).toBe(true);
    expect(await post(signedEvent(reference, "APPROVED", 1_500_000))).toBe(200);
    expect(await state(bookingId)).toEqual({
      booking: { status: "cancelled", deposit_status: "refund_pending", cancelled_by: "system" },
      payment: { status: "APPROVED" },
      deposits: [{ method: "wompi", amount_cop: 15000 }],
    });
  });
});
