import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client.ts";
import { bookings, loyaltyRedemptions, shopSettings, user } from "./db/schema.ts";

export type Loyalty = {
  /** Stamps for the reward; 0 means the loyalty card is off. */
  goal: number;
  reward: string;
  /** Attended visits of the account. */
  earned: number;
  /** Stamps already spent on rewards. */
  used: number;
  available: number;
  /** Stamps to draw on the current card (never more than `goal`). */
  onCard: number;
  full: boolean;
};

export type RedeemResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "not_found" | "disabled" | "not_enough" };

type Reader = Pick<typeof db, "select">;

const redeemSchema = z.object({ userId: z.string().min(1).max(64) });

async function settings(tx: Reader): Promise<{ goal: number; reward: string }> {
  const [row] = await tx
    .select({ goal: shopSettings.loyaltyGoal, reward: shopSettings.loyaltyReward })
    .from(shopSettings)
    .where(eq(shopSettings.id, 1));
  return row ?? { goal: 10, reward: "Un corte gratis" };
}

async function stamps(tx: Reader, userId: string): Promise<{ earned: number; used: number }> {
  const [earned] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.userId, userId), eq(bookings.status, "completed")));
  const [used] = await tx
    .select({ n: sql<number>`coalesce(sum(${loyaltyRedemptions.stampsUsed}), 0)::int` })
    .from(loyaltyRedemptions)
    .where(eq(loyaltyRedemptions.userId, userId));
  return { earned: earned.n, used: used.n };
}

function card(goal: number, reward: string, earned: number, used: number): Loyalty {
  const available = Math.max(earned - used, 0);
  return {
    goal,
    reward,
    earned,
    used,
    available,
    onCard: goal > 0 ? Math.min(available, goal) : 0,
    full: goal > 0 && available >= goal,
  };
}

/** The account's loyalty card: every attended visit is a stamp until a reward spends them. */
export async function getLoyalty(userId: string): Promise<Loyalty> {
  const [{ goal, reward }, { earned, used }] = await Promise.all([
    settings(db),
    stamps(db, userId),
  ]);
  return card(goal, reward, earned, used);
}

/**
 * The owner hands over the reward: one full card of stamps is spent and the leftovers stay.
 * The customer's row is locked so a double submit cannot spend the same stamps twice.
 */
export async function redeemReward(
  input: unknown,
  ownerId: string,
  now: Date,
): Promise<RedeemResult> {
  const parsed = redeemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { userId } = parsed.data;
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.id, userId), eq(user.role, "customer")))
      .for("update");
    if (!customer) return { ok: false, error: "not_found" } as const;
    const { goal, reward } = await settings(tx);
    if (goal === 0) return { ok: false, error: "disabled" } as const;
    const { earned, used } = await stamps(tx, userId);
    if (!card(goal, reward, earned, used).full) return { ok: false, error: "not_enough" } as const;
    await tx
      .insert(loyaltyRedemptions)
      .values({ userId, stampsUsed: goal, redeemedAt: now, redeemedBy: ownerId });
    return { ok: true } as const;
  });
}
