import { type Browser, expect, type Page, test } from "@playwright/test";

const slow = { timeout: 30_000 };

async function heading(page: Page, name: string | RegExp) {
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible(slow);
}

async function step(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible(slow);
}

async function ownerPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(process.env.OWNER_EMAIL ?? "");
  await page.getByLabel("Contraseña").fill(process.env.OWNER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await heading(page, "Agenda");
  return page;
}

/** Registers, books the first free time from tomorrow and returns the booking's day. */
async function registerAndBook(page: Page): Promise<string> {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Mateo Díaz");
  await page.getByLabel("Correo").fill(`mateo-${Date.now()}@example.com`);
  await page.getByLabel("Celular").fill("3105550301");
  await page.getByLabel("Contraseña").fill("clave-cliente-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await heading(page, "Mi cuenta");

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
  const day = new URL(page.url()).searchParams.get("dia") ?? "";
  await page.locator("main li a").first().click();
  await step(page, "Tus datos");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await heading(page, "Cita confirmada");
  return day;
}

test("a full loyalty card is shown to the customer and redeemed by the owner", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const owner = await ownerPage(browser);
  await owner.goto("/admin/ajustes");
  await owner.getByLabel("Sellos para el premio").fill("1");
  await owner.getByLabel("Premio", { exact: true }).fill("Corte gratis");
  await owner.getByRole("button", { name: "Guardar fidelidad" }).click();
  await expect(owner).toHaveURL(/ok=1/, slow);

  const day = await registerAndBook(page);
  await page.goto("/cuenta");
  await expect(page.getByText("Te falta 1 visita para corte gratis.")).toBeVisible(slow);

  await owner.goto(`/admin?dia=${day}`);
  await owner
    .locator("section", { hasText: "Mateo Díaz" })
    .last()
    .getByRole("button", { name: "Cobrar" })
    .click();
  await expect(owner.getByText(/Atendida/)).toBeVisible(slow);

  await page.reload();
  await expect(
    page.getByText("¡Ganaste corte gratis! Muéstrale esta pantalla al barbero."),
  ).toBeVisible(slow);

  await owner.goto("/admin/clientes");
  await owner.getByLabel("Buscar por nombre o celular").fill("310 555 0301");
  await owner.getByRole("button", { name: "Buscar" }).click();
  await owner.getByRole("link", { name: /Mateo Díaz/ }).click();
  await heading(owner, "Mateo Díaz");
  await owner.getByRole("button", { name: "Canjear premio" }).click();
  await expect(owner.getByText("Premio entregado. La tarjeta empieza de nuevo.")).toBeVisible(slow);
  await expect(owner.getByRole("button", { name: "Canjear premio" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByText("Te falta 1 visita para corte gratis.")).toBeVisible(slow);
});
