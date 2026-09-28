import postgres from "postgres";

/**
 * Raw connection to the integration-test database. Inside the `integration` project
 * DATABASE_URL is TEST_DATABASE_URL (see vitest.config.ts).
 */
export const sql = postgres(process.env.DATABASE_URL ?? "", { max: 5, onnotice: () => {} });

/** Empties every table in schema `public`, whatever tables the schema defines. */
export async function truncateAll(): Promise<void> {
  const rows = await sql<{ tablename: string }[]>`
    select tablename from pg_tables where schemaname = 'public'
  `;
  if (rows.length === 0) return;
  const list = rows.map((row) => `"public"."${row.tablename}"`).join(", ");
  await sql.unsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}
