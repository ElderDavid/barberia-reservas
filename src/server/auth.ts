import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
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
      phone: { type: "string", required: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  // Lets server actions (sign-up, sign-out) set the session cookie; a no-op outside a request.
  plugins: [nextCookies()],
});
