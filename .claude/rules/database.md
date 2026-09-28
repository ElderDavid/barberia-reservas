---
description: Database schema, migrations and scripts conventions
paths:
  - "src/server/db/**"
  - "drizzle/**"
  - "scripts/**"
---

# Database

- `src/server/db/schema.ts` is the only schema definition. Change it, then `pnpm db:generate`.
- Files in `drizzle/` are generated. The only hand-edited ones are `--custom` migrations, and only
  right after generating them.
- Primary keys: `uuid().defaultRandom()` for app tables, `text` for the four better-auth tables.
- Instants: `timestamp(name, { withTimezone: true, mode: "date" })` stored in UTC. Wall-clock
  opening hours: `time`. Calendar days: `date` with `mode: "string"` (`YYYY-MM-DD`).
- Money: `integer` COP, column name ends in `_cop`. Never floats.
- Every table in schema `public` has RLS enabled (Supabase exposes `public` through its Data API);
  the app connects as the table owner, which bypasses RLS.
- The client uses `prepare: false` so it works through Supabase's transaction pooler.
- Scripts run with `node --env-file-if-exists=.env scripts/<name>.ts`: relative `.ts` imports only,
  `import type` for types, no enums or parameter properties.
- Bookings are never deleted; `status` changes. Cancelled rows stop blocking the slot because the
  `bookings_no_overlap` constraint only covers `held` and `confirmed`.
