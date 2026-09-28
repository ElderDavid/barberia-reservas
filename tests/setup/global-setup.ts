import { existsSync } from "node:fs";
import { resetDatabase } from "../../scripts/db-reset.ts";

/**
 * Integration-project global setup: rebuilds the test database from the committed
 * migrations before the run. No-op until step 2 has generated the first migration.
 */
export default async function globalSetup(): Promise<void> {
  if (!existsSync("drizzle/meta/_journal.json")) return;
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("MissingEnvError: TEST_DATABASE_URL is not set");
  await resetDatabase(url);
}
