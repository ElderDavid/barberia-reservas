import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("the manifest describes an installable app", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe("Barbería — Reservas");
  expect(manifest.short_name).toBe("Barbería");
  expect(manifest.start_url).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.lang).toBe("es-CO");
  expect(manifest.orientation).toBe("portrait");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
    "512x512",
  ]);
  expect(manifest.icons.map((icon: { purpose?: string }) => icon.purpose)).toContain("maskable");
});

test("icons are PNG images and unknown sizes are 404", async ({ request }) => {
  for (const size of [192, 512, "maskable"]) {
    const response = await request.get(`/icons/${size}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  expect((await request.get("/icons/64")).status()).toBe(404);
});

test("home lists services and links to booking and privacy", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Reservar cita" })).toHaveAttribute(
    "href",
    "/reservar",
  );
  await expect(page.getByRole("link", { name: "Escribir por WhatsApp" })).toHaveAttribute(
    "href",
    /^https:\/\/wa\.me\/\d+$/,
  );
  await expect(page.getByRole("heading", { name: "Servicios" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ingresar" })).toHaveAttribute("href", "/entrar");
  await expect(page.getByRole("contentinfo")).toContainText("Todos los derechos reservados");
  await expect(page.getByRole("contentinfo")).toContainText("IngEM");
  await page.getByRole("link", { name: "Tratamiento de datos" }).click();
  await expect(page.getByRole("heading", { name: "Política de tratamiento de datos" })).toBeVisible(
    { timeout: 30_000 },
  );
});

test("privacy page states the Ley 1581 rights", async ({ page }) => {
  await page.goto("/privacidad");
  await expect(page.getByText("Conocer, actualizar y rectificar tus datos.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText("Revocar la autorización y pedir que suprimamos tus datos."),
  ).toBeVisible();
  await expect(
    page.getByText("Comunicarnos contigo sobre tus citas", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(/24 meses/)).toBeVisible();
});

for (const path of [
  "/",
  "/reservar",
  "/privacidad",
  "/terminos",
  "/entrar",
  "/registro",
  "/recuperar",
  "/cuenta/borrar",
  "/mis-citas",
  "/sin-conexion",
]) {
  test(`no WCAG 2.2 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("home does not scroll sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 30_000 });
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBe(clientWidth);
});

test("assetlinks.json lists no app until the Play Store identity is configured", async ({
  request,
}) => {
  const response = await request.get("/.well-known/assetlinks.json");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});

test("home shows the barbers and a bottom tab bar on the phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Nuestros barberos" })).toBeVisible({
    timeout: 30_000,
  });
  const tabs = page.getByRole("navigation", { name: "Navegación de la app" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Reservar" }).click();
  await expect(page.getByRole("heading", { name: "Elige el servicio" })).toBeVisible({
    timeout: 30_000,
  });
});
