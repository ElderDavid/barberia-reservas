import { pathToFileURL } from "node:url";
import { eq } from "drizzle-orm";
import { ownerEnv } from "../src/lib/env.ts";
import { auth } from "../src/server/auth.ts";
import { db, sqlClient } from "../src/server/db/client.ts";
import { user } from "../src/server/db/schema.ts";

export type OwnerInput = { name: string; email: string; password: string };

/** Creates the owner's user and credential account unless a user with that email exists. */
export async function ensureOwner(input: OwnerInput): Promise<"created" | "exists"> {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);
  if (existing.length > 0) return "exists";

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(input.password);
  const created = await ctx.adapter.create<{ id: string }>({
    model: "user",
    data: { name: input.name, email: input.email, emailVerified: true },
  });
  await ctx.adapter.create({
    model: "account",
    data: { userId: created.id, accountId: created.id, providerId: "credential", password: hash },
  });
  return "created";
}

// True only when run as `node scripts/create-owner.ts`; false when imported by tests.
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const env = ownerEnv();
  const result = await ensureOwner({
    name: env.OWNER_NAME,
    email: env.OWNER_EMAIL,
    password: env.OWNER_PASSWORD,
  });
  console.log(`owner: ${result}`);
  await sqlClient.end();
}
