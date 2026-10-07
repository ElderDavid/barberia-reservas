# Barbería — reservas y control

Web app instalable (PWA) de una sola barbería: los clientes reservan desde el celular y pagan en
efectivo o por transferencia (Wompi); el dueño gestiona la agenda, cobros, gastos y un resumen
financiero. Todo el texto visible está en español de Colombia.

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` |
| Local Postgres up / down | `pnpm db:up` · `pnpm db:down` |
| Dev server | `pnpm dev` — http://localhost:3000 |
| Build / start | `pnpm build` · `pnpm start` |
| Typecheck | `pnpm typecheck` |
| Lint / format | `pnpm lint` · `pnpm format` |
| Unit tests | `pnpm test:unit` · one file: `pnpm test:unit tests/unit/<file>.test.ts` |
| Integration tests (need `pnpm db:up`) | `pnpm test:int` · one file: `pnpm test:int tests/integration/<file>.test.ts` |
| E2E (Pixel 7, port 3100, resets the e2e DB) | `pnpm test:e2e` · one file: `pnpm test:e2e tests/e2e/<file>.spec.ts` |
| Serve smoke check (after build) | `bash scripts/serve-check.sh <path> <status> [header]` |
| Generate migration after editing the schema | `pnpm db:generate` |
| Hand-written SQL migration | `pnpm exec drizzle-kit generate --custom --name=<name>` |
| Apply migrations | `pnpm db:migrate` |
| Reset dev DB · seed demo data · create owner | `pnpm db:reset` · `pnpm db:seed` · `pnpm owner:create` |

**Gate:** `pnpm lint && pnpm typecheck && pnpm test` must pass (with `pnpm db:up` running) before
any task is marked done. Run `pnpm format` before `pnpm lint`.

Node is pinned in `.nvmrc`, pnpm in `package.json#packageManager`. Dependency versions live in the
lockfile — read it, never guess one.

## Stack

Next.js App Router · TypeScript · Tailwind CSS v4 (tokens in `src/app/globals.css`) · hand-written
UI primitives in `src/components/ui/` · Postgres (Docker locally, Supabase in prod) · Drizzle ORM
with the `postgres` driver · better-auth (email + password, owner only) · Wompi Web Checkout ·
Vercel. Build order: `blueprints/barberia-reservas/tasks.json` and `epics/`.

## Architecture

**Request path.** Customer: `src/app/reservar/page.tsx` (server, reads `searchParams`) →
`src/server/booking/availability.ts` → `src/server/booking/slots.ts` (pure) → form POST to
`src/app/reservar/actions.ts` → `src/server/booking/create.ts` → `src/server/db/client.ts` →
Postgres. The database constraint `bookings_no_overlap` is the only double-booking guard.
Owner: `src/app/admin/**` (layout calls `requireOwner()`) → `src/app/admin/**/actions.ts` →
`src/server/admin/*.ts`. Wompi: `/cita/<token>` links to checkout → Wompi POSTs
`src/app/api/webhooks/wompi/route.ts` → `src/server/payments/webhook.ts`.

**Boundaries.**

| Layer | May import from | Must never |
|---|---|---|
| `src/app/**` | `@/components`, `@/server`, `@/lib` | query the DB directly or hold business rules |
| `src/components/**` | `@/lib`, other components | import `@/server/**` |
| `src/server/**`, `src/lib/**` | each other, npm packages | import React, `next/headers`, `next/navigation` (except `src/server/session.ts`) |
| `scripts/**`, `tests/**` | `src/server/**`, `src/lib/**` via relative `.ts` paths | import `src/app/**` |

**Where things live.**

| Concern | Single source of truth |
|---|---|
| DB schema | `src/server/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate` |
| Env access | `src/lib/env.ts` group getters (`dbEnv()`, `authEnv()`, …) — never `process.env` elsewhere in `src/` |
| Time zone math | `src/lib/time.ts` (Intl-based); shop zone comes from `shop_settings.timezone` |
| Session | `src/server/session.ts` — `requireOwner()` |
| Money | integer COP everywhere (`*_cop` columns); format only at render with `formatCop()` |
| Design tokens | CSS variables in `src/app/globals.css`, used through Tailwind classes |

## Code rules

1. Files under `src/server/**`, `src/lib/**`, `scripts/**` and `tests/**` import each other with
   **relative specifiers ending in `.ts`** (Node runs scripts with native type stripping and does
   not understand `@/`). `src/app/**` and `src/components/**` use `@/`.
2. Always `import type` for type-only imports (`verbatimModuleSyntax` is on). No `enum`, no
   `namespace`, no constructor parameter properties — Node's type stripping rejects them.
3. Server-first: pages are Server Components; `"use client"` only on a leaf that needs state or
   browser APIs (today `src/app/entrar/page.tsx`, the service-worker registration, and the
   "Mis citas" list/remember/claim components, which use localStorage). Forms are plain `<form action={serverAction}>`;
   the action takes `(formData: FormData)` and on failure redirects back with `?error=<code>`, which
   the page renders as a Spanish message in `role="alert"`.
4. Every page or route handler that reads the database exports `export const dynamic = "force-dynamic";`.
5. Every exported function in an `actions.ts` under `src/app/admin/**` starts with `await requireOwner()`.
6. Business functions in `src/server/**` take `now: Date` as a parameter instead of calling `new Date()`,
   and return `{ ok: true, … } | { ok: false, error: "<code>" }`; they never throw for expected cases.
7. Every input from a form, URL or webhook is parsed with zod before it reaches `src/server/**`.
8. Components stay under 250 lines; no barrel files; one component per file.

## Design system

Source: the owner's `DESIGN.md` style reference (warm monochrome "old-world" editorial look), adapted
to a barbershop. Tonal layers: Bone → Paper → Cocoa → Ink; no decorative hue.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#f2f1ed` | `#0f0d0b` | page (Bone) |
| `--surface` | `#ffffff` | `#1a1713` | cards, panels (Paper) |
| `--border` | `#8a847a` | `#7a7368` | inputs, choice buttons (≥ 3:1) |
| `--hairline` | `#e5e3df` | `#2c2822` | decorative card borders, dividers |
| `--fg` | `#0b0a08` | `#f2f1ed` | body text |
| `--fg-muted` | `#5c5a56` | `#b4aeac` | secondary text |
| `--primary` | `#3b3429` | `#e8e2d6` | primary buttons, focus ring |
| `--primary-fg` | `#ffffff` | `#1a1713` | text on primary |
| `--destructive` | `#9b1c1c` | `#f19a9a` | errors, cancel |
| `--success` | `#2e6b3f` | `#8fd19e` | confirmations |
| `--ink` / `--on-ink` / `--on-ink-muted` | `#0b0a08` / `#f2f1ed` / `#b4aeac` | same | hero bands, footer |
| `--cocoa` / `--on-cocoa` | `#3b3429` / `#ffffff` | same | accent cards, marquee, visit band |

- Tailwind classes: `bg-background`, `bg-surface`, `border-border`, `border-hairline`, `text-fg`,
  `text-fg-muted`, `bg-primary text-primary-fg`, `bg-ink text-on-ink`, `bg-cocoa text-on-cocoa`,
  `text-destructive`, `text-success`. No hex literals in `.tsx`.
- Type: headings in the serif `font-display` (Cormorant Garamond via `next/font`, weight 500,
  tracking -0.012em, line-height 1.08); body and UI in the system `font-sans`. Page titles
  `font-display text-4xl`/`5xl`.
- Radius 5px everywhere (`rounded-control`, `rounded-card`); borders and tonal contrast instead of shadows.
- Photos: `src/lib/photos.ts` (Unsplash CDN) rendered with `next/image` through the custom loader
  `src/lib/image-loader.ts`; decorative photos get `alt=""`.
- Touch targets ≥ 44px (`min-h-11`). Focus: `focus-visible:outline-2 outline-primary outline-offset-2`.
- Motion only with transform or clip-path (never opacity, so contrast is always final) and only
  for `prefers-reduced-motion: no-preference`: hover lifts 150ms `ease-out` behind `motion-safe:`;
  entrance and scroll animations via the `.rise`, `.reveal`, `.reveal-image`, `.unveil`,
  `.slow-zoom` and `.marquee-track` classes in `globals.css`.
- Mobile-first; public pages are full-bleed bands with content max width 1152px (`max-w-6xl`),
  forms 768px (`max-w-3xl`), admin 1024px (`max-w-5xl`). Header and footer sit outside `<main>`.
- On phones (below `md`) customer pages end with `<AppTabBar current=…>` (bottom tabs: Inicio,
  Reservar, Mis citas, Barberos), outside `<main>`; the header hides its "Reservar" button there.

## Environment

| Variable | Required from step | Used by |
|---|---|---|
| `DATABASE_URL` | 2 | `src/server/db/client.ts`, drizzle-kit, scripts |
| `TEST_DATABASE_URL` | 2 | integration tests |
| `E2E_DATABASE_URL` | 4 | Playwright web server |
| `APP_URL`, `BETTER_AUTH_SECRET` | 3 | `src/server/auth.ts`, links |
| `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` | 3 | `scripts/seed.ts`, `scripts/create-owner.ts`, e2e |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET` | 9 | `src/server/payments/wompi.ts` |
| `WOMPI_EVENTS_SECRET` | 10 | `src/server/payments/webhook.ts` |
| `CRON_SECRET` | 17 | `src/app/api/cron/expire-holds/route.ts` |
| `MIGRATION_DATABASE_URL` | prod only | `drizzle.config.ts` |
| `ANDROID_PACKAGE_NAME`, `ANDROID_CERT_SHA256` | optional | `/.well-known/assetlinks.json` (Play Store app, `docs/play-store.md`) |
| `RESEND_API_KEY`, `MAIL_FROM` | optional | `src/server/mail.ts` — password-reset mails; without them `/recuperar` points to WhatsApp |

`.env.example` is committed and stays in sync; `.env` is created from it and never committed.

## Rules

| File | Applies to |
|---|---|
| `.claude/rules/database.md` | `src/server/db/**`, `drizzle/**`, `scripts/**` |
| `.claude/rules/booking.md` | `src/server/booking/**`, `src/lib/time.ts`, `src/app/reservar/**`, `src/app/cita/**` |
| `.claude/rules/payments.md` | `src/server/payments/**`, `src/app/api/webhooks/**`, `src/server/admin/sales.ts` |
| `.claude/rules/ui.md` | `src/app/**/*.tsx`, `src/components/**` |
| `.claude/rules/tests.md` | `tests/**` |

## Non-negotiable

1. Never check availability in code and then insert: the insert inside the transaction plus the
   `bookings_no_overlap` constraint decides; map Postgres `23P01` to `slot_taken`.
2. Never delete a booking; change its `status`. Never store a slot table; slots are computed.
3. Wompi webhooks: verify the checksum before trusting the body; handlers are idempotent.
4. Never store the raw manage token — only its SHA-256 hex in `manage_token_hash`.
5. Never commit `.env`, secrets, or edit files in `drizzle/` by hand except the `--custom` migration you just generated.
6. Never mark a task done with a failing gate, and never edit a `verify` command to make it pass.
