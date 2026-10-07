import { and, eq, gt, like } from "drizzle-orm";
import { z } from "zod";
import { mailEnv } from "../../lib/env.ts";
import { auth } from "../auth.ts";
import { db } from "../db/client.ts";
import { user, verification } from "../db/schema.ts";

export type ResetRequestResult = { ok: true } | { ok: false; error: "mail_disabled" };

const MINUTE_MS = 60_000;

/** Whether this account already got a reset mail in the last minute, or three in the last hour. */
async function throttled(email: string, now: Date): Promise<boolean> {
  const [account] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!account) return false;
  const recent = await db
    .select({ createdAt: verification.createdAt })
    .from(verification)
    .where(
      and(
        eq(verification.value, account.id),
        like(verification.identifier, "reset-password:%"),
        gt(verification.createdAt, new Date(now.getTime() - 60 * MINUTE_MS)),
      ),
    );
  return (
    recent.length >= 3 || recent.some((r) => r.createdAt.getTime() > now.getTime() - MINUTE_MS)
  );
}

/**
 * Asks better-auth to mail a reset link. The answer is the same whether or not the email has an
 * account, or the request was throttled, so nobody can use this form to find out who is
 * registered or to flood someone's inbox.
 */
export async function requestPasswordReset(email: string, now: Date): Promise<ResetRequestResult> {
  if (!mailEnv()) return { ok: false, error: "mail_disabled" };
  const normalized = email.trim().toLowerCase();
  try {
    if (await throttled(normalized, now)) return { ok: true };
    await auth.api.requestPasswordReset({
      body: { email: normalized, redirectTo: "/restablecer" },
    });
  } catch {
    // Invalid email format or a delivery error: same neutral answer.
  }
  return { ok: true };
}

export type ResetResult = { ok: true } | { ok: false; error: "invalid_input" | "invalid_token" };

const resetSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(10).max(128),
});

/** Sets a new password from a mailed link; every open session of that account is closed. */
export async function resetPasswordWithToken(
  token: string,
  password: string,
): Promise<ResetResult> {
  const parsed = resetSchema.safeParse({ token, password });
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  try {
    await auth.api.resetPassword({
      body: { token: parsed.data.token, newPassword: parsed.data.password },
    });
  } catch {
    return { ok: false, error: "invalid_token" };
  }
  return { ok: true };
}
