# Barbería — reservas y control · agent instructions

Web app (PWA) for one barbershop in Colombia: customers book from their phone and pay cash or by
transfer (Wompi); the owner manages the agenda, sales, expenses and a financial summary.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Local Postgres | `pnpm db:up` / `pnpm db:down` |
| Dev | `pnpm dev` |
| Lint / format / typecheck | `pnpm lint` · `pnpm format` · `pnpm typecheck` |
| Tests | `pnpm test:unit` · `pnpm test:int` (needs `pnpm db:up`) · `pnpm test:e2e` |
| Migrations | `pnpm db:generate` · `pnpm db:migrate` |
| Build | `pnpm build` |

Gate before any task is done: `pnpm lint && pnpm typecheck && pnpm test`.

## Non-negotiable

1. Double-booking is prevented only by the `bookings_no_overlap` database constraint; map `23P01` to `slot_taken`.
2. Never delete a booking; change its status. Slots are computed, never stored.
3. Verify the Wompi checksum before trusting a webhook; handlers are idempotent.
4. Store only the SHA-256 of manage tokens.
5. Never commit `.env` or secrets; never hand-edit generated migrations.
6. Never mark a task done with a failing gate.

Full architecture, boundaries and design tokens: see `CLAUDE.md` in this directory.
