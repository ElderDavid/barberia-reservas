import { z } from "zod";
import { mailEnv } from "../../lib/env.ts";
import { auth } from "../auth.ts";

export type ResetRequestResult = { ok: true } | { ok: false; error: "mail_disabled" };

/**
 * Asks better-auth to mail a reset link. The answer is the same whether or not the email has an
 * account, so nobody can use this form to find out who is registered.
 */
export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  if (!mailEnv()) return { ok: false, error: "mail_disabled" };
  try {
    await auth.api.requestPasswordReset({
      body: { email: email.trim().toLowerCase(), redirectTo: "/restablecer" },
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
