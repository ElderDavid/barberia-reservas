import { pathToFileURL } from "node:url";
import { and, asc, eq } from "drizzle-orm";
import { ownerEnv } from "../src/lib/env.ts";
import { auth } from "../src/server/auth.ts";
import { db, sqlClient } from "../src/server/db/client.ts";
import { account, session, user } from "../src/server/db/schema.ts";

export type OwnerInput = { name: string; email: string; password: string };

/**
 * Creates the owner's user and credential account. If an owner already exists, brings its name,
 * email and password in line with the input, so changing OWNER_* in Vercel and redeploying is how
 * the owner's login is changed. Customer accounts (role "customer") are never touched.
 */
export async function ensureOwner(input: OwnerInput): Promise<"created" | "exists" | "updated"> {
  const ctx = await auth.$context;
  const [existing] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.role, "owner"))
    .orderBy(asc(user.createdAt))
    .limit(1);

  if (!existing) {
    const hash = await ctx.password.hash(input.password);
    const created = await ctx.adapter.create<{ id: string }>({
      model: "user",
      data: { name: input.name, email: input.email, emailVerified: true, role: "owner" },
    });
    await ctx.adapter.create({
      model: "account",
      data: { userId: created.id, accountId: created.id, providerId: "credential", password: hash },
    });
    return "created";
  }

  const [credential] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")))
    .limit(1);
  const samePassword =
    credential?.password != null &&
    (await ctx.password.verify({ hash: credential.password, password: input.password }));
  if (existing.name === input.name && existing.email === input.email && samePassword) {
    return "exists";
  }

  await db
    .update(user)
    .set({ name: input.name, email: input.email, updatedAt: new Date() })
    .where(eq(user.id, existing.id));
  if (!samePassword) {
    const hash = await ctx.password.hash(input.password);
    if (credential) {
      await db
        .update(account)
        .set({ password: hash, updatedAt: new Date() })
        .where(eq(account.id, credential.id));
    } else {
      await ctx.adapter.create({
        model: "account",
        data: {
          userId: existing.id,
          accountId: existing.id,
          providerId: "credential",
          password: hash,
        },
      });
    }
    // A new password signs out every open session.
    await db.delete(session).where(eq(session.userId, existing.id));
  }
  return "updated";
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
