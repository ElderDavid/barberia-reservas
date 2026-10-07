import { expect, type Page, test } from "@playwright/test";

const slow = { timeout: 30_000 };

async function step(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible(slow);
}

async function register(page: Page) {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Mateo Díaz");
  await page.getByLabel("Correo").fill(`inicio-${Date.now()}@example.com`);
  await page.getByLabel("Celular").fill("3105550302");
  await page.getByLabel("Contraseña").fill("clave-cliente-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible(slow);
}

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

test("Inicio greets a signed-in customer with their next booking", async ({ page }) => {
  test.setTimeout(180_000);
  await register(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Hola, Mateo" })).toBeVisible(slow);
  await expect(page.getByText("No tienes citas próximas.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

  await book(page);
  await page.goto("/");
  await expect(page.getByText(/Corte clásico con /)).toBeVisible(slow);

  await page.setViewportSize({ width: 320, height: 640 });
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBe(clientWidth);

  await page.getByRole("link", { name: "Ver cita" }).click();
  await expect(page).toHaveURL(/\/mis-citas\/[0-9a-f-]{36}$/, slow);
});

test("Inicio has no greeting for the owner", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(process.env.OWNER_EMAIL ?? "");
  await page.getByLabel("Contraseña").fill(process.env.OWNER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible(slow);

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(slow);
  await expect(page.getByText(/^Hola, /)).toHaveCount(0);
  await expect(page.getByText("Tu próxima cita")).toHaveCount(0);
});
