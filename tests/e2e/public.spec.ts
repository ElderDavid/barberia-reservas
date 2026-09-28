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
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
});

test("icons are PNG images and unknown sizes are 404", async ({ request }) => {
  for (const size of [192, 512]) {
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
  await page.getByRole("link", { name: "Política de privacidad" }).click();
  await expect(page.getByRole("heading", { name: "Política de tratamiento de datos" })).toBeVisible(
    { timeout: 30_000 },
  );
});

test("privacy page states the Ley 1581 rights", async ({ page }) => {
  await page.goto("/privacidad");
  await expect(
    page.getByText(
      "De acuerdo con la Ley 1581 de 2012 puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la autorización",
    ),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByText("gestionar tus citas y comunicarnos contigo sobre ellas"),
  ).toBeVisible();
  await expect(page.getByText(/24 meses/)).toBeVisible();
});

for (const path of ["/", "/reservar", "/privacidad", "/entrar"]) {
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
