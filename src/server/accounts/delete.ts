import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { user } from "../db/schema.ts";

export type DeleteResult = { ok: true } | { ok: false; error: "not_found" | "owner_cannot_delete" };

/**
 * Deletes a customer's login: sessions, credentials and consent records go with it (cascade).
 * Bookings stay, because the shop's accounting needs them; they never pointed at the account.
 */
export async function deleteAccount(userId: string, _now: Date): Promise<DeleteResult> {
  const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  if (!row) return { ok: false, error: "not_found" };
  if (row.role === "owner") return { ok: false, error: "owner_cannot_delete" };
  await db.delete(user).where(eq(user.id, userId));
  return { ok: true };
}
