import { expect, type Page, test } from "@playwright/test";

const slow = { timeout: 30_000 };

async function heading(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible(slow);
}

async function register(page: Page, email: string, phone: string) {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Sofía Ríos");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Celular").fill(phone);
  await page.getByLabel("Contraseña").fill("clave-cliente-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible(slow);
}

/** Walks the booking steps up to "Tus datos", on the first day from tomorrow that has times. */
async function pickSlot(page: Page) {
  await page.goto("/reservar");
  await page.getByRole("link", { name: /Corte clásico/ }).click();
  await heading(page, "Elige el barbero");
  await page.getByRole("link", { name: "Cualquiera" }).click();
  await heading(page, "Elige el día");
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
}

async function openMisCitas(page: Page) {
  await page
    .getByRole("navigation", { name: "Navegación de la app" })
    .getByRole("link", { name: "Mis citas" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Mis citas" })).toBeVisible(slow);
}

test("a booking made while signed in shows in Mis citas and can be cancelled there", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await register(page, `sofia-${Date.now()}@example.com`, "3105550101");
  await pickSlot(page);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Sofía Ríos");
  await expect(page.getByLabel("Celular", { exact: true })).toHaveValue("3105550101");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cita confirmada" })).toBeVisible(slow);

  await openMisCitas(page);
  await expect(page.getByText("Aún no tienes visitas")).toBeVisible();
  await expect(page.getByRole("link", { name: "Próximas" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByRole("link", { name: /Corte clásico/ }).click();
  await expect(page).toHaveURL(/\/mis-citas\/[0-9a-f-]{36}$/, slow);
  await page.getByRole("button", { name: "Cancelar cita" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cita cancelada" })).toBeVisible(slow);

  await openMisCitas(page);
  await page.getByRole("link", { name: "Canceladas" }).click();
  await expect(page.getByRole("link", { name: /Corte clásico/ })).toBeVisible(slow);
});

test("a booking made before signing up moves into the new account", async ({ page }) => {
  test.setTimeout(180_000);
  await pickSlot(page);
  await page.getByLabel("Nombre", { exact: true }).fill("Tomás Gil");
  await page.getByLabel("Celular", { exact: true }).fill("3105550102");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Cita confirmada" })).toBeVisible(slow);

  await register(page, `tomas-${Date.now()}@example.com`, "3105550102");
  await openMisCitas(page);
  await expect(page.getByRole("link", { name: /Corte clásico/ })).toBeVisible(slow);
});
