import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Drops every object in the target database and re-applies the committed migrations in
 * ./drizzle. Used by the integration-test global setup and by the e2e web server command.
 * Never point it at production.
 */
export async function resetDatabase(url: string): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql.unsafe(
      "DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;",
    );
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" });
  } finally {
    await sql.end();
  }
}

// True only when run as `node scripts/db-reset.ts`; false when imported by tests.
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("MissingEnvError: DATABASE_URL is not set");
    process.exit(1);
  }
  await resetDatabase(url);
  console.log("db-reset: ok");
}
