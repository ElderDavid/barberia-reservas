import { z } from "zod";
import { POLICY_VERSION } from "../../lib/legal.ts";
import { auth } from "../auth.ts";
import { normalizePhone } from "../booking/create.ts";
import { db } from "../db/client.ts";
import { consents } from "../db/schema.ts";

export type SignUpInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  consent: boolean;
};
export type SignUpResult =
  | { ok: true; userId: string }
  | { ok: false; error: "invalid_input" | "email_taken" };

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().trim().toLowerCase(),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return phone;
  }),
  password: z.string().min(10).max(128),
  consent: z.literal(true),
});

/** Creates a customer account and records the privacy and terms authorizations (Ley 1581). */
export async function signUpCustomer(input: SignUpInput, now: Date): Promise<SignUpResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { name, email, phone, password } = parsed.data;
  let userId: string;
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password, phone } });
    userId = result.user.id;
  } catch (error) {
    const status = (error as { statusCode?: number; status?: string } | null)?.status;
    if (status === "UNPROCESSABLE_ENTITY" || status === "BAD_REQUEST") {
      return { ok: false, error: "email_taken" };
    }
    throw error;
  }
  await db.insert(consents).values(
    (["privacy", "terms"] as const).map((kind) => ({
      userId,
      kind,
      version: POLICY_VERSION,
      channel: "registro",
      acceptedAt: now,
    })),
  );
  return { ok: true, userId };
}
