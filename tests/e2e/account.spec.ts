import { expect, type Page, test } from "@playwright/test";

const password = "clave-cliente-123";

async function register(page: Page, email: string) {
  await page.goto("/registro");
  await page.getByLabel("Nombre").fill("Laura Pérez");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Celular").fill("3105550199");
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mi cuenta" })).toBeVisible({
    timeout: 30_000,
  });
}

test("a customer registers, signs out and signs back in to Cuenta", async ({ page }) => {
  const email = `laura-${Date.now()}@example.com`;
  await register(page, email);
  await expect(page.getByText("Cliente desde")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByText("Sesión cerrada")).toBeVisible();
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/cuenta$/, { timeout: 30_000 });
});

test("a signed-in customer is not let into the owner panel", async ({ page }) => {
  await register(page, `paola-${Date.now()}@example.com`);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("deleting the account signs out and returns home", async ({ page }) => {
  await register(page, `mario-${Date.now()}@example.com`);
  await page.getByRole("link", { name: "Borrar mi cuenta" }).click();
  await page.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: "Borrar mi cuenta" }).click();
  await expect(page).toHaveURL(/\/\?cuenta=borrada$/, { timeout: 30_000 });
  await page.goto("/cuenta");
  await expect(page).toHaveURL(/\/entrar\?volver=/);
});
