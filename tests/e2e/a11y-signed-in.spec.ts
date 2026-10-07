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

async function step(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible(slow);
}

/** Books the first free time from tomorrow, paying in cash. */
async function book(page: Page) {
  await page.goto("/reservar");
  await page.getByRole("link", { name: /Corte clásico/ }).click();
  await step(page, "Elige el barbero");
  await page.getByRole("link", { name: "Cualquiera" }).click();
  await step(page, "Elige el día");
  const days = await page.locator("main li a").count();
  for (let i = 1; i < days; i += 1) {
    await page.locator("main li a").nth(i).click();
    await step(page, "Elige la hora");
    if ((await page.getByText("No hay horarios disponibles este día.").count()) === 0) break;
    await page.goBack();
    await step(page, "Elige el día");
  }
  await page.locator("main li a").first().click();
  await step(page, "Tus datos");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cita confirmada" })).toBeVisible(slow);
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

  await book(page);
  await page.goto("/");
  const booking = (await page.getByRole("link", { name: "Ver cita" }).getAttribute("href")) ?? "";
  expect(booking).toMatch(/^\/mis-citas\/[0-9a-f-]{36}$/);

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of [
      "/",
      "/cuenta",
      "/mis-citas",
      "/mis-citas?pestana=pasadas",
      booking,
      "/reservar",
    ]) {
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
  await expect(client).toBeVisible(slow);
  await check(page, (await client.getAttribute("href")) ?? "");
});
