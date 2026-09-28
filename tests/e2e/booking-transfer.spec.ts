import { expect, type Page, test } from "@playwright/test";

// The dev server compiles each route on first visit, so steps get generous timeouts.
const slow = { timeout: 30_000 };

async function heading(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible(slow);
}

test("customer books by transfer and sees the Wompi payment link", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/reservar");
  await page.getByRole("link", { name: /Corte clásico/ }).click();
  await heading(page, "Elige el barbero");
  await page.getByRole("link", { name: "Cualquiera" }).click();
  await heading(page, "Elige el día");

  // First day from tomorrow on that offers times, as in booking-cash.spec.ts.
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
  await page.getByLabel("Transferencia (pago completo en línea)").check();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(page).toHaveURL(/\/cita\/[A-Za-z0-9_-]+$/, slow);
  await expect(page.getByRole("heading", { level: 1, name: "Pendiente de pago" })).toBeVisible(
    slow,
  );
  await expect(page.getByRole("link", { name: "Pagar con Wompi" })).toHaveAttribute(
    "href",
    /^https:\/\/checkout\.wompi\.co\/p\//,
  );
});
