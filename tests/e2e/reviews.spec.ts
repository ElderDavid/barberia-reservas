import { type Browser, expect, type Page, test } from "@playwright/test";

const slow = { timeout: 30_000 };

async function heading(page: Page, name: string | RegExp) {
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible(slow);
}

async function step(page: Page, name: string) {
  await expect(page.getByRole("heading", { name })).toBeVisible(slow);
}

/** Registers, books the first free time from tomorrow and returns the booking's day. */
async function registerAndBook(page: Page): Promise<string> {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Lucía Mora");
  await page.getByLabel("Correo").fill(`lucia-${Date.now()}@example.com`);
  await page.getByLabel("Celular").fill("3105550201");
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

async function ownerPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(process.env.OWNER_EMAIL ?? "");
  await page.getByLabel("Contraseña").fill(process.env.OWNER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Entrar" }).click();
  await heading(page, "Agenda");
  return page;
}

test("a customer rates an attended visit and the owner answers", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const day = await registerAndBook(page);

  const owner = await ownerPage(browser);
  await owner.goto(`/admin?dia=${day}`);
  await owner
    .locator("section", { hasText: "Lucía Mora" })
    .last()
    .getByRole("button", { name: "Cobrar" })
    .click();
  await expect(owner.getByText(/Atendida/)).toBeVisible(slow);

  await page.goto("/mis-citas?pestana=pasadas");
  await expect(page.getByText("Has venido 1 vez")).toBeVisible(slow);
  await page.getByRole("link", { name: /Corte clásico/ }).click();
  const barber = (await page.getByRole("heading", { level: 1 }).textContent()) ?? "";
  expect(barber).not.toBe("");
  await page.getByRole("link", { name: "Calificar visita" }).click();
  await heading(page, /¿Cómo te fue con/);
  await page.locator("label", { hasText: "5 estrellas" }).click();
  await expect(page.getByRole("radio", { name: "5 estrellas" })).toBeChecked();
  await page.getByLabel("Comentario (opcional)").fill("Excelente corte, muy puntual.");
  await page.getByRole("button", { name: "Enviar calificación" }).click();
  await expect(page.getByText("¡Gracias! Guardamos tu calificación.")).toBeVisible(slow);
  await expect(page.getByRole("img", { name: "5 de 5 estrellas" })).toBeVisible();

  await owner.goto("/admin");
  await owner.getByRole("link", { name: "Ver opiniones" }).click();
  await heading(owner, "Opiniones");
  const opinion = owner.getByRole("article", { name: "Opinión de Lucía Mora" });
  await expect(opinion.getByText("Excelente corte, muy puntual.")).toBeVisible();
  await opinion.getByLabel("Responder").fill("¡Gracias, Lucía! Te esperamos pronto.");
  await opinion.getByRole("button", { name: "Enviar respuesta" }).click();
  await expect(owner.getByText("No hay opiniones sin responder.")).toBeVisible(slow);

  await page.reload();
  await expect(page.getByText("¡Gracias, Lucía! Te esperamos pronto.")).toBeVisible(slow);
  await expect(page.getByRole("link", { name: "Cambiar calificación" })).toHaveCount(0);

  await page.goto("/");
  await page.locator("#barberos").getByRole("link").first().waitFor();
  const cards = page.locator("#barberos").getByRole("link");
  for (let i = 0; i < (await cards.count()); i += 1) {
    await cards.nth(i).click();
    await expect(page).toHaveURL(/\/barberos\//, slow);
    if ((await page.getByText("Excelente corte, muy puntual.").count()) > 0) break;
    await page.goBack();
  }
  await expect(page.getByText("Excelente corte, muy puntual.")).toBeVisible();
  await expect(page.getByText("Lucía", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Mostraremos su promedio cuando tenga 3 calificaciones."),
  ).toBeVisible();
});
