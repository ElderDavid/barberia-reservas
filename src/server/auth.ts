import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { z } from "zod";
import { authEnv } from "../lib/env.ts";
import { db } from "./db/client.ts";
import { account, session, user, verification } from "./db/schema.ts";
import { resetPasswordMail, sendMail } from "./mail.ts";
import { getShopInfo } from "./shop.ts";

const env = authEnv();

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      const link = `${env.APP_URL}/restablecer?token=${encodeURIComponent(token)}`;
      const shopName = (await getShopInfo()).name;
      await sendMail({ to: user.email, ...resetPasswordMail(user.name, link, shopName) });
    },
  },
  user: {
    additionalFields: {
      // input: false → the sign-up and update endpoints ignore it; only the owner script sets it.
      role: { type: "string", input: false, defaultValue: "customer" },
      // Stored as "57" + 10 digits; also guards /update-user against free text.
      phone: {
        type: "string",
        required: false,
        validator: { input: z.string().regex(/^57\d{10}$/) },
      },
    },
  },
  hooks: {
    // Sign-up only through /registro (signUpCustomer), which records the Ley 1581 consent.
    // Server calls carry no request, so they pass; the public HTTP endpoint is refused.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email" && ctx.request) throw new APIError("FORBIDDEN");
    }),
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  // Lets server actions (sign-up, sign-out) set the session cookie; a no-op outside a request.
  plugins: [nextCookies()],
});
