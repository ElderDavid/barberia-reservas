import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth.ts";
import { normalizePhone } from "../booking/create.ts";
import { db } from "../db/client.ts";
import { user } from "../db/schema.ts";

export type ProfileResult = { ok: true } | { ok: false; error: "invalid_input" | "not_found" };
export type PasswordResult =
  | { ok: true }
  | { ok: false; error: "invalid_input" | "wrong_password" };

const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return phone;
  }),
});

/** Name and phone are the only profile fields a customer edits; the email is their login. */
export async function updateProfile(
  userId: string,
  input: { name: string; phone: string },
  now: Date,
): Promise<ProfileResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const updated = await db
    .update(user)
    .set({ ...parsed.data, updatedAt: now })
    .where(eq(user.id, userId))
    .returning({ id: user.id });
  return updated.length > 0 ? { ok: true } : { ok: false, error: "not_found" };
}

const passwordSchema = z.object({
  current: z.string().min(1).max(128),
  next: z.string().min(10).max(128),
});

/** Changes the signed-in user's password and closes their other sessions. */
export async function changePassword(
  requestHeaders: Headers,
  input: { current: string; next: string },
): Promise<PasswordResult> {
  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  try {
    await auth.api.changePassword({
      headers: requestHeaders,
      body: {
        currentPassword: parsed.data.current,
        newPassword: parsed.data.next,
        revokeOtherSessions: true,
      },
    });
  } catch {
    return { ok: false, error: "wrong_password" };
  }
  return { ok: true };
}

/** What the Cuenta screen shows about the signed-in customer. */
export async function getProfile(userId: string) {
  const [row] = await db
    .select({ name: user.name, email: user.email, phone: user.phone, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId));
  return row ?? null;
}
