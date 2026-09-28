import { beforeAll, describe, expect, it } from "vitest";
import { seed } from "../../scripts/seed.ts";
import { ownerEnv } from "../../src/lib/env.ts";
import { auth } from "../../src/server/auth.ts";
import { sql, truncateAll } from "../setup/db.ts";

describe("seed and owner auth", () => {
  beforeAll(async () => {
    await truncateAll();
    await seed();
    await seed();
  });

  it("is idempotent: one settings row and one owner", async () => {
    const [settings] = await sql<{ n: number }[]>`select count(*)::int as n from shop_settings`;
    expect(settings.n).toBe(1);
    const [owners] = await sql<{ n: number }[]>`
      select count(*)::int as n from "user" where email = ${ownerEnv().OWNER_EMAIL}
    `;
    expect(owners.n).toBe(1);
  });

  it("creates the services, barbers and expense categories", async () => {
    const serviceRows = await sql<{ name: string }[]>`select name from services`;
    expect(serviceRows.map((r) => r.name).sort()).toEqual(
      ["Barba", "Corte + barba", "Corte clásico"].sort(),
    );
    const barberRows = await sql<{ name: string }[]>`select name from barbers`;
    expect(barberRows.map((r) => r.name).sort()).toEqual(["Andrés", "Camilo"]);
    const categoryRows = await sql<{ name: string }[]>`select name from expense_categories`;
    expect(categoryRows.map((r) => r.name).sort()).toEqual(
      ["Arriendo", "Mantenimiento", "Nómina", "Otros", "Productos", "Servicios públicos"].sort(),
    );
  });

  it("signs the owner in with the right password", async () => {
    const env = ownerEnv();
    const result = await auth.api.signInEmail({
      body: { email: env.OWNER_EMAIL, password: env.OWNER_PASSWORD },
    });
    expect(result.token).toBeTruthy();
  });

  it("rejects a wrong password without creating a session", async () => {
    await sql`delete from session`;
    await expect(
      auth.api.signInEmail({
        body: { email: ownerEnv().OWNER_EMAIL, password: "clave-incorrecta-123" },
      }),
    ).rejects.toThrow();
    const [sessions] = await sql<{ n: number }[]>`select count(*)::int as n from session`;
    expect(sessions.n).toBe(0);
  });

  it("rejects sign-up because registration is disabled", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { name: "X", email: "otro@barberia.local", password: "una-clave-larga-1" },
      }),
    ).rejects.toThrow();
  });
});
