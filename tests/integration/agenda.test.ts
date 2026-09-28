import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { getAgenda } from "../../src/server/admin/agenda.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { ownerCancel, ownerReschedule } from "../../src/server/booking/manage.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const bookedAt = new Date("2026-10-01T12:00:00Z");
const late = new Date("2026-10-05T14:30:00Z"); // 30 min before the 10:00 appointment
let shop: ShopFixture;

async function book(startsAt: string, barberId: string, phone: string, name = "Cliente") {
  const result = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId,
      startsAt,
      name,
      phone,
      consent: true,
      method: "cash",
    },
    bookedAt,
  );
  if (!result.ok) throw new Error(result.error);
  return result.bookingId;
}

describe("owner agenda", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
  });

  it("groups the day's bookings by barber in sort order", async () => {
    await book("2026-10-05T16:00:00.000Z", shop.barberId, "3005550101", "Beto");
    await book("2026-10-05T15:00:00.000Z", shop.barberId, "3005550102", "Ana");
    await book("2026-10-05T15:00:00.000Z", shop.barber2Id, "3005550103", "Carlos");
    const cancelled = await book("2026-10-05T17:00:00.000Z", shop.barberId, "3005550104");
    await sql`update bookings set status = 'cancelled' where id = ${cancelled}`;
    await book("2026-10-06T15:00:00.000Z", shop.barberId, "3005550105"); // next day

    const agenda = await getAgenda("2026-10-05");
    expect(agenda.groups.map((g) => g.barberName)).toEqual(["Andrés", "Camilo"]);
    expect(agenda.groups[0].items.map((i) => i.customerName)).toEqual(["Ana", "Beto"]);
    expect(agenda.groups[0].items[0]).toMatchObject({
      customerPhone: "573005550102",
      serviceName: "Corte clásico",
      status: "confirmed",
    });
    expect(agenda.groups[1].items.map((i) => i.customerName)).toEqual(["Carlos"]);
  });

  it("lets the owner reschedule past the cutoff and outside hours, but not over a booking", async () => {
    const id = await book("2026-10-05T15:00:00.000Z", shop.barberId, "3005550101");
    await book("2026-10-05T16:00:00.000Z", shop.barber2Id, "3005550102");

    expect(
      await ownerReschedule({
        bookingId: id,
        newStartsAt: new Date("2026-10-05T16:00:00Z"),
        newBarberId: shop.barber2Id,
        now: late,
      }),
    ).toEqual({ ok: false, error: "slot_taken" });

    const moved = await ownerReschedule({
      bookingId: id,
      newStartsAt: new Date("2026-10-06T01:00:00Z"), // 20:00 local, after closing
      newBarberId: shop.barber2Id,
      now: late,
    });
    expect(moved.ok).toBe(true);
    const [row] = await sql<{ barber_id: string }[]>`
      select barber_id from bookings where rescheduled_from_id = ${id}
    `;
    expect(row.barber_id).toBe(shop.barber2Id);
  });

  it("refunds or forfeits a paid deposit when the owner cancels", async () => {
    const refund = await book("2026-10-05T15:00:00.000Z", shop.barberId, "3005550101");
    const forfeit = await book("2026-10-05T16:00:00.000Z", shop.barberId, "3005550102");
    await sql`update bookings set deposit_status = 'paid', deposit_cop = 15000
      where id in ${sql([refund, forfeit])}`;

    await ownerCancel({ bookingId: refund, depositDecision: "refund", now: late });
    await ownerCancel({ bookingId: forfeit, depositDecision: "forfeit", now: late });
    const rows = await sql<{ id: string; deposit_status: string; cancelled_by: string }[]>`
      select id, deposit_status, cancelled_by from bookings where id in ${sql([refund, forfeit])}
    `;
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId[refund]).toMatchObject({ deposit_status: "refund_pending", cancelled_by: "owner" });
    expect(byId[forfeit]).toMatchObject({ deposit_status: "forfeited", cancelled_by: "owner" });
  });

  it("guards every admin server action with requireOwner()", () => {
    const source = readFileSync("src/app/admin/actions.ts", "utf8");
    const bodies = [...source.matchAll(/export async function \w+\([^)]*\)[^{]*\{\s*([^;]*;)/g)];
    expect(bodies.length).toBeGreaterThan(0);
    for (const [, first] of bodies) expect(first.trim()).toBe("await requireOwner();");
  });
});
