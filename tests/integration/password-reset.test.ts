import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from "../../src/server/accounts/password-reset.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { auth } from "../../src/server/auth.ts";
import { sql, truncateAll } from "../setup/db.ts";

const now = new Date("2026-10-07T17:00:00Z");
const ana = {
  name: "Ana",
  email: "ana@example.com",
  phone: "3001234567",
  password: "clave-de-ana-1",
  consent: true,
};

describe("password reset", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  beforeEach(async () => {
    await truncateAll();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "x@example.com");
  });

  it("sends nothing for an unknown email but answers the same", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchImpl);
    expect(await requestPasswordReset("nadie@example.com", now)).toEqual({ ok: true });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("mails a link that sets a new password and closes the sessions", async () => {
    await signUpCustomer(ana, now);
    await auth.api.signInEmail({ body: { email: ana.email, password: ana.password } });
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchImpl);
    expect(await requestPasswordReset(ana.email, now)).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    const token = /\/restablecer\?token=([\w-]+)/.exec(body.text)?.[1];
    expect(token).toBeTruthy();
    await auth.api.resetPassword({
      body: { token: token as string, newPassword: "clave-nueva-123" },
    });
    const [sessions] = await sql<{ n: number }[]>`select count(*)::int as n from session`;
    expect(sessions.n).toBe(0);
    await expect(
      auth.api.signInEmail({ body: { email: ana.email, password: "clave-nueva-123" } }),
    ).resolves.toBeTruthy();
  });

  it("rejects an unknown token and a short password without changing anything", async () => {
    await signUpCustomer(ana, now);
    expect(await resetPasswordWithToken("token-falso", "clave-nueva-123")).toEqual({
      ok: false,
      error: "invalid_token",
    });
    expect(await resetPasswordWithToken("token-falso", "corta")).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });

  it("sends at most one mail per minute and three per hour to the same account", async () => {
    await signUpCustomer(ana, now);
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchImpl);
    const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000);
    for (const minute of [0, 0.5, 2, 4, 6]) {
      expect(await requestPasswordReset(ana.email, at(minute))).toEqual({ ok: true });
      // better-auth stamps rows with the real clock; move the new one to the simulated time.
      await sql`update verification set created_at = ${at(minute)} where created_at > ${at(10)}`;
    }
    expect(fetchImpl).toHaveBeenCalledTimes(3); // minutes 0, 2 and 4
  });

  it("is unavailable without a mail key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    expect(await requestPasswordReset(ana.email, now)).toEqual({
      ok: false,
      error: "mail_disabled",
    });
  });
});
