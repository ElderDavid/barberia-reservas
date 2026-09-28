import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbEnv } from "../../lib/env.ts";
import * as schema from "./schema.ts";

// prepare: false → compatible with Supabase's transaction pooler in production.
const client = postgres(dbEnv().DATABASE_URL, { prepare: false, max: 10, onnotice: () => {} });

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { client as sqlClient };
