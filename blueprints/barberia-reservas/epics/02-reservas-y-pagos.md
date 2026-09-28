# Epic 02: Reservas, pagos y operación diaria

> Un cliente reserva desde el celular pagando en efectivo o por transferencia con Wompi, gestiona su cita con un enlace privado, y el dueño opera la agenda: reprograma, cancela, cobra, marca no-shows, registra ventas sin cita y reembolsos.

| | |
|---|---|
| **Epic id** | `02-reservas-y-pagos` |
| **Tasks** | `E2-T1` … `E2-T6` |
| **Depends on** | `01-fundacion` |
| **Unlocks** | `03-negocio-y-lanzamiento` (resumen y despliegue) |
| **Parallel with** | `03-negocio-y-lanzamiento` tareas `E3-T1` (gastos) y `E3-T3` (ajustes), que no comparten archivos |

No necesitas ningún otro archivo para completar esta épica. Todo lo de abajo se repite aquí a propósito.

---

## Stack

Next.js 16 (App Router) · TypeScript 6 · Tailwind CSS 4 · componentes propios en `src/components/ui/` ·
Postgres 17 (Docker en local, Supabase en producción) · Drizzle ORM + driver `postgres` · better-auth
(correo y clave, solo el dueño) · Wompi Web Checkout · Vercel.
Gestor de paquetes: `pnpm` (versión en `package.json#packageManager`). Node fijado en `.nvmrc`.
Las versiones de dependencias están en el lockfile — léelo, nunca adivines una.

| Tarea | Comando |
|---|---|
| Postgres local | `pnpm db:up` / `pnpm db:down` |
| Dev | `pnpm dev` |
| Typecheck | `pnpm typecheck` |
| Lint / formato | `pnpm lint` · `pnpm format` |
| Unit (un archivo) | `pnpm test:unit tests/unit/<archivo>.test.ts` |
| Integración (un archivo, requiere `pnpm db:up`) | `pnpm test:int tests/integration/<archivo>.test.ts` |
| E2E (un archivo; resetea la base e2e y levanta Next en :3100) | `pnpm test:e2e tests/e2e/<archivo>.spec.ts` |
| Migraciones | `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:check` |
| Semilla | `pnpm db:seed` |
| Servir la build y comprobar una ruta | `bash scripts/serve-check.sh <ruta> <estado> [cabecera]` |

**Gate:** `pnpm lint && pnpm typecheck && pnpm test` (con `pnpm db:up`) pasa antes de marcar `done`
cualquier tarea de esta épica.

Si una tarea verifica contra Postgres, arráncalo primero con `pnpm db:up`. `docker-compose.yml`,
`vitest.config.ts`, `playwright.config.ts`, `drizzle.config.ts`, `tests/setup/*`, `scripts/db-reset.ts`
y `scripts/serve-check.sh` llegaron desde `workspace/` y ya están en la raíz: no los escribes tú y
nunca reemplazas un servicio real por uno falso.

## Directory subtree

Solo lo que toca esta épica:

```
src/
  app/
    reservar/page.tsx, reservar/actions.ts        # NUEVO (T1)
    cita/[token]/page.tsx, cita/[token]/actions.ts   # NUEVO (T2), page EDITADO (T3)
    api/webhooks/wompi/route.ts                   # NUEVO (T4)
    admin/page.tsx                                # existe (01); EDITADO (T5, T6)
    admin/actions.ts                              # NUEVO (T5), EDITADO (T6)
    admin/ventas/page.tsx                         # NUEVO (T6)
  server/
    booking/token.ts                              # NUEVO (T1)
    booking/create.ts                             # NUEVO (T1), EDITADO (T3)
    booking/manage.ts                             # NUEVO (T2), EDITADO (T5)
    booking/availability.ts, slots.ts             # existen (01), solo lectura
    payments/wompi.ts                             # NUEVO (T3)
    payments/webhook.ts                           # NUEVO (T4)
    admin/agenda.ts                               # NUEVO (T5)
    admin/sales.ts                                # NUEVO (T6)
    session.ts, auth.ts, db/*                     # existen (01), solo lectura
tests/
  integration/booking-create, booking-manage, wompi-checkout, wompi-webhook, agenda, sales (.test.ts)   # NUEVO
  e2e/booking-cash.spec.ts, booking-transfer.spec.ts   # NUEVO
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar
un archivo que no aparece aquí, detente y repórtalo: el límite de la épica está mal.

## Data model touched here

| Entidad | Campos que usa o escribe | Notas |
|---|---|---|
| `customers` | `name`, `phone` (`57` + 10 dígitos, único), `consent_at` | upsert por teléfono |
| `bookings` | todos | estados `held → confirmed → completed \| cancelled \| no_show`; nunca se borran |
| `payments` | `reference` (`BK-<id>`), `amount_cop`, `status`, `wompi_transaction_id` | uno por reserva por transferencia |
| `sales` | `kind` (`deposit`, `balance`, `walk_in`, `refund`), `method`, `amount_cop`, `booking_id` | índice único `(booking_id, kind)` cuando hay `booking_id` |
| `shop_settings` | `deposit_percent`, `self_service_cutoff_hours`, `hold_minutes`, `whatsapp_phone`, `timezone` | solo lectura aquí |

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| `01-fundacion` | `getAvailability({ day, serviceId, barberId, now })` | slots válidos según reglas, sin reservas activas ni apartados vigentes |
| `01-fundacion` | `requireOwner()` | redirige a `/entrar` sin sesión |
| `01-fundacion` | `db`, `sqlClient`, esquema completo | restricción `bookings_no_overlap` ya existe |
| `01-fundacion` | `wallTimeToInstant`, `localDay`, `formatDateTime`, `formatCop`, `parseCop`, `Button`, `Field`, `Card` | ver épica 01 |

**Produced** — las épicas siguientes dependen de estas firmas:

| Export | Signature | Used by |
|---|---|---|
| `src/server/booking/create.ts` → `createBooking`, `expireStaleHolds` | `(input, now) => Promise<CreateBookingResult>`, `(tx, now) => Promise<number>` | 03 (`E3-T3` pruebas, `E3-T5` cron) |
| `src/server/booking/manage.ts` → `findByToken`, `cancelBooking`, `rescheduleBooking`, `ownerReschedule`, `ownerCancel` | ver T2 y T5 | 03 |
| `src/server/payments/wompi.ts` → `integritySignature`, `depositFor`, `checkoutUrl` | ver T3 | — |
| `src/server/payments/webhook.ts` → `eventChecksum`, `handleWompiEvent` | ver T4 | — |
| `src/server/admin/sales.ts` → `completeBooking`, `markNoShow`, `recordWalkIn`, `markRefunded`, `listSales`, `listPendingRefunds` | ver T6 | 03 (`E3-T2` resumen) |

## Conventions that bite in this area

- `src/server/**`, `src/lib/**`, `scripts/**` y `tests/**` se importan entre sí con rutas relativas
  que terminan en `.ts` (Node ejecuta los scripts con su soporte nativo de TypeScript y no entiende
  `@/`). `src/app/**` y `src/components/**` usan `@/`.
- `import type` para tipos; sin `enum`, `namespace` ni propiedades de parámetro en constructores.
- Toda página o route handler que lee la base exporta `export const dynamic = "force-dynamic";`.
- Las funciones de negocio reciben `now: Date` y devuelven `{ ok: true, … } | { ok: false, error }`.
- Dinero: enteros COP en columnas `*_cop`; se formatea solo al mostrar.
- Horas: instantes UTC en `timestamptz`; horarios de la tienda como hora local de
  `shop_settings.timezone` (`America/Bogota`), convertidos con `src/lib/time.ts`.

Reglas completas: `CLAUDE.md`. Reglas por área: `.claude/rules/*.md`. Ambas están en la raíz del
proyecto (llegaron desde `workspace/` en el Bootstrap).

---

## Tasks

Mismo orden que `tasks.json`. Ese orden es el orden de construcción: trabaja de arriba abajo y no
reordenes por prioridad ni por lo que parezca rápido.

### `E2-T1` — Reserva pública con pago en efectivo

**Depends on:** `E1-T5`, `E1-T6` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

1. `src/server/booking/token.ts`: `newManageToken(): { token: string; hash: string }` — 32 bytes de
   `crypto.randomBytes` en base64url y su SHA-256 hex; `hashToken(token: string): string`.
2. `src/server/booking/create.ts` — `createBooking(input, now)`:

```ts
export type CreateBookingInput = {
  serviceId: string;
  barberId: string | "any";
  startsAt: string;            // ISO instant chosen from getAvailability
  name: string;
  phone: string;               // as typed by the customer
  consent: boolean;
  method: "cash" | "transfer";
};
export type CreateBookingResult =
  | { ok: true; bookingId: string; token: string }
  | { ok: false; error: "invalid_input" | "slot_unavailable" | "slot_taken" | "too_many_bookings" | "transfer_unavailable" };
```

   Orden: validar con zod (nombre 2–60 caracteres; teléfono normalizado a `57` + 10 dígitos que
   empiezan por 3, aceptando espacios, `+57` o `57` al inicio; `consent === true`) → `invalid_input`.
   En este paso `method: "transfer"` devuelve `transfer_unavailable` (el paso 9 lo implementa).
   Luego, en una transacción: comprobar con `getAvailability` (mismo `day` local, mismo servicio) que
   la hora está disponible para el barbero (o para alguno si es `"any"`) → si no, `slot_unavailable`;
   upsert del cliente por `phone` (actualiza nombre y `consent_at = now`); si el cliente ya tiene 3
   reservas futuras `held` o `confirmed` → `too_many_bookings`; insertar la reserva con
   `status 'confirmed'`, `payment_method 'cash'`, `price_cop` del servicio, `deposit_cop 0`,
   `deposit_status 'none'`, `ends_at = starts_at + duración`, `blocked_from = starts_at`,
   `blocked_until = ends_at + buffer_after_minutes`, `manage_token_hash`. Si Postgres responde `23P01`,
   con un barbero fijo devuelve `slot_taken`; con `"any"` reintenta con el siguiente barbero disponible
   a esa hora (usa un `SAVEPOINT` por intento) y solo si todos fallan devuelve `slot_taken`.
3. `src/app/reservar/page.tsx` — Server Component, `export const dynamic = "force-dynamic";`,
   `<h1>` «Reserva tu cita». Sin JavaScript de cliente: cada elección es un enlace o un formulario GET
   que agrega parámetros a la URL: `servicio` → `barbero` (lista de barberos activos + «Cualquiera»,
   valor `any`) → `dia` (los próximos 14 días desde `localDay(now)`, con nombre del día) → `hora`
   (botones con los slots de `getAvailability`; si no hay, «No hay horarios disponibles este día.»)
   → formulario final (POST al server action) con `Field` «Nombre», `Field` «Celular»
   (`inputMode="numeric"`, `autoComplete="tel"`), método de pago (radios «Efectivo en la barbería» y
   «Transferencia (pago completo en línea)»), casilla obligatoria «Autorizo el tratamiento de mis
   datos (nombre y celular) para gestionar mi cita, según la <a href="/privacidad">política de
   privacidad</a>.» y botón «Confirmar reserva». Muestra el resumen (servicio, precio con `formatCop`,
   barbero, fecha y hora con `formatDateTime`).
4. `src/app/reservar/actions.ts` — `"use server"`; `reservar(formData: FormData)` (el formulario es un
   `<form action={reservar}>` normal, sin JavaScript de cliente): arma el input, llama
   `createBooking(input, new Date())`; con éxito ``redirect(`/cita/${token}`)`` (la página existe desde el
   paso 8); con error `redirect` a la misma URL de `/reservar` (con sus parámetros) agregando
   `&error=<código>`. La página muestra, en `role="alert"`, el mensaje de cada código:
   `invalid_input` «Revisa tu nombre, tu celular y la autorización de datos.»,
   `slot_unavailable`/`slot_taken` «Ese horario ya no está disponible. Elige otro.»,
   `too_many_bookings` «Ya tienes 3 citas pendientes. Cancela una para reservar otra.»,
   `transfer_unavailable` «El pago en línea aún no está disponible.».
5. `tests/integration/booking-create.test.ts` — `truncateAll()` + `seedShop()`; `now`
   `2026-10-01T12:00:00Z`; hora de prueba `2026-10-05T15:00:00.000Z` (10:00 en Bogotá, lunes). Un caso
   por criterio; el de concurrencia lanza 50 `createBooking` con `Promise.all` y teléfonos distintos.

**Files**
- `src/server/booking/token.ts` — nuevo — token de gestión y su hash
- `src/server/booking/create.ts` — nuevo — `createBooking()` transaccional
- `src/app/reservar/page.tsx` — nuevo — flujo de reserva por pasos con `searchParams`
- `src/app/reservar/actions.ts` — nuevo — server action `reservar`
- `tests/integration/booking-create.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `createBooking` recibe una solicitud válida en efectivo para un slot libre THE SYSTEM SHALL insertar una fila en `bookings` con `status='confirmed'`, `payment_method='cash'`, `deposit_cop=0` y `price_cop` igual al precio vigente del servicio, y devolver un token cuyo SHA-256 hex es igual a `manage_token_hash`.
2. WHEN 50 llamadas a `createBooking` para el mismo barbero y la misma hora corren en paralelo THE SYSTEM SHALL devolver `{ ok: true }` exactamente una vez y `{ ok: false, error: "slot_taken" }` 49 veces, dejando una sola reserva.
3. WHEN la hora pedida no está en `getAvailability` para ese barbero y día (fuera de horario, dentro del aviso mínimo o más allá de `max_advance_days`) THE SYSTEM SHALL devolver `{ ok: false, error: "slot_unavailable" }` sin insertar nada.
4. WHEN el celular no es un móvil colombiano de 10 dígitos que empieza por 3 o no se dio la autorización de datos THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }` sin insertar nada.
5. WHEN un celular ya tiene 3 reservas futuras en `held` o `confirmed` THE SYSTEM SHALL devolver `{ ok: false, error: "too_many_bookings" }`.
6. WHEN `barberId` es `"any"` y el primer barbero por `sort_order` está ocupado a esa hora THE SYSTEM SHALL reservar con el siguiente barbero libre.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                               # expect: exit 0
pnpm test:int tests/integration/booking-create.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                           # expect: exit 0
pnpm lint                                                # expect: exit 0
pnpm build                                               # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T1: Reserva pública con pago en efectivo"
git tag step-07-booking-cash
# rollback target if the next step goes wrong: git reset --hard step-07-booking-cash
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **Nunca «consultar y luego insertar» como garantía.** La consulta de disponibilidad es solo validación de reglas; la restricción `bookings_no_overlap` es la que decide quién gana la carrera.
- **Con `"any"`, un `23P01` aborta la transacción entera** si no usas `SAVEPOINT`; sin él, el segundo intento falla con «current transaction is aborted».

### `E2-T2` — Página de la cita: cancelar y reprogramar por el cliente

**Depends on:** `E2-T1`, `E1-T4` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

1. `src/server/booking/manage.ts`:
   - `findByToken(token)` → la reserva (con servicio, barbero, cliente) cuyo `manage_token_hash` es
     `hashToken(token)`, o `null`.
   - `cancelBooking({ bookingId, actor, now, enforceCutoff, depositDecision? })` y
     `rescheduleBooking({ bookingId, newStartsAt, newBarberId?, actor, now, enforceCutoff })`.
     Resultado `{ ok: true, token?: string } | { ok: false, error: "not_found" | "invalid_state" | "cutoff_passed" | "slot_taken" }`.
   - Solo se gestionan reservas `confirmed` (`invalid_state` en otro caso). Con `enforceCutoff: true`
     (cliente) se exige `now <= starts_at - self_service_cutoff_hours`, si no `cutoff_passed`.
   - Cancelar: `status 'cancelled'`, `cancelled_at`, `cancelled_by = actor`; si `deposit_status = 'paid'`,
     pasa a `refund_pending` (cliente, o dueño con `depositDecision: "refund"`) o `forfeited`
     (dueño con `"forfeit"`).
   - Reprogramar, en una transacción: cancelar la original con `cancel_reason = 'reprogramada'`,
     insertar la nueva (`confirmed`, mismo servicio y `price_cop`, barbero nuevo o el mismo,
     `rescheduled_from_id` = original, token nuevo); si la original tenía `deposit_status = 'paid'`,
     la original queda `transferred` y la nueva `paid` con el mismo `deposit_cop`. `23P01` → revertir
     todo y `slot_taken`. El cliente reprograma solo a horas que `getAvailability` ofrece; el dueño
     (paso 11) no tiene esa restricción.
2. `src/app/cita/[token]/page.tsx` — `export const dynamic = "force-dynamic";`; token desconocido →
   `notFound()`. Muestra `<h1>` según estado: `confirmed` «Cita confirmada», `cancelled` «Cita
   cancelada» (y si `cancel_reason = 'reprogramada'`, «Esta cita fue reprogramada; usa el enlace nuevo.»),
   `completed` «Cita atendida», `no_show` «No asististe a esta cita», `held` «Pendiente de pago».
   Datos: servicio, barbero, fecha y hora local, precio, método de pago. Aviso: «Guarda este enlace:
   con él puedes cancelar o cambiar tu cita hasta N horas antes.» (N = `self_service_cutoff_hours`) y un
   enlace `https://wa.me/<whatsapp_phone>` «Escribir a la barbería». Si la cita es `confirmed` y
   todavía está dentro del plazo: formulario «Cancelar cita» y formulario «Cambiar hora» (elige día con
   un GET `?dia=` y hora entre los slots de `getAvailability` para el mismo barbero). Fuera de plazo:
   «Ya no puedes cambiarla desde aquí. Llama o escribe a la barbería.»
3. `src/app/cita/[token]/actions.ts` — `"use server"`; `cancelar(formData)` y `reprogramar(formData)`
   (formularios normales; con error ``redirect(`/cita/${token}?error=<código>`)`` y la página muestra el
   mensaje: `cutoff_passed` «Ya no puedes cambiarla desde aquí. Llama o escribe a la barbería.»,
   `slot_taken` «Ese horario ya no está disponible. Elige otro.») llaman a
   `manage.ts` con `actor: "customer"`, `enforceCutoff: true`, `now: new Date()`; tras reprogramar
   ``redirect(`/cita/${nuevoToken}`)``; tras cancelar `revalidatePath` de la página.
4. `tests/integration/booking-manage.test.ts` — un caso por criterio 1–5 con `now` fijo.
5. `tests/e2e/booking-cash.spec.ts` — en `/reservar` elige `Corte clásico`, «Cualquiera», el primer
   día con horarios, la primera hora, escribe nombre `Juan Pérez` y celular `3001234567`, marca la
   autorización, deja «Efectivo en la barbería», confirma; espera URL `/cita/…` y el encabezado
   «Cita confirmada»; pulsa «Cancelar cita» y espera «Cita cancelada».

**Files**
- `src/server/booking/manage.ts` — nuevo — `findByToken`, `cancelBooking`, `rescheduleBooking`
- `src/app/cita/[token]/page.tsx` — nuevo — detalle y acciones de la cita
- `src/app/cita/[token]/actions.ts` — nuevo — server actions `cancelar` y `reprogramar`
- `tests/integration/booking-manage.test.ts` — nuevo
- `tests/e2e/booking-cash.spec.ts` — nuevo — reserva en efectivo y cancelación de punta a punta

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN el cliente cancela con un token válido al menos `self_service_cutoff_hours` antes de `starts_at` THE SYSTEM SHALL poner `status='cancelled'` y `cancelled_by='customer'` y el slot SHALL volver a aparecer en `getAvailability`.
2. WHEN el cliente cancela o reprograma más tarde que `self_service_cutoff_hours` antes de `starts_at` THE SYSTEM SHALL devolver `{ ok: false, error: "cutoff_passed" }` sin cambiar nada.
3. WHEN el cliente reprograma a un slot libre THE SYSTEM SHALL cancelar la original con `cancel_reason='reprogramada'`, crear una reserva `confirmed` cuyo `rescheduled_from_id` es el id original y devolver un token nuevo.
4. WHEN el cliente reprograma a un slot ocupado THE SYSTEM SHALL devolver `{ ok: false, error: "slot_taken" }` y dejar la reserva original en `confirmed`.
5. WHEN una reserva con `deposit_status='paid'` se cancela a tiempo THE SYSTEM SHALL dejarla en `refund_pending`, y WHEN se reprograma THE SYSTEM SHALL marcar la original `transferred` y la nueva `paid` con el mismo `deposit_cop`.
6. WHEN `pnpm test:e2e tests/e2e/booking-cash.spec.ts` corre THE SYSTEM SHALL reservar en efectivo desde `/reservar` en un Pixel 7, llegar a `/cita/<token>` con «Cita confirmada», cancelarla ahí y mostrar «Cita cancelada», terminando con código 0.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                               # expect: exit 0
pnpm test:int tests/integration/booking-manage.test.ts   # expect: exit 0, 0 failed
pnpm test:e2e tests/e2e/booking-cash.spec.ts             # expect: exit 0, 0 failed
pnpm typecheck                                           # expect: exit 0
pnpm lint                                                # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T2: Página de la cita: cancelar y reprogramar por el cliente"
git tag step-08-booking-manage
# rollback target if the next step goes wrong: git reset --hard step-08-booking-manage
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **Reprogramar no es un `UPDATE` de la hora.** Es cancelar + crear en una transacción; un `UPDATE` se salta la validación de la hora nueva y pierde la historia.
- **El plazo se evalúa en instantes UTC** (`starts_at - horas`), nunca con la hora del navegador del cliente.

### `E2-T3` — Pago por transferencia con Wompi: apartado y enlace de pago

**Depends on:** `E2-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

1. `src/server/payments/wompi.ts`:
   - `integritySignature({ reference, amountInCents, currency, expirationTime?, secret }): string` —
     SHA-256 hex de `reference + amountInCents + currency + (expirationTime ?? "") + secret`.
   - `depositFor(priceCop: number, depositPercent: number): number` — `priceCop` si el porcentaje es
     100; si no, `Math.min(priceCop, Math.ceil((priceCop * depositPercent) / 100 / 1000) * 1000)`.
   - `checkoutUrl({ reference, amountCop, expiresAt, redirectUrl }): string` — lee `wompiEnv()`;
     `https://checkout.wompi.co/p/?` + `URLSearchParams` con `public-key`, `currency=COP`,
     `amount-in-cents` (= `amountCop * 100`), `reference`, `signature:integrity` (calculada con
     `expirationTime = expiresAt.toISOString()`), `redirect-url`, `expiration-time`.
2. `src/server/booking/create.ts`:
   - Nueva función exportada `expireStaleHolds(tx, now)` — `update bookings set status = 'cancelled',
     cancelled_by = 'system', cancelled_at = now, cancel_reason = 'pago no completado',
     deposit_status = 'none' where status = 'held' and hold_expires_at <= now`; devuelve cuántas filas
     cambió. `createBooking` la llama al inicio de su transacción.
   - `method: "transfer"`: ya no devuelve `transfer_unavailable`; inserta con `status 'held'`,
     `hold_expires_at = now + hold_minutes`, `deposit_cop = depositFor(price, deposit_percent)`,
     `deposit_status 'pending'`, y en la misma transacción una fila en `payments` con
     `reference = 'BK-' || id`, `amount_cop = deposit_cop`, `status 'PENDING'`.
3. `src/app/cita/[token]/page.tsx`: si la reserva es `held` y no vencida, muestra «Pendiente de pago»,
   el valor con `formatCop`, «Tu horario queda apartado hasta las HH:MM.» y un enlace-botón «Pagar con
   Wompi» cuyo `href` es ``checkoutUrl({ reference, amountCop: deposit_cop, expiresAt: hold_expires_at, redirectUrl: `${APP_URL}/cita/${token}` })``;
   agrega un enlace «Ya pagué, actualizar» a la misma URL para ver la confirmación del webhook sin
   JavaScript (no uses `<meta http-equiv="refresh">`: axe lo marca como violación de WCAG 2.2.1). Si el apartado venció: «El tiempo para pagar terminó y el horario se liberó.»
4. `tests/integration/wompi-checkout.test.ts` — criterios 1–5 (`WOMPI_*` vienen de `.env`).
5. `tests/e2e/booking-transfer.spec.ts` — reserva como en el paso 8 pero eligiendo «Transferencia
   (pago completo en línea)»; espera «Pendiente de pago» y comprueba que el enlace «Pagar con Wompi»
   tiene un `href` que empieza por `https://checkout.wompi.co/p/` (no lo visita).

**Files**
- `src/server/payments/wompi.ts` — nuevo — firma de integridad, depósito, URL de checkout
- `src/server/booking/create.ts` — edición — soporte de `method: "transfer"` y vencimiento de apartados
- `src/app/cita/[token]/page.tsx` — edición — estado «Pendiente de pago» con botón a Wompi
- `tests/integration/wompi-checkout.test.ts` — nuevo
- `tests/e2e/booking-transfer.spec.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `integritySignature` recibe la referencia `sk8-438k4-xmxm392-sn2m2`, el monto en centavos `490000`, la moneda `COP` y el secreto `prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6` THE SYSTEM SHALL devolver `37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5` (ejemplo publicado por Wompi).
2. WHEN `depositFor` recibe un precio y un porcentaje THE SYSTEM SHALL devolver el precio completo al 100 % y, en otro caso, el porcentaje redondeado hacia arriba al millar sin superar el precio (25000 al 30 % → 8000).
3. WHEN `createBooking` recibe una solicitud por transferencia para un slot libre THE SYSTEM SHALL insertar una reserva `held` con `hold_expires_at = now + hold_minutes`, `deposit_status='pending'` y el `deposit_cop` calculado, y una fila en `payments` con `reference = 'BK-' || id de la reserva`, `status='PENDING'` y `amount_cop = deposit_cop`.
4. WHEN corre un `createBooking` nuevo después de que venció el `hold_expires_at` de una reserva `held` en ese mismo slot THE SYSTEM SHALL marcar el apartado vencido como `cancelled` con `cancelled_by='system'` y reservar el slot.
5. WHEN se arma `checkoutUrl` para una reserva apartada THE SYSTEM SHALL devolver `https://checkout.wompi.co/p/` con `public-key`, `currency=COP`, `amount-in-cents`, `reference`, `signature:integrity`, `redirect-url` hacia `/cita/<token>` y `expiration-time` igual a `hold_expires_at` en ISO-8601, con la firma calculada sobre referencia + monto + `COP` + expiración + secreto.
6. WHEN `pnpm test:e2e tests/e2e/booking-transfer.spec.ts` corre THE SYSTEM SHALL mostrar «Pendiente de pago» en `/cita/<token>` y un enlace «Pagar con Wompi» cuyo `href` empieza por `https://checkout.wompi.co/p/`, terminando con código 0.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                               # expect: exit 0
pnpm test:int tests/integration/wompi-checkout.test.ts   # expect: exit 0, 0 failed
pnpm test:int tests/integration/booking-create.test.ts   # expect: exit 0, 0 failed — step 7 still green
pnpm test:e2e tests/e2e/booking-transfer.spec.ts         # expect: exit 0, 0 failed
pnpm typecheck                                           # expect: exit 0
pnpm lint                                                # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T3: Pago por transferencia con Wompi: apartado y enlace de pago"
git tag step-09-wompi-checkout
# rollback target if the next step goes wrong: git reset --hard step-09-wompi-checkout
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **El apartado vencido sigue bloqueando en la restricción** hasta que alguien cambie su estado; por eso `expireStaleHolds` corre dentro de cada `createBooking` y no solo en el cron diario del paso 17.
- **No cobres por fuera del apartado.** `expiration-time` en el checkout hace que Wompi deje de aceptar el pago cuando vence el apartado.

### `E2-T4` — Webhook de Wompi: confirmar o liberar la cita

**Depends on:** `E2-T3` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

1. `src/server/payments/webhook.ts`:
   - `eventChecksum(event, secret): string` — para cada ruta de `event.signature.properties`
     (p. ej. `transaction.id`) toma el valor dentro de `event.data`, los concatena como texto, agrega
     `event.timestamp` y el secreto; SHA-256 hex.
   - `handleWompiEvent(body: unknown, now: Date): Promise<{ status: 200 | 400 }>` — valida la forma con
     zod (`event`, `data.transaction.{id, status, reference, amount_in_cents}`, `signature.{properties, checksum}`,
     `timestamp`); compara `eventChecksum(..., wompiEventsEnv().WOMPI_EVENTS_SECRET)` con
     `signature.checksum` sin distinguir mayúsculas; si no coincide → 400 sin escribir nada.
     Eventos distintos de `transaction.updated` o referencias desconocidas → 200 sin cambios.
   - En una transacción con la fila de `payments` bloqueada (`for update`):
     si el pago ya tiene ese mismo estado final → 200 sin cambios (idempotencia).
     `APPROVED` con `amount_in_cents = amount_cop * 100`: pago `APPROVED` + `wompi_transaction_id`;
     venta `kind 'deposit'`, `method 'wompi'`, `amount_cop = deposit_cop`, `booking_id`, barbero y
     servicio de la reserva (`on conflict do nothing` sobre `sales_booking_kind`); si la reserva está
     `held` → `confirmed`, `hold_expires_at = null`, `deposit_status 'paid'`; si ya estaba `cancelled` por
     el sistema, intenta volver a `confirmed` dentro de un `SAVEPOINT`; si falla con `23P01`, la deja
     `cancelled` con `deposit_status 'refund_pending'`.
     `APPROVED` con monto distinto → pago `ERROR`, reserva sin cambios, 200.
     `DECLINED`, `VOIDED` o `ERROR`: pago con ese estado; si la reserva está `held` → `cancelled`,
     `cancelled_by 'system'`, `deposit_status 'none'`. Siempre 200 para un evento válido.
2. `src/app/api/webhooks/wompi/route.ts` — `export const dynamic = "force-dynamic";`, `POST`: lee
   `await request.json()` (JSON inválido → 400), llama `handleWompiEvent(body, new Date())` y responde
   `new Response(null, { status })`.
3. `tests/integration/wompi-webhook.test.ts` — crea una reserva por transferencia con
   `createBooking`, arma eventos con el `reference` y el monto reales, y los firma con
   `eventChecksum(evento, process.env.WOMPI_EVENTS_SECRET)`; llama el `POST` del route importándolo
   (`new Request("http://localhost/api/webhooks/wompi", { method: "POST", body: JSON.stringify(evento) })`).
   El caso del criterio 1 no usa la base: firma el evento de ejemplo con el secreto de ejemplo.

**Files**
- `src/server/payments/webhook.ts` — nuevo — `eventChecksum()` y `handleWompiEvent()`
- `src/app/api/webhooks/wompi/route.ts` — nuevo — `POST`
- `tests/integration/wompi-webhook.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `eventChecksum` concatena `1234-1610641025-49201`, `APPROVED`, `4490000`, el timestamp `1530291411` y el secreto `prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z` THE SYSTEM SHALL devolver `5a18ec5e8fdb7df463e9f94774cba8f583ba21bd04a09ceff2ea68a4bc0aefbe`, y la comparación con `signature.checksum` SHALL ignorar mayúsculas y minúsculas.
2. WHEN llega un POST cuyo checksum no coincide THE SYSTEM SHALL responder 400 sin cambiar ninguna fila.
3. WHEN llega un evento `transaction.updated` válido con `status: "APPROVED"` y el monto correcto para una reserva `held` THE SYSTEM SHALL responder 200, dejar el pago `APPROVED`, la reserva `confirmed` con `deposit_status='paid'` e insertar una venta `kind='deposit'`, `method='wompi'`, `amount_cop = deposit_cop`.
4. WHEN el mismo evento APPROVED llega dos veces THE SYSTEM SHALL responder 200 las dos veces y mantener exactamente una venta `deposit` para esa reserva.
5. WHEN llega un evento válido con `status` `DECLINED`, `VOIDED` o `ERROR` para una reserva `held` THE SYSTEM SHALL dejarla `cancelled` con `cancelled_by='system'` y liberar el slot.
6. WHEN llega un APPROVED después de vencido el apartado y el slot ya lo tomó otra persona THE SYSTEM SHALL dejar la reserva `cancelled`, poner `deposit_status='refund_pending'` y registrar igualmente la venta `deposit`.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                              # expect: exit 0
pnpm test:int tests/integration/wompi-webhook.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                          # expect: exit 0
pnpm lint                                               # expect: exit 0
pnpm build                                              # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T4: Webhook de Wompi: confirmar o liberar la cita"
git tag step-10-wompi-webhook
# rollback target if the next step goes wrong: git reset --hard step-10-wompi-webhook
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **El checksum de ejemplo que aparece en la página de eventos de Wompi no corresponde a su propio texto de ejemplo.** El valor del criterio 1 se calculó con SHA-256 sobre esa concatenación; no lo cambies por el de la documentación.
- **Responder distinto de 200 a un evento válido** hace que Wompi reintente a los 30 min, 3 h y 24 h; los errores de negocio se registran y se responde 200.

### `E2-T5` — Agenda del dueño: ver, reprogramar y cancelar

**Depends on:** `E1-T4`, `E2-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

1. `src/server/admin/agenda.ts` — `getAgenda(day: string)`: reservas cuyo `starts_at` cae en ese día
   local de la tienda, con estado `held`, `confirmed`, `completed` o `no_show`, agrupadas por barbero
   activo en `sort_order`, cada grupo por `starts_at`; cada ítem trae id, horas, estado, método de pago,
   `price_cop`, `deposit_cop`, `deposit_status`, nombre y celular del cliente y nombre del servicio.
2. `src/server/booking/manage.ts` — exporta `ownerReschedule({ bookingId, newStartsAt, newBarberId, now })`
   y `ownerCancel({ bookingId, depositDecision, now })`, que usan la misma lógica del paso 8 con
   `actor: "owner"` y `enforceCutoff: false`. El dueño puede elegir cualquier hora (sin validar
   horario laboral) y cambiar de barbero; los solapamientos siguen dando `slot_taken`.
3. `src/app/admin/actions.ts` — `"use server"`; cada función exportada empieza con
   `await requireOwner();`. En este paso: `reprogramarComoDueno(formData)` (campos `bookingId`,
   `fechaHora` en `datetime-local` interpretado en la zona de la tienda con `wallTimeToInstant`,
   `barberId`) y `cancelarComoDueno(formData)` (`bookingId`, `anticipo`: `refund` | `forfeit`).
   Todas reciben `(formData: FormData)`; con éxito `revalidatePath("/admin")`; con error
   `redirect("/admin?dia=<día>&error=<código>")` y la página muestra el mensaje en español en `role="alert"`.
4. `src/app/admin/page.tsx` — `<h1>` «Agenda»; selector de día (`?dia=YYYY-MM-DD`, por defecto hoy
   local) con «Anterior» y «Siguiente»; por barbero, una tarjeta por cita con hora, cliente, servicio,
   estado, enlace `https://wa.me/57…` «WhatsApp» con el texto prellenado
   «Hola <nombre>, te escribimos de la barbería sobre tu cita del <fecha>.»; dentro de un `<details>`
   «Reprogramar» y «Cancelar» (con la opción de anticipo solo si `deposit_status = 'paid'`).
   Estado vacío: «No hay citas para este día.».
5. `tests/integration/agenda.test.ts` — criterios 1–3 con `seedShop()`, y el criterio 4 leyendo
   `src/app/admin/actions.ts` como texto: para cada `export async function`, la primera sentencia del
   cuerpo es `await requireOwner();`.

**Files**
- `src/server/admin/agenda.ts` — nuevo — `getAgenda(day)`
- `src/server/booking/manage.ts` — edición — modo dueño (`ownerReschedule`, `ownerCancel`)
- `src/app/admin/page.tsx` — edición — agenda del día
- `src/app/admin/actions.ts` — nuevo — server actions del panel
- `tests/integration/agenda.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `getAgenda(day)` corre THE SYSTEM SHALL devolver las reservas `held`, `confirmed`, `completed` y `no_show` de ese día local de la tienda agrupadas por barbero activo en `sort_order`, cada grupo ordenado por `starts_at`, con nombre y celular del cliente y nombre del servicio.
2. WHEN el dueño reprograma con `ownerReschedule` THE SYSTEM SHALL ignorar `self_service_cutoff_hours` y el horario laboral, permitir cambiar de barbero y seguir rechazando solapamientos con `{ ok: false, error: "slot_taken" }`.
3. WHEN el dueño cancela una reserva con `deposit_status='paid'` eligiendo `refund` THE SYSTEM SHALL dejar `deposit_status='refund_pending'`, y eligiendo `forfeit` THE SYSTEM SHALL dejar `deposit_status='forfeited'`, en ambos casos con `cancelled_by='owner'`.
4. WHEN la prueba lee `src/app/admin/actions.ts` THE SYSTEM SHALL encontrar `await requireOwner();` como primera sentencia de cada función async exportada.
5. WHEN `pnpm build` corre THE SYSTEM SHALL terminar con código 0.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                               # expect: exit 0
pnpm test:int tests/integration/agenda.test.ts           # expect: exit 0, 0 failed
pnpm test:int tests/integration/booking-manage.test.ts   # expect: exit 0, 0 failed — step 8 still green
pnpm typecheck                                           # expect: exit 0
pnpm lint                                                # expect: exit 0
pnpm build                                               # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T5: Agenda del dueño: ver, reprogramar y cancelar"
git tag step-11-admin-agenda
# rollback target if the next step goes wrong: git reset --hard step-11-admin-agenda
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **`datetime-local` no trae zona.** Interprétalo siempre en `shop_settings.timezone` con `wallTimeToInstant`, nunca con `new Date(valor)` (que usa la zona del servidor, UTC en Vercel).

### `E2-T6` — Cobros, no-shows, ventas sin cita y reembolsos

**Depends on:** `E2-T4`, `E2-T5` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

1. `src/server/admin/sales.ts` (todas las funciones reciben `now` y devuelven
   `{ ok: true } | { ok: false, error: "not_found" | "invalid_state" | "invalid_input" }`):
   - `completeBooking({ bookingId, method, now })` — solo desde `confirmed` (si no, `invalid_state`);
     `status 'completed'`, `completed_at = now`; saldo = `price_cop - deposit_cop` si
     `deposit_status = 'paid'`, si no `price_cop`; si el saldo es > 0 inserta venta `kind 'balance'`
     con ese monto y `method`; si el anticipo estaba `paid` pasa a `applied`.
   - `markNoShow({ bookingId, now })` — solo desde `confirmed`; `status 'no_show'`; `paid` → `forfeited`.
   - `recordWalkIn({ amountCop, method, serviceId?, barberId?, note?, occurredAt })` — venta
     `kind 'walk_in'` sin `booking_id`; monto entero > 0.
   - `markRefunded({ bookingId, now })` — solo si `deposit_status = 'refund_pending'` (si ya está
     `refunded`, devuelve `{ ok: true }` sin cambios); pone `refunded` e inserta venta `kind 'refund'`,
     `method 'wompi'`, `amount_cop = -deposit_cop`.
   - `listSales(day)` y `listPendingRefunds()` para la página.
2. `src/app/admin/actions.ts` — agrega `cobrar(formData)` (`bookingId`, `metodo` entre `cash`,
   `nequi`, `daviplata`, `card`, `transfer`), `marcarNoVino(formData)`, `registrarVentaSinCita(formData)`
   (`monto` con `parseCop`, `metodo`, `servicio` opcional, `barbero` opcional, `nota`) y
   `marcarReembolsado(formData)`; todas con `await requireOwner();` primero.
3. `src/app/admin/page.tsx` — en cada cita `confirmed`: formulario «Cobrar» (selector de método y
   monto a cobrar mostrado con `formatCop`) y botón «No vino».
4. `src/app/admin/ventas/page.tsx` — `export const dynamic = "force-dynamic";`, `<h1>` «Ventas»;
   formulario «Venta sin cita»; lista «Reembolsos pendientes» (cliente, celular, valor, botón «Marcar
   como devuelto»; vacío: «No hay reembolsos pendientes.»); lista de ventas de hoy con total.
5. `tests/integration/sales.test.ts` — un caso por criterio con reservas creadas por SQL o con
   `createBooking`, usando el servicio `Corte + barba` a 25000 insertado en el propio test.

**Files**
- `src/server/admin/sales.ts` — nuevo — `completeBooking`, `markNoShow`, `recordWalkIn`, `markRefunded`, `listSales`
- `src/app/admin/actions.ts` — edición — acciones de cobro y ventas
- `src/app/admin/page.tsx` — edición — botones «Cobrar» y «No vino» en cada cita
- `src/app/admin/ventas/page.tsx` — nuevo — venta sin cita, reembolsos pendientes, ventas del día
- `tests/integration/sales.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN el dueño cobra una reserva en efectivo de 25000 eligiendo `nequi` THE SYSTEM SHALL dejarla `completed` e insertar una venta `kind='balance'`, `method='nequi'`, `amount_cop=25000`.
2. WHEN el dueño cobra una reserva cuyo anticipo se pagó en línea THE SYSTEM SHALL registrar solo el saldo `price_cop - deposit_cop` (ninguna venta si es cero) y dejar `deposit_status='applied'`.
3. WHEN el dueño marca una reserva como `no_show` THE SYSTEM SHALL dejar `status='no_show'` y, si `deposit_status='paid'`, cambiarlo a `forfeited` sin crear reembolso.
4. WHEN se registra una venta sin cita de 15000 en `cash` THE SYSTEM SHALL insertar una venta `kind='walk_in'` sin `booking_id`.
5. WHEN el dueño marca como devuelto un anticipo `refund_pending` THE SYSTEM SHALL dejar `deposit_status='refunded'` e insertar una venta `kind='refund'` con `amount_cop = -deposit_cop`, y una segunda llamada SHALL no cambiar nada.
6. WHEN se cobra una reserva que ya está `completed` THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_state" }` sin insertar ventas.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                       # expect: exit 0
pnpm test:int tests/integration/sales.test.ts    # expect: exit 0, 0 failed
pnpm test:int tests/integration/agenda.test.ts   # expect: exit 0, 0 failed — every new action still starts with requireOwner
pnpm typecheck                                   # expect: exit 0
pnpm lint                                        # expect: exit 0
pnpm build                                       # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E2-T6: Cobros, no-shows, ventas sin cita y reembolsos"
git tag step-12-admin-sales
# rollback target if the next step goes wrong: git reset --hard step-12-admin-sales
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **El anticipo ya es ingreso desde que Wompi lo aprobó** (venta `deposit` del paso 10). Al cobrar, registra solo el saldo o contarás el dinero dos veces en el resumen.

---

## Epic acceptance

La épica está hecha cuando todas sus tareas están `done` **y**:

1. WHEN `pnpm lint && pnpm typecheck && pnpm test` corre con `pnpm db:up` THE SYSTEM SHALL terminar con código 0.
2. WHEN `pnpm test:e2e tests/e2e/booking-cash.spec.ts tests/e2e/booking-transfer.spec.ts` corre THE SYSTEM SHALL terminar con código 0.

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e tests/e2e/booking-cash.spec.ts tests/e2e/booking-transfer.spec.ts
```

Desde la raíz del proyecto. Ambos criterios los deciden estos comandos.

## Pitfalls

- (E2-T1) **Nunca «consultar y luego insertar» como garantía.** La consulta de disponibilidad es solo validación de reglas; la restricción `bookings_no_overlap` es la que decide quién gana la carrera.
- (E2-T2) **Reprogramar no es un `UPDATE` de la hora.** Es cancelar + crear en una transacción; un `UPDATE` se salta la validación de la hora nueva y pierde la historia.
- (E2-T3) **El apartado vencido sigue bloqueando en la restricción** hasta que alguien cambie su estado; por eso `expireStaleHolds` corre dentro de cada `createBooking` y no solo en el cron diario del paso 17.
- (E2-T4) **El checksum de ejemplo que aparece en la página de eventos de Wompi no corresponde a su propio texto de ejemplo.** El valor del criterio 1 se calculó con SHA-256 sobre esa concatenación; no lo cambies por el de la documentación.
- (E2-T5) **`datetime-local` no trae zona.** Interprétalo siempre en `shop_settings.timezone` con `wallTimeToInstant`, nunca con `new Date(valor)` (que usa la zona del servidor, UTC en Vercel).
- (E2-T6) **El anticipo ya es ingreso desde que Wompi lo aprobó** (venta `deposit` del paso 10). Al cobrar, registra solo el saldo o contarás el dinero dos veces en el resumen.

## Before moving on

- [ ] Todas las tareas de esta épica están `done` en `tasks.json` — ninguna queda `in_progress`.
- [ ] Pasó cada comando `verify` de cada tarea, no solo el primero.
- [ ] Ningún comando `verify` se editó ni se saltó porque faltara un archivo.
- [ ] **Cada tarea tiene su etiqueta `checkpoint` en git** (`git tag -l 'step-*'`).
- [ ] El gate pasa limpio desde la raíz del proyecto.
- [ ] Cada contrato «Produced» existe con la firma indicada.
- [ ] No se modificó ningún archivo fuera del subárbol.
- [ ] `.env.example` sigue completo (esta épica no agrega variables nuevas: todas ya están en él).
- [ ] Un commit por tarea, con el id de la tarea como prefijo, seguido de su etiqueta.
