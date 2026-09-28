import { expect, type Page, test } from "@playwright/test";

const email = process.env.OWNER_EMAIL ?? "";
const password = process.env.OWNER_PASSWORD ?? "";

async function signIn(page: Page, withPassword: string) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(withPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("anonymous visitor is sent from /admin to /entrar", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar$/);
});

test("owner signs in and sees the agenda", async ({ page }) => {
  await signIn(page, password);
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible({
    timeout: 30_000,
  });
});

test("wrong password shows an alert and stays on /entrar", async ({ page }) => {
  await signIn(page, "clave-incorrecta-123");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Correo o contraseña incorrectos",
  );
  await expect(page).toHaveURL(/\/entrar$/);
});

test("signing out closes the session", async ({ page }) => {
  await signIn(page, password);
  await expect(page.getByRole("heading", { level: 1, name: "Agenda" })).toBeVisible({
    timeout: 30_000,
  });
  await page.goto("/entrar?salir=1");
  await expect(page.getByText("Sesión cerrada")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/entrar$/);
});
