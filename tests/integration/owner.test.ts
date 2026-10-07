import { beforeEach, describe, expect, it } from "vitest";
import { ensureOwner } from "../../scripts/create-owner.ts";
import { signUpCustomer } from "../../src/server/accounts/sign-up.ts";
import { auth } from "../../src/server/auth.ts";
import { sql, truncateAll } from "../setup/db.ts";

const first = { name: "Dueño", email: "dueno@example.com", password: "primera-clave-1" };

async function signIn(email: string, password: string): Promise<boolean> {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return true;
  } catch {
    return false;
  }
}

describe("owner account sync", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("creates the owner once and then leaves it alone", async () => {
    expect(await ensureOwner(first)).toBe("created");
    expect(await ensureOwner(first)).toBe("exists");
    const [users] = await sql<{ n: number }[]>`select count(*)::int as n from "user"`;
    expect(users.n).toBe(1);
  });

  it("changes the owner's name, email and password in place", async () => {
    await ensureOwner(first);
    const changed = {
      name: "BarberStore",
      email: "nuevo@example.com",
      password: "segunda-clave-2",
    };
    expect(await ensureOwner(changed)).toBe("updated");

    const rows = await sql<{ name: string; email: string }[]>`select name, email from "user"`;
    expect(rows).toEqual([{ name: "BarberStore", email: "nuevo@example.com" }]);
    expect(await signIn(changed.email, changed.password)).toBe(true);
    expect(await signIn(first.email, first.password)).toBe(false);
    expect(await signIn(changed.email, first.password)).toBe(false);
  });

  it("leaves customers alone", async () => {
    const customer = {
      name: "Ana",
      email: "ana@example.com",
      phone: "3001234567",
      password: "clave-de-ana-1",
      consent: true as const,
    };
    await signUpCustomer(customer, new Date("2026-10-07T17:00:00Z"));
    expect(await ensureOwner(first)).toBe("created");
    expect(await ensureOwner({ ...first, name: "BarberStore" })).toBe("updated");
    const rows = await sql<{ name: string; role: string }[]>`
      select name, role from "user" order by role
    `;
    expect(rows).toEqual([
      { name: "Ana", role: "customer" },
      { name: "BarberStore", role: "owner" },
    ]);
    expect(await signIn(customer.email, customer.password)).toBe(true);
  });
});
