# Cuentas de clientes, parte 4: fidelidad y clientes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each attended visit of an account fills a stamp on a loyalty card; when it is full the customer shows it and the owner redeems the reward from the new Clientes pages in the panel.

**Architecture:** `shop_settings` gains `loyalty_goal` and `loyalty_reward`; new table `loyalty_redemptions`. `src/server/loyalty.ts` computes stamps and redeems; `src/server/admin/clients.ts` lists and details clients. Screens: loyalty card on `/cuenta`, "Fidelidad" block in Ajustes, `/admin/clientes`, `/admin/clientes/[id]`.

**Tech Stack:** Next.js App Router, Drizzle, zod, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-cuentas-clientes-design.md` (§2 Tarjeta de fidelidad; §3 Clientes, Cliente, Ajustes; §4 Fidelidad; §6 step 4).

## Global Constraints

- `loyalty_goal` 0–30, default 10 (0 = loyalty off); `loyalty_reward` text ≤ 60, default "Corte gratis".
- `loyalty_redemptions`: `user_id` (cascade on account delete), `stamps_used`, `redeemed_at`, `redeemed_by` (owner user, set null).
- Available stamps = `completed` bookings of the account − sum of `stamps_used`. Redeeming uses `goal` stamps; the card starts again with the leftovers.
- Full card copy: "¡Ganaste un corte gratis! Muéstrale esta pantalla al barbero." — with the configured reward: "¡Ganaste {reward}! Muéstrale esta pantalla al barbero." (lower-cased first letter).
- Stamp animation only with `transform`, behind `motion-safe`.
- Clientes: search by name or phone; each row: visits, last visit, has account, stamps, average rating given. Cliente: booking history, reviews with reply, "Canjear premio" when the card is full.
- Admin actions start with `requireOwner()`; all inputs through zod; new table gets RLS (custom migration).

## Review Focus

1. Two redeem clicks at once (double submit) → only one redemption (Task 1 test: redeem twice with exactly `goal` stamps → second `not_enough`).
2. Loyalty off (`goal` 0) → card hidden, redeem `disabled`, never a division or "0 de 0" (Task 1 test).
3. Goal lowered below already-available stamps → card shows full, redeem uses `goal` (Task 1 test).
4. Search text with `%`, `_` or a quote → treated literally, no error (Task 2 test).
5. A guest-only client (no account) → detail page works, no loyalty block, no redeem button (Task 2 test + page).

---

### Task 1: Loyalty data and rules

**Files:** Modify `src/server/db/schema.ts` (+ generated and `--custom` RLS migrations), `src/server/admin/settings.ts` (`updateLoyaltySettings`), `src/server/accounts/export.ts` (`loyalty`). Create `src/server/loyalty.ts`. Test `tests/integration/loyalty.test.ts`.

**Interfaces (produces):**
- `type Loyalty = { goal: number; reward: string; earned: number; used: number; available: number; onCard: number; full: boolean }` (`goal` 0 → `onCard` 0, `full` false)
- `getLoyalty(userId: string): Promise<Loyalty>`
- `redeemReward(input: unknown /* { userId } */, ownerId: string, now: Date): Promise<{ ok: true } | { ok: false; error: "invalid_input" | "not_found" | "disabled" | "not_enough" }>` — in a transaction that locks the user row.
- `updateLoyaltySettings(input: { goal: number; reward: string }): Promise<SettingsResult>`
- `AccountExport.loyalty: { stamps: number; redemptions: { stampsUsed: number; redeemedAt: string }[] }`

- [ ] Tests: counts only completed bookings of the account; redeem with full card → leftovers; second redeem → `not_enough`; goal 0 → `disabled` and `full` false; goal lowered → full; settings validation (31, -1, 61 chars → `invalid_input`); export; delete account removes redemptions. FAIL → implement → PASS. Commit "Fidelidad: sellos y canje".

### Task 2: Clients for the owner

**Files:** Create `src/server/admin/clients.ts`. Test `tests/integration/clients.test.ts`.

**Interfaces (produces):**
- `type ClientRow = { id: string; name: string; phone: string; visits: number; lastVisit: Date | null; userId: string | null; stamps: number | null; averageGiven: number | null }`
- `listClients(query: string): Promise<ClientRow[]>` — customers table; `query` trimmed, max 60, matches name (accent-insensitive not required, case-insensitive) or phone digits, `%`/`_` escaped; newest last visit first, max 100.
- `getClient(customerId: string): Promise<ClientDetail | null>` with `ClientDetail = ClientRow & { bookings: { id; startsAt; status; serviceName; barberName; priceCop }[]; reviews: { rating; comment; ownerReply; createdAt; barberName }[]; loyalty: Loyalty | null }`; null for non-uuid or unknown.
- `userId` = the most recent account linked to the customer's bookings.

- [ ] Tests: visits/last visit/has account/stamps/average; search by name, by phone, with `%`; guest-only client → `userId` null, `loyalty` null; unknown id → null. FAIL → implement → PASS. Commit "Clientes: lista y detalle".

### Task 3: Screens

**Files:** Create `src/components/site/account/loyalty-card.tsx`, `src/app/admin/ajustes/loyalty-settings.tsx`, `src/app/admin/clientes/page.tsx`, `src/app/admin/clientes/[id]/page.tsx` + `actions.ts`. Modify `src/app/cuenta/page.tsx`, `src/app/admin/ajustes/page.tsx` + `actions.ts`, `src/app/admin/layout.tsx` (nav "Clientes").

- [ ] E2E `tests/e2e/loyalty.spec.ts`: owner sets goal 1 in Ajustes → customer books, owner marks attended → customer's Cuenta shows the full card message → owner finds the client in Clientes, opens it, "Canjear premio" → customer's card back to 0 de 1. Full gate + e2e PASS. Commit "Fidelidad y clientes en pantalla".

### Task 4: Ship

- [ ] Final whole-branch review (fresh reviewer), fix Critical/Important with RED→GREEN tests.
- [ ] Push, PR, subscribe, CI green, decision card before merging, verify production deploy READY.
