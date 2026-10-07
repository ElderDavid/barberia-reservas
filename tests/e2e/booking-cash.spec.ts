import { expect, type Page, test } from "@playwright/test";

// The dev server compiles each route on first visit, so steps get generous timeouts.
const slow = { timeout: 30_000 };

async function heading(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible(slow);
}

test("customer books in cash and cancels from the booking page", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/reservar");
  await page.getByRole("link", { name: /Corte clásico/ }).click();
  await heading(page, "Elige el barbero");
  await page.getByRole("link", { name: "Cualquiera" }).click();
  await heading(page, "Elige el día");

  // First day from tomorrow on that offers times: a slot later today could already be inside
  // the self-service cutoff, and then the booking page would not offer "Cancelar cita".
  const dayCount = await page.locator("main li a").count();
  for (let i = 1; i < dayCount; i += 1) {
    await page.locator("main li a").nth(i).click();
    await heading(page, "Elige la hora");
    if ((await page.getByText("No hay horarios disponibles este día.").count()) === 0) break;
    await page.goBack();
    await heading(page, "Elige el día");
  }
  await page.locator("main li a").first().click();
  await heading(page, "Tus datos");

  await page.getByLabel("Nombre", { exact: true }).fill("Juan Pérez");
  await page.getByLabel("Celular", { exact: true }).fill("3001234567");
  await page.getByRole("checkbox").check();
  await expect(page.getByLabel("Efectivo en la barbería")).toBeChecked();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(page).toHaveURL(/\/cita\/[A-Za-z0-9_-]+$/, slow);
  await expect(page.getByRole("heading", { level: 1, name: "Cita confirmada" })).toBeVisible(slow);

  // The phone remembers the booking, so "Mis citas" in the tab bar lists it.
  await page
    .getByRole("navigation", { name: "Navegación de la app" })
    .getByRole("link", { name: "Mis citas" })
    .click();
  await heading(page, "Mis citas");
  await page.getByRole("link", { name: /Corte clásico con .* · Cita confirmada/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cita confirmada" })).toBeVisible(slow);

  await page.getByRole("button", { name: "Cancelar cita" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cita cancelada" })).toBeVisible(slow);
});
