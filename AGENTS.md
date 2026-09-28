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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
