---
name: add-migration
description: Use when changing the database schema of the barbershop app — adding or altering a table, column, index, enum value or constraint in src/server/db/schema.ts, or when a change needs raw SQL (exclusion constraints, RLS, extensions). Covers generating, applying and testing the migration.
---

# Add a database migration

## When to use
- "add a column", "new table", "change the schema", "add an index", "new enum value"
- Anything Drizzle cannot express (EXCLUDE constraints, `ENABLE ROW LEVEL SECURITY`, extensions)

## Steps
1. Edit `src/server/db/schema.ts` only. Money is `integer` COP; instants are
   `timestamp(..., { withTimezone: true })`; every new table in `public` also needs RLS enabled.
2. `pnpm db:generate` — drizzle-kit names the file (`drizzle/NNNN_<random>.sql`); never rename it.
3. If raw SQL is needed: `pnpm exec drizzle-kit generate --custom --name=<snake_name>`, then write
   the SQL into the file it just created (the one ending in `_<snake_name>.sql`). For a new table add
   `ALTER TABLE "<table>" ENABLE ROW LEVEL SECURITY;` here.
4. `pnpm db:migrate` (dev DB) — the integration global setup rebuilds the test DB on the next run.
5. Add or extend a test in `tests/integration/` that proves the change (the column exists, the
   constraint rejects the bad row with its SQLSTATE).

## Verify
```bash
pnpm db:up          # expect: exit 0
pnpm db:migrate     # expect: exit 0
pnpm db:check       # expect: exit 0
pnpm test:int       # expect: exit 0, 0 failed
```

## Do not
- Edit a migration that already ran anywhere; add a new one.
- Use the Supabase dashboard table editor — drizzle migrations own the schema.
- Ship a destructive change (drop/rename) in the same deploy as the code that stops using it.
