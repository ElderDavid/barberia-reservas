import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const slow = { timeout: 30_000 };

async function check(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(slow);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations.map((v) => ({ path, id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
}

test("signed-in customer screens have no WCAG 2.2 AA violations", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Lucía Gómez");
  await page.getByLabel("Correo").fill(`a11y-${Date.now()}@example.com`);
  await page.getByLabel("Celular").fill("3105550303");
  await page.getByLabel("Contraseña").fill("clave-cliente-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible(slow);

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of ["/", "/cuenta", "/mis-citas", "/mis-citas?pestana=pasadas", "/reservar"]) {
      await check(page, path);
    }
  }
});

test("owner screens have no WCAG 2.2 AA violations", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(process.env.OWNER_EMAIL ?? "");
  await page.getByLabel("Contraseña").fill(process.env.OWNER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible(slow);

  for (const path of [
    "/admin",
    "/admin/ventas",
    "/admin/gastos",
    "/admin/resumen",
    "/admin/clientes",
    "/admin/opiniones",
    "/admin/ajustes",
  ]) {
    await check(page, path);
  }
  await page.goto("/admin/clientes");
  const client = page.locator("main a[href^='/admin/clientes/']").first();
  if ((await client.count()) > 0) {
    await check(page, (await client.getAttribute("href")) ?? "/admin/clientes");
  }
});
