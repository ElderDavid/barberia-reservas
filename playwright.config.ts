import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Playwright is a standalone runner: it does not read .env by itself.
// Without a .env file (CI) the variables come from the environment.
if (existsSync(".env")) process.loadEnvFile(".env");

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // Fresh e2e database on every run: reset → migrate → seed → dev server.
    command: `node --env-file-if-exists=.env scripts/db-reset.ts && node --env-file-if-exists=.env scripts/seed.ts && node node_modules/next/dist/bin/next dev -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "",
      APP_URL: baseURL,
    },
  },
});
