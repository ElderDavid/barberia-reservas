# Cuentas de clientes, parte 5: Inicio con cuenta y accesibilidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in customer opening Inicio sees "Hola, Ana", their next booking and their loyalty stamps above the usual home page; every signed-in and admin screen passes an automated WCAG 2.2 AA check; CLAUDE.md describes the real tab bar.

**Architecture:** `src/server/accounts/home.ts` returns the greeting data for one account in one call. A new `WelcomeBand` component renders it at the top of `src/app/page.tsx` only for customers. The axe checks that today cover signed-out pages are extended to signed-in customer and owner pages.

**Tech Stack:** Next.js App Router, Drizzle, Vitest, Playwright + @axe-core/playwright (already in the lockfile).

**Spec:** `docs/superpowers/specs/2026-10-07-cuentas-clientes-design.md` (§2 Inicio (con cuenta); §6 step 5).

## Global Constraints

- Inicio with an account: greeting "Hola, {first name}", next booking card with a button to see it, loyalty stamps, then the current home page unchanged. Without an account (or as the owner): today's home page, header keeps "Ingresar".
- Next booking = the earliest `held`/`confirmed` booking of the account starting at or after `now`; none → "No tienes citas próximas." with a "Reservar" link.
- Loyalty on Inicio is hidden when `goal` is 0, like on Cuenta.
- Motion only through the existing `globals.css` classes; colours only via tokens; touch targets ≥ 44px.
- Tabs in CLAUDE.md: Inicio, Reservar, Mis citas, Cuenta.

## Review Focus

1. Customer with a name of one word or extra spaces ("  ana ") → "Hola, ana" without stray spaces; empty-ish names never crash (Task 1 test).
2. A booking that already started today, a cancelled one, or one of another account → never shown as next (Task 1 test).
3. Owner signed in on Inicio → no greeting band, no crash (Task 2 e2e).
4. 320px wide with a long service and barber name → no horizontal scroll (Task 2 e2e).
5. Signed-in pages (Inicio, Cuenta, Mis citas, a booking, Calificar, admin Clientes/Opiniones/Ajustes) → zero axe violations (Task 3).

---

### Task 1: Greeting data

**Files:** Create `src/server/accounts/home.ts`. Test `tests/integration/account-home.test.ts`.

**Interfaces (produces):**
- `type AccountHome = { firstName: string; next: { id: string; startsAt: Date; serviceName: string; barberName: string; status: "held" | "confirmed" } | null; loyalty: Loyalty }`
- `getAccountHome(userId: string, now: Date): Promise<AccountHome | null>` — null for an unknown user.

- [ ] Tests: first name from "  Ana María  " → "Ana"; next = earliest upcoming confirmed/held; past, cancelled and other accounts' bookings ignored; none → `next` null; loyalty matches `getLoyalty`; unknown user → null. FAIL → implement → PASS. Commit "Inicio: datos del saludo".

### Task 2: Welcome band on Inicio

**Files:** Create `src/components/site/account/welcome-band.tsx`. Modify `src/app/page.tsx`. Test `tests/e2e/home-account.spec.ts`.

- [ ] E2E: register → book → Inicio shows "Hola, Mateo", the next booking with "Ver cita" going to `/mis-citas/<id>`; at 320px no sideways scroll; owner on Inicio sees no greeting. Full gate + e2e PASS. Commit "Inicio con saludo y próxima cita".

### Task 3: Accessibility review and docs

**Files:** Create `tests/e2e/a11y-signed-in.spec.ts`. Modify whatever the check finds; `CLAUDE.md` (tab list).

- [ ] axe WCAG 2.2 AA on signed-in customer pages (Inicio, Cuenta, Mis citas, the booking page) and owner pages (Agenda, Clientes, a client, Opiniones, Ajustes). Fix every violation. Update CLAUDE.md tabs. Full gate + e2e PASS. Commit "Accesibilidad con sesión y documentación".

### Task 4: Ship

- [ ] Final whole-branch review (fresh reviewer), fix Critical/Important with RED→GREEN tests.
- [ ] Push, PR, subscribe, CI green, decision card before merging, verify production deploy READY.
