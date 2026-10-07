import { asc, eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { consents, user } from "../db/schema.ts";

export type AccountExport = {
  exportedAt: string;
  profile: { name: string; email: string; phone: string | null; createdAt: string };
  consents: { kind: string; version: string; channel: string; acceptedAt: string }[];
  bookings: never[];
};

/** Everything stored about one customer, for the "download my data" right (Ley 1581, art. 8). */
export async function exportAccount(userId: string, now: Date): Promise<AccountExport | null> {
  const [profile] = await db
    .select({ name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId));
  if (!profile) return null;
  const rows = await db
    .select({
      kind: consents.kind,
      version: consents.version,
      channel: consents.channel,
      acceptedAt: consents.acceptedAt,
    })
    .from(consents)
    .where(eq(consents.userId, userId))
    .orderBy(asc(consents.acceptedAt));
  return {
    exportedAt: now.toISOString(),
    profile: { ...profile, createdAt: profile.createdAt.toISOString() },
    consents: rows.map((r) => ({ ...r, acceptedAt: r.acceptedAt.toISOString() })),
    bookings: [],
  };
}
