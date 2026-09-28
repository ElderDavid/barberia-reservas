import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a standalone CLI: nothing loads .env for it unless this file does.
// Without a .env file (CI, Vercel) the variables come from the environment.
if (existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Production migrations use the Supabase session pooler; locally both are the same database.
    url: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL || "",
  },
});
