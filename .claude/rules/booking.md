---
description: Availability, booking, time-zone and self-service rules
paths:
  - "src/server/booking/**"
  - "src/lib/time.ts"
  - "src/app/reservar/**"
  - "src/app/cita/**"
---

# Booking

- `generateSlots` in `src/server/booking/slots.ts` is pure: no DB, no `new Date()`; `now` is an input.
- Availability is advisory; the insert is authoritative. Inside `createBooking`'s transaction:
  expire stale holds, re-validate the slot, insert, map `23P01` → `slot_taken`.
- `blocked_from = starts_at`, `blocked_until = ends_at + buffer_after_minutes`. The exclusion
  constraint compares `tstzrange(blocked_from, blocked_until, '[)')`, so back-to-back is allowed.
- Opening hours are wall-clock times in `shop_settings.timezone` (default `America/Bogota`).
  Convert with `src/lib/time.ts`; never add 24h to an instant to get "tomorrow".
- Non-existent local times (DST spring-forward) are skipped; ambiguous ones use the first occurrence.
- Phones: accept `3XXXXXXXXX` (10 digits, optional `+57`/`57`, spaces), store `57` + 10 digits.
- Customer self-service (cancel/reschedule) is allowed only while
  `now <= starts_at - self_service_cutoff_hours`; after that return `cutoff_passed` and show the
  shop's WhatsApp. Owner actions ignore the cutoff.
- Reschedule = cancel the original (`cancel_reason = 'reprogramada'`) + insert the new booking
  with `rescheduled_from_id`, in one transaction. A paid deposit moves: original `transferred`,
  new `paid`.
- Manage links carry a 32-byte random token (base64url); only its SHA-256 hex is stored.
