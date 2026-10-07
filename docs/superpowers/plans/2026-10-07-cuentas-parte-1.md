# Cuentas de clientes — Parte 1 (cuentas + parte legal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers can sign up, sign in, reset their password, edit/download/delete their account, and accept versioned privacy/terms; the owner keeps exclusive access to `/admin`.

**Architecture:** One `user` table with a `role` column (`owner` | `customer`) guarded server-side; better-auth sign-up re-enabled with `role` non-writable. Legal pages read the responsible party's data from `shop_settings`; consents are stored with a policy version. Mail goes through Resend's HTTP API and degrades to a WhatsApp hint without a key.

**Tech Stack:** Next.js App Router, better-auth 1.7.6, Drizzle + Postgres, zod, Vitest, Playwright, Tailwind v4 tokens.

**Spec:** `docs/superpowers/specs/2026-10-07-cuentas-clientes-design.md` (sections 1, 2 "Entrar/Crear cuenta/Recuperar/Cuenta", 4 "Usuarios y roles/Correo/Borrar cuenta/Seguridad", 5 entire).

## Global Constraints

- CLAUDE.md rules apply: relative `.ts` imports in server/lib/scripts/tests, `@/` in app/components; `import type`; business functions take `now: Date` and return `{ ok } | { ok: false, error }`; zod on every input; `dynamic = "force-dynamic"` on DB pages; no hex in `.tsx`; components < 250 lines.
- Copy in Spanish (Colombia), "tú". Password minimum 10 characters.
- Reset link expires in 1 hour (`resetPasswordTokenExpiresIn: 3600`).
- Sign-up consent checkbox is unchecked by default; text: "Autorizo el tratamiento de mis datos según la Política de tratamiento de datos y acepto los Términos y condiciones."
- Current policy version constant: `POLICY_VERSION = "2026-10-07"` in `src/lib/legal.ts`.
- Minimum age statement: registration is for people 14 or older.
- Every new table enables RLS (add-migration skill).
- Gate before PR: `pnpm format && pnpm lint && pnpm typecheck && pnpm test`.

## Review Focus

1. Someone POSTs to better-auth sign-up with `role: "owner"` → user is still `customer` (test in Task 2).
2. A customer session opens `/admin` or calls an admin action → redirected to `/entrar` (test in Task 2).
3. `ensureOwner` with customers present → only the `owner` row changes (test in Task 2).
4. Reset requested for an unknown email → same success message, no mail sent, no leak (test in Task 4).
5. Deleting an account with past bookings → bookings and `customers` row survive, sessions are gone (test in Task 5).

---

### Task 1: Schema — roles, phone, consents, legal fields

**Files:**
- Modify: `src/server/db/schema.ts`
- Create: `drizzle/NNNN_*.sql` via `pnpm db:generate`, plus a custom migration `NNNN_user_roles.sql`
- Test: `tests/integration/schema.test.ts`

**Interfaces:**
- Produces: `user.role: text not null default 'customer'` with check `role in ('owner','customer')`; `user.phone: text null`; table `consents(id uuid pk, user_id text null fk user on delete cascade, customer_id uuid null fk customers on delete set null, kind text check in ('privacy','terms'), version text, channel text check in ('registro','reserva','reacepta'), accepted_at timestamptz default now())`; `shop_settings.legal_name text not null default ''`, `legal_id_type text not null default ''` (`'CC' | 'NIT' | ''`), `legal_id_number text not null default ''`, `privacy_email text not null default ''`.
- Custom SQL: `UPDATE "user" SET role = 'owner';` (runs once, before any customer exists), `ALTER TABLE consents ENABLE ROW LEVEL SECURITY;`.

- [ ] Step 1: Add to `schema.test.ts`: `it("user.role defaults to customer and rejects other values")` (insert without role → `customer`; insert role `'admin'` → SQLSTATE `23514`) and `it("consents and legal columns exist")`.
- [ ] Step 2: `pnpm test:int tests/integration/schema.test.ts` → FAIL.
- [ ] Step 3: Edit schema, `pnpm db:generate`, `pnpm exec drizzle-kit generate --custom --name=user_roles`, write the SQL above, `pnpm db:migrate`.
- [ ] Step 4: Re-run → PASS; `pnpm db:check` → exit 0.
- [ ] Step 5: Commit "Esquema: roles, teléfono, autorizaciones y datos legales".

### Task 2: Roles in auth, guards and owner sync

**Files:**
- Modify: `src/server/auth.ts`, `src/server/session.ts`, `scripts/create-owner.ts`, `src/app/admin/layout.tsx` (unchanged call, new semantics)
- Test: `tests/integration/roles.test.ts`, `tests/integration/owner.test.ts`

**Interfaces:**
- Produces: better-auth config `emailAndPassword.disableSignUp: false`, `user.additionalFields: { role: { type: "string", input: false, defaultValue: "customer" }, phone: { type: "string", required: false, input: true } }`.
- Produces: `getSessionUser(): Promise<SessionUser | null>` where `SessionUser = { id: string; name: string; email: string; role: "owner" | "customer"; phone: string | null }`; `requireOwner()` redirects to `/entrar` unless `role === "owner"`; `requireCustomer()` redirects to `/entrar?volver=<path>` unless signed in as `customer`.
- Produces: `ensureOwner` selects `where role = 'owner'`; creating sets `role: "owner"`.
- Produces: `signUpCustomer(input: { name; email; phone; password; consent: true }, now: Date)` in `src/server/accounts/sign-up.ts` → `{ ok: true; userId } | { ok: false; error: "invalid_input" | "email_taken" }`; normalizes phone with `normalizePhone`, calls `auth.api.signUpEmail`, writes two `consents` rows (`privacy`, `terms`, channel `registro`, `POLICY_VERSION`).

- [ ] Step 1: Tests: `signUpEmail` with body `{ role: "owner" }` yields `role = 'customer'`; `signUpCustomer` with phone `"300 123 4567"` stores `573001234567` and 2 consents; repeated email → `email_taken`; owner.test adds `it("leaves customers alone")` (a customer created first, `ensureOwner` creates a separate owner and later updates only it).
- [ ] Step 2: Run → FAIL.
- [ ] Step 3: Implement. `requireOwner` and `requireCustomer` read `role` from the session user.
- [ ] Step 4: Add `tests/e2e/admin-login.spec.ts` case: a signed-in customer visiting `/admin` lands on `/entrar`.
- [ ] Step 5: Gate → PASS. Commit "Roles de dueño y cliente".

### Task 3: Legal module and pages

**Files:**
- Create: `src/lib/legal.ts`, `src/app/terminos/page.tsx`, `src/components/site/legal/*.tsx` (section components ≤ 250 lines each)
- Modify: `src/app/privacidad/page.tsx`, `src/components/site/site-footer.tsx`, `src/server/shop.ts` (`getLegalInfo()`), `src/server/admin/settings.ts` + `src/app/admin/ajustes/*` (block "Datos legales"), `docs/play-store.md` (Data safety answers)
- Test: `tests/integration/settings.test.ts`, `tests/unit/legal.test.ts`

**Interfaces:**
- Produces: `POLICY_VERSION`, `LEGAL_PROCESSORS = [{ name: "Supabase", purpose: "base de datos", country: "EE. UU." }, { name: "Vercel", … }, { name: "Wompi", purpose: "pagos", country: "Colombia" }, { name: "Resend", purpose: "correos", country: "EE. UU." }]`, `legalGaps(info: LegalInfo): string[]` (names of empty fields).
- Produces: `getLegalInfo(): Promise<LegalInfo>` = `{ shopName, address, whatsappPhone, legalName, legalIdType, legalIdNumber, privacyEmail, cancelCutoffHours }`; `updateLegalInfo(input)` zod: `legalName` 2–120, `legalIdType` enum `CC|NIT`, `legalIdNumber` digits 5–15 (NIT may include `-d`), `privacyEmail` email.
- Page content: exactly the topics listed in spec §5 table for `/privacidad` and `/terminos`, with Ley 1581/2012, Decreto 1377/2013 (Decreto 1074/2015), Ley 1480/2011, Ley 527/1999, SIC complaint right, response times 10 and 15 business days, 24-month retention, under-14 rule, session cookie only, processors table, RNBD note, version date; missing legal fields render "por completar".

- [ ] Step 1: Unit test `legalGaps` (all empty → 4 gaps; full → []); integration test `updateLegalInfo` rejects `legalIdType: "RUT"` and persists a valid set.
- [ ] Step 2: Run → FAIL. Step 3: Implement module, settings block, pages, footer links ("Privacidad", "Términos"), admin banner on Agenda when `legalGaps` is non-empty.
- [ ] Step 4: `bash scripts/serve-check.sh /terminos 200` after `pnpm build`; gate → PASS. Commit "Política de datos y términos".

### Task 4: Mail and password reset

**Files:**
- Create: `src/server/mail.ts`, `src/app/recuperar/page.tsx`, `src/app/restablecer/page.tsx`
- Modify: `src/lib/env.ts` (`mailEnv(): { RESEND_API_KEY: string; MAIL_FROM: string } | null`, optional group), `src/server/auth.ts` (`sendResetPassword`, `resetPasswordTokenExpiresIn: 3600`, `revokeSessionsOnPasswordReset: true`), `.env.example`, CLAUDE.md env table
- Test: `tests/unit/mail.test.ts`, `tests/integration/password-reset.test.ts`

**Interfaces:**
- Produces: `sendMail(msg: { to: string; subject: string; text: string; html: string }, fetchImpl = fetch): Promise<{ ok: true } | { ok: false; error: "mail_disabled" | "mail_failed" }>` posting to `https://api.resend.com/emails` with `Authorization: Bearer <key>`.
- Produces: `/recuperar` always answers "Si el correo está registrado, te enviamos un enlace. Revisa también la carpeta de spam." When `mailEnv()` is null it instead shows the WhatsApp link and does not call the API.

- [ ] Step 1: Unit test `sendMail` with a fake fetch (body fields, header) and with no env (`mail_disabled`). Integration: request reset for unknown email → no fake-fetch call; for a customer → one call whose text contains `/restablecer?token=`; `resetPassword` with that token changes the password and deletes sessions.
- [ ] Step 2–4: FAIL → implement → PASS. Commit "Recuperar contraseña por correo".

### Task 5: Account screens — sign up, sign in, Cuenta, download, delete

**Files:**
- Create: `src/app/registro/page.tsx` + `actions.ts`, `src/app/cuenta/page.tsx` + `actions.ts`, `src/app/cuenta/borrar/page.tsx`, `src/app/cuenta/datos/route.ts`, `src/server/accounts/profile.ts`, `src/server/accounts/delete.ts`, `src/server/accounts/export.ts`, `src/components/site/account/*.tsx`
- Modify: `src/app/entrar/page.tsx` (shared login, redirect by role, "¿Olvidaste tu contraseña?", "Crear cuenta"; honor `?volver=`), `src/components/site/app-tab-bar.tsx` (tabs Inicio · Reservar · Mis citas · Cuenta), `src/components/site/site-header.tsx` ("Entrar" / avatar initial when signed in)
- Test: `tests/integration/accounts.test.ts`, `tests/e2e/account.spec.ts`

**Interfaces:**
- Produces: `updateProfile(userId, { name, phone }, now)`, `changePassword` via `auth.api.changePassword`, `exportAccount(userId): Promise<AccountExport>` (`{ profile, consents, bookings: [] }`; Part 2 fills bookings), `deleteAccount(userId, now)` deletes the `user` row (cascade: session, account, consents with user_id) and returns `{ ok: true }`; refuses `role = 'owner'` with `owner_cannot_delete`.
- `/cuenta/datos` returns `application/json` with `Content-Disposition: attachment; filename="mis-datos.json"`, only for the signed-in customer.
- `/cuenta/borrar` public: steps to delete; signed-in: confirm form that requires typing "BORRAR".
- Design: run the frontend-design skill for these screens; app-style cards (avatar initial, chips), consistent with tokens; 320px no horizontal scroll.

- [ ] Step 1: Integration tests: profile update normalizes phone and rejects bad phone; export contains only own data; delete removes user + sessions, keeps a booking row with `customer_id` intact; owner delete refused. E2E: register → lands on `/cuenta` → sign out → sign in → `/cuenta`; delete flow returns to `/` signed out.
- [ ] Step 2–4: FAIL → implement → PASS (full gate incl. `pnpm test:e2e`). Commit "Cuenta del cliente".

### Task 6: Ship

- [ ] Accessibility review of `/registro`, `/entrar`, `/cuenta`, `/privacidad`, `/terminos` (design:accessibility-review skill), fix findings.
- [ ] Push branch, open PR (template-less: Before/After/How), subscribe, drive CI green, squash-merge per merge-policy, confirm production deploy READY and that `/terminos` loads on the live domain.
