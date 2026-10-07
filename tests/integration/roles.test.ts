import { beforeEach, describe, expect, it } from "vitest";
import { POLICY_VERSION } from "../../src/lib/legal.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { auth } from "../../src/server/auth.ts";
import { sql, truncateAll } from "../setup/db.ts";

const now = new Date("2026-10-07T17:00:00Z");
const ana = {
  name: "Ana Gómez",
  email: "ana@example.com",
  phone: "300 123 4567",
  password: "clave-de-ana-1",
  consent: true as const,
};

describe("customer accounts and roles", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("ignores a role sent to the sign-up endpoint", async () => {
    await auth.api.signUpEmail({
      body: {
        name: "Intruso",
        email: "intruso@example.com",
        password: "clave-intruso-1",
        role: "owner",
      } as never,
    });
    const [row] = await sql<
      { role: string }[]
    >`select role from "user" where email = 'intruso@example.com'`;
    expect(row.role).toBe("customer");
  });

  it("signs up a customer with a normalized phone and both consents", async () => {
    const result = await signUpCustomer(ana, now);
    expect(result.ok).toBe(true);
    const [row] = await sql<{ role: string; phone: string }[]>`
      select role, phone from "user" where email = ${ana.email}
    `;
    expect(row).toEqual({ role: "customer", phone: "573001234567" });
    const consents = await sql<{ kind: string; version: string; channel: string }[]>`
      select kind, version, channel from consents order by kind
    `;
    expect(consents).toEqual([
      { kind: "privacy", version: POLICY_VERSION, channel: "registro" },
      { kind: "terms", version: POLICY_VERSION, channel: "registro" },
    ]);
  });

  it("rejects a repeated email and a bad phone", async () => {
    await signUpCustomer(ana, now);
    expect(await signUpCustomer({ ...ana, phone: "300 999 8888" }, now)).toEqual({
      ok: false,
      error: "email_taken",
    });
    expect(
      await signUpCustomer({ ...ana, email: "otra@example.com", phone: "12345" }, now),
    ).toEqual({
      ok: false,
      error: "invalid_input",
    });
  });
});
