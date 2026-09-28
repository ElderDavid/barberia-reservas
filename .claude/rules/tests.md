---
description: Test conventions
paths:
  - "tests/**"
---

# Tests

- `tests/unit/**/*.test.ts` — pure logic, no DB. Run: `pnpm test:unit <file>`.
- `tests/integration/**/*.test.ts` — real Postgres (`TEST_DATABASE_URL`), rebuilt from migrations
  by `tests/setup/global-setup.ts`. Start each test with `await truncateAll()` and
  `await seedShop()` from `tests/setup/`. Files run one at a time.
- `tests/e2e/**/*.spec.ts` — Playwright, Pixel 7, port 3100, e2e database reset and seeded by the
  web server command in `playwright.config.ts`. Log in with `OWNER_EMAIL` / `OWNER_PASSWORD`.
- Import app code with relative `.ts` paths (`../../src/server/booking/create.ts`).
- Pass a fixed `now` to business functions; never depend on the real clock or on test order.
- Assert integers for money, never formatted strings (`Intl` output differs across ICU versions).
- A failing assertion is fixed in the code, never by editing the expected value from the blueprint.
