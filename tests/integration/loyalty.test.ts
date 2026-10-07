import { beforeEach, describe, expect, it } from "vitest";
import { deleteAccount } from "../../src/server/accounts/delete.ts";
import { exportAccount } from "../../src/server/accounts/export.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { updateLoyaltySettings } from "../../src/server/admin/settings.ts";
import { createBooking } from "../../src/server/booking/create.ts";
import { getLoyalty, redeemReward } from "../../src/server/loyalty.ts";
import { sql, truncateAll } from "../setup/db.ts";
import { type ShopFixture, seedShop } from "../setup/fixtures.ts";

const now = new Date("2026-10-07T17:00:00Z");
let shop: ShopFixture;
let ana: string;
const OWNER = "owner-1";
let hour = 13;

async function visit(status: "completed" | "confirmed" | "no_show" = "completed", userId = ana) {
  hour += 1;
  const booked = await createBooking(
    {
      serviceId: shop.serviceId,
      barberId: shop.barberId,
      startsAt: `2026-10-12T${hour}:00:00.000Z`,
      name: "Ana",
      phone: `30012345${hour}`,
      consent: true,
      method: "cash",
      userId,
    },
    now,
  );
  if (!booked.ok) throw new Error(booked.error);
  await sql`update bookings set status = ${status} where id = ${booked.bookingId}`;
}

describe("loyalty card", () => {
  beforeEach(async () => {
    await truncateAll();
    shop = await seedShop();
    hour = 13;
    await sql`insert into "user" (id, name, email, role) values (${OWNER}, 'Dueño', 'd@example.com', 'owner')`;
    const signed = await signUpCustomer(
      {
        name: "Ana",
        email: "ana@example.com",
        phone: "3001234567",
        password: "clave-segura-1",
        consent: true,
      },
      now,
    );
    if (!signed.ok) throw new Error(signed.error);
    ana = signed.userId;
  });

  it("counts only the account's attended visits", async () => {
    await updateLoyaltySettings({ goal: 3, reward: "Corte gratis" });
    await visit();
    await visit();
    await visit("confirmed");
    await visit("no_show");
    expect(await getLoyalty(ana)).toEqual({
      goal: 3,
      reward: "Corte gratis",
      earned: 2,
      used: 0,
      available: 2,
      onCard: 2,
      full: false,
    });
  });

  it("redeems a full card once and keeps the leftover stamps", async () => {
    await updateLoyaltySettings({ goal: 2, reward: "Barba gratis" });
    await visit();
    await visit();
    await visit();
    expect((await getLoyalty(ana)).full).toBe(true);
    expect(await redeemReward({ userId: ana }, OWNER, now)).toEqual({ ok: true });
    expect(await getLoyalty(ana)).toMatchObject({ used: 2, available: 1, onCard: 1, full: false });
    expect(await redeemReward({ userId: ana }, OWNER, now)).toEqual({
      ok: false,
      error: "not_enough",
    });
    const [row] = await sql<{ redeemed_by: string; stamps_used: number }[]>`
      select redeemed_by, stamps_used from loyalty_redemptions
    `;
    expect(row).toEqual({ redeemed_by: OWNER, stamps_used: 2 });
  });

  it("redeems once when two requests arrive together", async () => {
    await updateLoyaltySettings({ goal: 2, reward: "Corte gratis" });
    await visit();
    await visit();
    const results = await Promise.all([
      redeemReward({ userId: ana }, OWNER, now),
      redeemReward({ userId: ana }, OWNER, now),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await getLoyalty(ana)).available).toBe(0);
  });

  it("is off with goal 0", async () => {
    await updateLoyaltySettings({ goal: 0, reward: "Corte gratis" });
    await visit();
    expect(await getLoyalty(ana)).toMatchObject({ goal: 0, onCard: 0, full: false });
    expect(await redeemReward({ userId: ana }, OWNER, now)).toEqual({
      ok: false,
      error: "disabled",
    });
  });

  it("shows a full card when the goal is lowered", async () => {
    await updateLoyaltySettings({ goal: 5, reward: "Corte gratis" });
    for (let i = 0; i < 4; i += 1) await visit();
    await updateLoyaltySettings({ goal: 3, reward: "Corte gratis" });
    expect(await getLoyalty(ana)).toMatchObject({ onCard: 3, full: true });
    await redeemReward({ userId: ana }, OWNER, now);
    expect(await getLoyalty(ana)).toMatchObject({ available: 1, onCard: 1 });
  });

  it("validates the settings and the redeem input", async () => {
    for (const input of [
      { goal: 31, reward: "Corte gratis" },
      { goal: -1, reward: "Corte gratis" },
      { goal: 1.5, reward: "Corte gratis" },
      { goal: 10, reward: "a".repeat(61) },
      { goal: 10, reward: "  " },
    ]) {
      expect(await updateLoyaltySettings(input)).toEqual({ ok: false, error: "invalid_input" });
    }
    expect(await redeemReward({ userId: "" }, OWNER, now)).toEqual({
      ok: false,
      error: "invalid_input",
    });
    expect(await redeemReward({ userId: "nadie" }, OWNER, now)).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("exports the stamps and forgets redemptions with the account", async () => {
    await updateLoyaltySettings({ goal: 1, reward: "Corte gratis" });
    await visit();
    await visit();
    await redeemReward({ userId: ana }, OWNER, now);
    expect((await exportAccount(ana, now))?.loyalty).toEqual({
      stamps: 1,
      redemptions: [{ stampsUsed: 1, redeemedAt: now.toISOString() }],
    });
    expect(await deleteAccount(ana, now)).toEqual({ ok: true });
    const [{ count }] = await sql<{ count: number }[]>`
      select count(*)::int from loyalty_redemptions
    `;
    expect(count).toBe(0);
  });
});
