---
description: Wompi checkout, webhook and money ledger conventions
paths:
  - "src/server/payments/**"
  - "src/app/api/webhooks/**"
  - "src/server/admin/sales.ts"
---

# Payments

- Checkout: GET `https://checkout.wompi.co/p/` with `public-key`, `currency=COP`,
  `amount-in-cents` (= COP × 100), `reference` (`BK-<booking id>`), `signature:integrity`,
  `redirect-url` (`<APP_URL>/cita/<token>`) and `expiration-time` (hold expiry, ISO-8601).
- Integrity signature: SHA-256 hex of `reference + amountInCents + "COP" + expirationTime + WOMPI_INTEGRITY_SECRET`.
- Webhook checksum: concatenate the values named in `signature.properties` (paths inside `data`,
  e.g. `transaction.id`), then `timestamp`, then `WOMPI_EVENTS_SECRET`; SHA-256 hex; compare
  case-insensitively with `signature.checksum`. Mismatch → 400, no writes.
- Webhook handling is idempotent: the payment row's final status and the unique
  `(booking_id, kind)` index on `sales` make replays no-ops. Always answer 200 to a valid event,
  even when it changes nothing, or Wompi retries (30 min, 3 h, 24 h).
- An approved amount that differs from `payments.amount_cop × 100` never confirms a booking.
- The `sales` table is the income ledger: `deposit` (online, method `wompi`), `balance`,
  `walk_in`, and `refund` (negative amount). Dashboard income is the sum of `sales.amount_cop`.
