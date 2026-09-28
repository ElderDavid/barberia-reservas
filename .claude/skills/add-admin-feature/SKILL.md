---
name: add-admin-feature
description: Use when adding or changing an owner-only screen or action in the barbershop admin (anything under /admin — agenda, ventas, gastos, resumen, ajustes): a new form, a new server action, a new report. Covers the session guard, validation, business function and test.
---

# Add an owner (admin) feature

## When to use
- "add a button in the admin", "new report", "let the owner edit …", "new admin page"

## Steps
1. Business logic first, in `src/server/admin/<area>.ts`: a plain async function that takes
   validated input and `now: Date`, returns `{ ok: true, … } | { ok: false, error: "<code>" }`,
   and uses relative `.ts` imports.
2. Test it in `tests/integration/<area>.test.ts` using `seedShop()` from `tests/setup/fixtures.ts`
   and `truncateAll()` in `beforeEach`.
3. Server action in `src/app/admin/<area>/actions.ts` (`"use server"`), signature
   `(formData: FormData)`: first line `await requireOwner();`, then parse with zod, call the business
   function; on success `revalidatePath()` the page, on failure `redirect("<page>?error=<code>")`.
4. Page `src/app/admin/<area>/page.tsx`: `export const dynamic = "force-dynamic";`, a Server
   Component that reads data through `src/server/admin/*`, forms with `action={…}`, errors shown
   as text in `role="alert"`, an empty state for every list.
5. Add the link to the nav in `src/app/admin/layout.tsx` if it is a new page.

## Verify
```bash
pnpm db:up                                        # expect: exit 0
pnpm test:int tests/integration/<area>.test.ts    # expect: exit 0, 0 failed
pnpm typecheck && pnpm lint                       # expect: exit 0
pnpm build                                        # expect: exit 0
```

## Do not
- Put a query or a business rule inside a page or an action.
- Skip `requireOwner()` because "the layout already checks" — server actions are separate POST endpoints.
- Store money as anything but integer COP.
