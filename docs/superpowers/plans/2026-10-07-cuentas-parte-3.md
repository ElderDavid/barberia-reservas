# Cuentas de clientes, parte 3: calificaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After an attended visit the customer rates it (1–5 stars, optional comment), the owner answers from the panel, and each barber has a public page with their average and latest comments.

**Architecture:** New table `reviews` (one per booking). Customer functions in `src/server/accounts/reviews.ts`, owner functions in `src/server/admin/reviews.ts`, public barber profile in `src/server/barbers.ts`. Screens: `/mis-citas/[id]/calificar`, rating on the Mis citas cards and the booking page, `/admin/opiniones`, `/barberos/[id]`.

**Tech Stack:** Next.js App Router, Drizzle, better-auth session, zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-cuentas-clientes-design.md` (§2 Calificar, Barbero; §3 Opiniones; §4 Calificaciones; §5 términos "Calificaciones y comentarios"; §6 step 3).

## Global Constraints

- `reviews`: `booking_id` unique, `user_id`, `rating` 1–5 (check), `comment` ≤ 500, `owner_reply` ≤ 500, `replied_at`, dates. Plus `hidden_at` (terms: "Podemos ocultar los comentarios que incumplan estas reglas").
- Only `completed` bookings of the customer's own account can be rated.
- The customer can edit the review "mientras el dueño no haya respondido"; after a reply → `already_replied`.
- Barber page: average stars shown only "desde 3 calificaciones"; average computed in the query, never stored. Hidden reviews count for nothing and show nowhere public.
- Public comments show only the first name (terms: "Tu nombre de pila y tu calificación pueden mostrarse").
- Deleting the account deletes its reviews (FK `on delete cascade`); the export lists them.
- `/admin/opiniones`: newest first, filter "sin responder", reply on the same page; the agenda shows a notice with the unanswered count.
- New table gets RLS enabled in a `--custom` migration (schema test checks every public table).

## Review Focus

1. Customer A posts a rating for B's booking id, or for a booking that is not `completed` → `not_found` / `not_completed`, nothing stored (Task 1 test).
2. Editing after the owner replied → `already_replied`, review unchanged (Task 1 test).
3. A hidden review → not in the barber's average, count or comments (Task 2 test).
4. Rating outside 1–5 or a 501-char comment from a hand-made form → `invalid_input`, never a 500 page (Task 1 test; DB check as backstop).
5. Barber page for an inactive or unknown barber id, or a non-uuid → 404 (Task 2 test + page `notFound()`).

---

### Task 1: Reviews table and customer side

**Files:**
- Modify: `src/server/db/schema.ts` (table `reviews`), generated migration + `--custom` RLS migration
- Create: `src/server/accounts/reviews.ts`
- Modify: `src/server/accounts/bookings.ts` (`AccountBooking.rating: number | null`), `src/server/accounts/export.ts` (`reviews`)
- Test: `tests/integration/reviews.test.ts`

**Interfaces:**
- Produces:
  - `type AccountReview = { rating: number; comment: string; ownerReply: string | null; repliedAt: Date | null; updatedAt: Date }`
  - `saveReview(userId: string, input: unknown, now: Date): Promise<{ ok: true } | { ok: false; error: "invalid_input" | "not_found" | "not_completed" | "already_replied" }>` — input `{ bookingId: uuid, rating: 1..5 int, comment: string ≤ 500 trimmed }`; upsert on `booking_id`.
  - `getAccountReview(userId: string, bookingId: string): Promise<AccountReview | null>`
  - `AccountExport.reviews: { bookingStartsAt: string; rating: number; comment: string; ownerReply: string | null }[]`

- [ ] Step 1: Tests: rate own completed booking → stored; rate again before reply → updated; after reply → `already_replied`; other user's booking → `not_found`; confirmed booking → `not_completed`; rating 0/6/"x" and 501 chars → `invalid_input`; `listAccountBookings` past item carries `rating`; export lists reviews; deleting the account removes the review; schema test still passes (RLS).
- [ ] Step 2: FAIL → implement → PASS. Commit "Calificaciones: tabla y lado del cliente".

### Task 2: Owner side and public barber profile

**Files:**
- Create: `src/server/admin/reviews.ts`, `src/server/barbers.ts`
- Test: `tests/integration/reviews-admin.test.ts`

**Interfaces:**
- Produces:
  - `type OwnerReview = { id: string; rating: number; comment: string; ownerReply: string | null; hidden: boolean; createdAt: Date; customerName: string; barberName: string; serviceName: string; bookingStartsAt: Date }`
  - `listReviews(filter: "todas" | "sin-responder"): Promise<OwnerReview[]>` newest first (max 100).
  - `countUnanswered(): Promise<number>` (visible, no reply).
  - `replyToReview(input: unknown, now: Date): Promise<{ ok: true } | { ok: false; error: "invalid_input" | "not_found" }>` — `{ reviewId: uuid, reply: 1..500 trimmed }`; replying again edits the reply.
  - `setReviewHidden(input: unknown, now: Date)` — `{ reviewId, hidden: boolean }`, same result type.
  - `getBarberProfile(barberId: string): Promise<BarberProfile | null>` with `BarberProfile = { id; name; ratingCount: number; average: number | null /* null below 3 */; reviews: { firstName: string; rating: number; comment: string; ownerReply: string | null; createdAt: Date }[] /* latest 6 visible with a comment */; services: { id; name; durationMinutes; priceCop }[] }`; null for inactive, unknown or non-uuid ids.

- [ ] Step 1: Tests: list order and filter; count ignores hidden and answered; reply stores `replied_at` and blocks later customer edit; empty reply → `invalid_input`; hide → excluded from count/average/comments; average null with 2 ratings, 4.5 with ratings 4,5,4,5; first name only ("Ana María Pérez" → "Ana"); inactive barber → null.
- [ ] Step 2: FAIL → implement → PASS. Commit "Calificaciones: panel del dueño y perfil del barbero".

### Task 3: Screens

**Files:**
- Create: `src/app/mis-citas/[id]/calificar/page.tsx` + `actions.ts`, `src/components/site/reviews/star-rating-input.tsx` (radio stars, no JS), `src/components/site/reviews/stars.tsx` (read-only, `aria-label="4 de 5 estrellas"`), `src/components/site/reviews/review-card.tsx`, `src/app/admin/opiniones/page.tsx` + `actions.ts`, `src/app/barberos/[id]/page.tsx`
- Modify: `src/components/site/account/account-bookings.tsx` (Pasadas: stars or "Calificar" chip for completed), `src/app/mis-citas/[id]/page.tsx` (completed: your review + owner reply, or "Calificar" button), `src/app/admin/layout.tsx` (nav "Opiniones"), `src/app/admin/page.tsx` (unanswered notice), `src/components/site/barbers.tsx` (cards go to `/barberos/[id]`)
- Test: `tests/e2e/reviews.spec.ts`

- [ ] Step 1: E2E: customer books → owner marks attended → customer opens Pasadas → Calificar → 5 stars + comment → sees it on the card; owner sees it in Opiniones (and the agenda notice), replies; customer sees the reply and the edit form is gone; `/barberos/<id>` shows the comment with the first name.
- [ ] Step 2: FAIL → implement (frontend-design: app cards, serif stars line, avatar) → full gate + e2e PASS. Commit "Calificaciones en pantalla".

### Task 4: Ship

- [ ] Final whole-branch review (fresh reviewer), fix Critical/Important with RED→GREEN tests.
- [ ] Push, PR (Before/After/How), subscribe, CI green, ask the user on a decision card before merging, verify production deploy READY.
