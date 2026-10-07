# Cuentas de clientes, parte 2: citas en la cuenta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in customer's bookings belong to their account: booking while signed in links the booking, "Mis citas" shows Próximas · Pasadas · Canceladas plus the visit count, and bookings made on the phone before signing in can be claimed with their private link.

**Architecture:** `bookings.user_id` (nullable FK to `user`, `on delete set null`). `createBooking` and reschedule carry it. New `src/server/accounts/bookings.ts` lists, counts, fetches and claims account bookings. `/mis-citas` branches on the session. The `/cita/[token]` manage UI is extracted into a component that `/mis-citas/[id]` reuses, with actions that accept either a token or an owned booking id.

**Tech Stack:** Next.js App Router, Drizzle, better-auth session (`requireCustomer`, `getSessionUser`), zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-cuentas-clientes-design.md` (§2 Mis citas, "Citas hechas sin cuenta"; §4 "Citas y cuenta"; §6 step 2).

## Global Constraints

- Never merge bookings by phone number: "No se unen citas solo porque coincida el número de celular".
- `claimBookings(userId, tokens[])` compares SHA-256 of each token with `manage_token_hash` and assigns only bookings with `user_id is null`.
- Deleting an account keeps its bookings with `user_id` null (FK `on delete set null`).
- Tabs: **Próximas · Pasadas · Canceladas**; header line "Has venido N veces" (N = `completed` bookings of the account; "1 vez" singular; 0 → "Aún no tienes visitas").
- Próximas = `held` or `confirmed` with `starts_at >= now`; Pasadas = `completed`, `no_show`, or `confirmed` with `starts_at < now`; Canceladas = `cancelled` except `cancel_reason = 'reprogramada'` (the replacement booking shows instead).
- Customer actions start with `requireCustomer()` and filter by the session user's id.
- Every new migration keeps RLS rules (no new table here). Gate: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`, plus `pnpm test:e2e`.

## Review Focus

1. Customer A opens `/mis-citas/<id of B's booking>` or posts its id to cancel → not found, nothing changes (test Task 2 + Task 3 action check).
2. Claiming a token whose booking already belongs to another account → not reassigned (Task 2 test).
3. Rescheduling an account booking → the new booking keeps `user_id` (Task 1 test).
4. The owner (role owner) signed in while booking → booking gets no `user_id` (Task 3: only `role === "customer"` links).
5. More than 20 tokens or malformed tokens in a claim → ignored, no error page (Task 2 test).

---

### Task 1: Schema and booking writes carry the account

**Files:**
- Modify: `src/server/db/schema.ts` (bookings: `userId: text("user_id").references(() => user.id, { onDelete: "set null" })`, index `bookings_user` on `user_id`), generated migration in `drizzle/`
- Modify: `src/server/booking/create.ts` (`CreateBookingInput.userId?: string | null`, written to the row), `src/server/booking/manage.ts` (reschedule copies `userId`; `ManageResult` ok gains `bookingId?: string`), `src/server/accounts/export.ts` (fill `bookings`)
- Test: `tests/integration/account-bookings.test.ts`, update `tests/integration/accounts.test.ts` (delete keeps booking, `user_id` null)

**Interfaces:**
- Produces: `bookings.userId`; `createBooking({..., userId}, now)`; `rescheduleBooking` result `{ ok: true; token: string; bookingId: string }`; `AccountExport.bookings: { service: string; barber: string; startsAt: string; status: string; priceCop: number }[]`.

- [ ] Step 1: Tests: booking with `userId` stores it; without stays null; reschedule of a linked booking → new row has same `user_id` and result has `bookingId`; export lists own bookings only; deleting the account leaves the booking with `user_id` null.
- [ ] Step 2: Run → FAIL. Step 3: schema + `pnpm db:generate` + code. Step 4: PASS. Commit "Citas: enlazadas a la cuenta".

### Task 2: Account bookings server module

**Files:**
- Create: `src/server/accounts/bookings.ts`
- Test: `tests/integration/account-bookings.test.ts`

**Interfaces:**
- Produces:
  - `type AccountBooking = { id: string; status: "held"|"confirmed"|"completed"|"cancelled"|"no_show"; startsAt: Date; serviceName: string; barberName: string; priceCop: number }`
  - `listAccountBookings(userId: string, now: Date): Promise<{ upcoming: AccountBooking[]; past: AccountBooking[]; cancelled: AccountBooking[]; visits: number }>` — upcoming ascending, past and cancelled descending, rules from Global Constraints.
  - `findAccountBooking(userId: string, bookingId: string): Promise<BookingView | null>` (reuses `manage.ts` view loading; null when not that user's or bad uuid).
  - `claimBookings(userId: string, tokens: string[], now: Date): Promise<{ ok: true; claimed: number }>` — keeps the first 20 tokens matching `^[A-Za-z0-9_-]{43}$`, hashes them, `update bookings set user_id, updated_at where manage_token_hash in (...) and user_id is null`.

- [ ] Step 1: Tests: buckets and visit count (completed ×2, no_show, past confirmed, upcoming confirmed, held, cancelled, reprogramada hidden); claim valid token → 1; same token again → 0; token of a booking owned by another user → 0 and owner unchanged; 25 tokens / malformed → no throw, at most 20 considered; `findAccountBooking` with another user's booking → null.
- [ ] Step 2–4: FAIL → implement → PASS. Commit "Citas de la cuenta: listar y reclamar".

### Task 3: Screens

**Files:**
- Create: `src/components/site/booking/booking-manage.tsx` (manage UI extracted from `/cita/[token]`: details card, pay card, change-time, cancel; props: view data, `baseHref`, `idField: { name: "token" | "cita"; value: string }`, `payUrl`, `days`, `dia`, `slots`, `message`), `src/app/mis-citas/[id]/page.tsx`, `src/components/site/account/account-bookings.tsx` (tabs + cards), `src/components/site/account/claim-saved-bookings.tsx` (client: on mount sends saved tokens to `guardarCitasDelCelular`, then `router.refresh()` when claimed > 0), `src/app/mis-citas/actions.ts`
- Modify: `src/app/cita/[token]/page.tsx` (use component; signed-in customer + `booking.userId` null → "Guardar en mi cuenta" form), `src/app/cita/[token]/actions.ts` (`cancelar`/`reprogramar` accept `cita` id: `requireCustomer()` + `findAccountBooking`; redirect to `/mis-citas/<id>`), `src/app/reservar/actions.ts` + `page.tsx` (customer session → `userId`, name/phone prefilled), `src/app/mis-citas/page.tsx` (signed in: account view; else today's list + "Crea una cuenta" invitation)
- Test: `tests/e2e/account-bookings.spec.ts`

**Interfaces:**
- Consumes: Task 2 functions; `getSessionUser()`, `requireCustomer()`.
- Produces: `/mis-citas?pestana=proximas|pasadas|canceladas` (default proximas), `/mis-citas/[id]`.

- [ ] Step 1: E2E: register → reserve (name and phone already filled) → `/mis-citas` shows it under Próximas and "Aún no tienes visitas"; anonymous booking, then register on the same phone → the booking appears in Próximas (claim); cancel from `/mis-citas/[id]` moves it to Canceladas.
- [ ] Step 2–4: FAIL → implement (frontend-design: segmented tabs, app cards with status chips) → PASS with full gate. Commit "Mis citas con cuenta".

### Task 4: Ship

- [ ] Final whole-branch review (fresh reviewer), fix Critical/Important with RED→GREEN tests.
- [ ] Push, PR (Before/After/How), subscribe, CI green, ask the user on a decision card before merging, verify production deploy READY.
