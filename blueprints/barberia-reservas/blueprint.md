# Barbería — reservas y control · Blueprint

> Generado por The Architect el 2026-09-28
> Shape: saas-webapp · `knowledge/shapes/saas-webapp.md` + capacidad `knowledge/capabilities/availability-engine.md`
> Runtime track: TypeScript / Node · `knowledge/runtime-tracks/ts-node.md`
> Emission mode: bundle (17 pasos)
> Blueprint version: 1
> Versions last verified: 2026-09-28 — ver §11 para la procedencia de cada paquete

---

## 1. Project Overview & Non-Goals

### Vision

Una web app instalable en el celular (PWA) para **una sola barbería en Colombia**. Tiene dos caras.
La pública permite que cualquier cliente reserve una cita sin crear cuenta: elige servicio, barbero
(o «cualquiera»), día y hora, deja nombre y celular, y paga **en efectivo en la barbería** o **por
transferencia en línea con Wompi** (Nequi, PSE, Bancolombia, tarjeta). Por transferencia se cobra el
valor completo del servicio como anticipo (porcentaje configurable). Con el enlace privado de su cita,
el cliente puede cancelarla o cambiarla por sí mismo hasta 3–5 horas antes (configurable, por defecto
4 h); después de ese plazo solo el dueño puede modificarla, porque al comienzo muchos clientes
seguirán llamando por teléfono.

La cara privada es el panel del dueño: la agenda del día por barbero (reprogramar, cancelar, cobrar,
marcar «no vino», escribir por WhatsApp), las ventas sin cita, los reembolsos pendientes, los gastos
por categoría y un **resumen financiero** con clientes atendidos, dinero recaudado, dinero gastado,
en qué se gastó, ganancia, ingresos por medio de pago, por día y por barbero. El problema que resuelve:
hoy el dueño no sabe con exactitud cuánto entra, cuánto sale ni quién faltó, y las citas se pierden
entre llamadas y mensajes.

### Users

| Persona | Qué viene a hacer | Frecuencia |
|---|---|---|
| Cliente de la barbería | Reservar, pagar (opcional), cancelar o cambiar su cita desde el celular | Mensual |
| Dueño de la barbería | Revisar la agenda, cobrar, registrar ventas y gastos, ver el resumen, ajustar precios y horarios | Diaria |

### Goals — v1 scope

1. El cliente reserva en menos de un minuto desde el celular, sin cuenta, y nunca se le asigna un horario ya ocupado.
2. El cliente elige efectivo (confirma al instante) o transferencia (el horario queda apartado mientras paga en Wompi y se confirma solo cuando Wompi aprueba).
3. El cliente cancela o reprograma solo con su enlace privado, dentro del plazo configurado; los anticipos pagados se abonan a la nueva cita o quedan para devolución.
4. El dueño opera el día desde la agenda: reprograma o cancela sin restricción de plazo, cobra con el medio de pago usado, marca no-shows y registra ventas sin cita.
5. El dueño registra gastos por categoría y ve un resumen financiero correcto por día, semana, mes o rango, con los días cortados en hora de Bogotá.
6. El dueño cambia precios, servicios, barberos, horarios, días libres, porcentaje de anticipo y plazo de autogestión sin tocar código.

### Non-Goals — explicitly out of scope for v1

| Not building | Why not now | Revisit when |
|---|---|---|
| App nativa en App Store / Play Store | La PWA se instala desde el navegador y cubre el uso; una app nativa duplica el trabajo y agrega revisión de tiendas | Más de 300 clientes activos al mes o necesidad real de notificaciones push nativas |
| Recordatorios automáticos por WhatsApp o SMS | La API oficial de WhatsApp Business requiere cuenta verificada y cobra por conversación; v1 usa enlaces `wa.me` que el dueño toca | Los no-shows superan el 10 % de las citas durante dos meses |
| Cuentas de cliente con historial e inicio de sesión | El enlace privado de la cita basta para autogestión; una cuenta agrega fricción al reservar | Clientes piden ver su historial o se quiere un programa de fidelidad |
| Inicio de sesión para barberos y comisiones por barbero | Hoy solo el dueño opera el panel | Contrata más de 3 barberos o necesita liquidar comisiones |
| Varias sedes o vender la app a otras barberías (multi-tenant) | Es una sola barbería; convertir a multi-tenant cambia todo el modelo de datos | Se decide abrir una segunda sede o vender el producto |
| Reembolso automático por la API de Wompi | Las devoluciones son pocas y el dueño las hace a mano; la app las lleva como «reembolso pendiente» | Más de 5 devoluciones al mes |
| Inventario de productos y facturación electrónica DIAN | Es otro producto (contabilidad); los gastos cubren el control de caja | El negocio queda obligado a facturar electrónicamente sus servicios |
| Modo sin conexión (service worker) | La reserva necesita el servidor para evitar dobles reservas; la PWA solo se instala | Nunca para reservar; quizá para ver la agenda sin señal |
| Sincronización con Google Calendar | El dueño usa la agenda de la app; la sincronización bidireccional es la parte más frágil de un motor de citas | El dueño la pide explícitamente |

**The builder must not implement anything in this table**, even if it seems like a small addition
while working on an adjacent step. If a step appears to require a non-goal, that is a blueprint
defect — stop and report it rather than expanding scope.

### Success metrics

| Metric | Target | How measured |
|---|---|---|
| Reservas en línea | ≥ 40 % de las citas del mes por la app al tercer mes | `select count(*) from bookings where created_at >= <mes>` frente a citas atendidas (`completed` + ventas `walk_in`) |
| Dobles reservas | 0 | Imposible por la restricción `bookings_no_overlap`; la prueba de 50 reservas simultáneas del paso 7 lo demuestra |
| No-shows | < 10 % de las citas confirmadas | «No vinieron» ÷ («Clientes atendidos» + «No vinieron») en `/admin/resumen` |
| Registro de caja | 100 % de los días con al menos una venta registrada | `byDay` del resumen sin días hábiles en cero |

---

## 2. Tech Stack

**Runtime track: TypeScript / Node.** Esta tabla nombra decisiones, no versiones. Cada versión está
en §11 y solo ahí.

| Layer | Choice | Why this, over what |
|---|---|---|
| Language / runtime | TypeScript sobre Node LTS | Un solo lenguaje para páginas, lógica y scripts; Node ejecuta los scripts `.ts` de forma nativa. Rechazado: Python/Django, que obliga a un segundo lenguaje para la interfaz |
| Framework | Next.js App Router | Server Components + server actions permiten formularios sin JavaScript de cliente, ideales para celulares modestos; despliegue de cero configuración en Vercel. Rechazado: Rails/Laravel, sin equipo que los conozca |
| Styling | Tailwind CSS v4 con tokens en CSS | Los tokens de §7 viven en `globals.css` y se usan como clases; sin tiempo de ejecución. Rechazado: CSS-in-JS, que rompe el renderizado en servidor |
| Component layer | Tres primitivas propias (`Button`, `Field`, `Card`) | El alcance v1 son formularios y listas; una librería (shadcn/Radix) agrega dependencias y un generador interactivo sin beneficio aquí |
| Database | Postgres (Docker local, Supabase en producción) | Es el único que ofrece restricciones `EXCLUDE` sobre rangos de tiempo: la garantía contra dobles reservas vive en la base. Rechazado: Firestore/Mongo, sin transacciones ni restricciones de rango |
| ORM / data access | Drizzle ORM + driver `postgres` | Esquema en TypeScript, migraciones SQL legibles y transacciones explícitas. Rechazado: Prisma, cuyo cliente generado complica los scripts con tipos nativos |
| Auth | better-auth (correo y clave, registro deshabilitado) | Solo el dueño entra; las tablas viven en la misma base, sin un segundo proveedor. Rechazado: Supabase Auth, que ataría la sesión a Supabase y complica pruebas locales sin su CLI |
| Background work | Ninguna cola: vencimiento de apartados dentro de cada reserva + Vercel Cron diario de limpieza | El único trabajo diferido es liberar apartados vencidos; hacerlo en la transacción de reserva no depende de la frecuencia del cron (Hobby: una vez al día) |
| Payments | Wompi Web Checkout + eventos firmados | Pasarela colombiana de Bancolombia con Nequi, PSE, Bancolombia y tarjetas; el checkout alojado evita manejar datos de tarjeta. Rechazado: verificación manual de transferencias, que deja horarios bloqueados hasta que el dueño revise |
| File storage | NOT APPLICABLE — v1 no sube archivos | — |
| Email / notifications | Ninguno automático; enlaces `wa.me` con texto prellenado | Costo cero y es el canal que ya usan los clientes; los recordatorios automáticos son un non-goal |
| Hosting | Vercel (app) + Supabase (Postgres administrado) | Planes gratuitos suficientes para una barbería; Vercel despliega Next sin configuración. Rechazado: VPS propio, que exige administración |
| Package manager | pnpm | Dependencias estrictas (detecta dependencias fantasma) y es el del runtime track |

### Compatibility check

Checked against `knowledge/stack-compatibility.md` — none of the known-bad rows apply to this stack
except the ones the TypeScript track mandates against itself, which this blueprint handles
explicitly:

- **Linter que parsea CSS + Tailwind v4 con `@theme`**: `biome.json` (§19.6) activa
  `css.parser.tailwindDirectives: true` antes de la primera ejecución de `pnpm lint`.
- **Conexiones por petición en serverless + Postgres sin pooler**: en producción `DATABASE_URL` es el
  *transaction pooler* de Supabase y el cliente usa `prepare: false`; las migraciones usan
  `MIGRATION_DATABASE_URL` (session pooler).
- **Dos sistemas de migración**: el editor de tablas de Supabase queda solo para lectura; las
  migraciones de Drizzle son dueñas del esquema.
- **Un solo proveedor de identidad** (better-auth); no hay Supabase Auth ni Clerk.
- Auth-to-database pairing: librería de auth propia en la app con su adaptador para el ORM elegido
  (`better-auth/adapters/drizzle`, verificado en el registro para la versión fijada de §11).

---

## 3. Directory Structure

```
barberia-reservas/
  .github/workflows/ci.yml          # CI: lint, typecheck, migraciones, pruebas, e2e, build (paso 17)
  .claude/                          # configuración del agente (workspace, §19)
    settings.json
    skills/add-migration/SKILL.md
    skills/add-admin-feature/SKILL.md
    rules/database.md · booking.md · payments.md · ui.md · tests.md
  blueprints/barberia-reservas/     # este bundle; se commitea (tasks.json guarda el avance)
  docker/initdb/01-databases.sql    # crea barberia_test y barberia_e2e al iniciar el volumen (workspace)
  drizzle/                          # migraciones generadas por drizzle-kit (paso 2 en adelante)
  scripts/
    db-reset.ts                     # borra y re-migra una base (workspace)
    serve-check.sh                  # levanta la build en :3100 y comprueba una ruta (workspace)
    seed.ts                         # datos demo idempotentes (paso 3)
    create-owner.ts                 # crea la cuenta del dueño (paso 3)
  src/
    app/
      layout.tsx · globals.css · page.tsx      # raíz, tokens, portada (pasos 1 y 16)
      manifest.ts · icons/[size]/route.tsx      # PWA (paso 16)
      privacidad/page.tsx                       # política de datos, Ley 1581 (paso 16)
      reservar/page.tsx · reservar/actions.ts   # flujo público de reserva (paso 7)
      cita/[token]/page.tsx · actions.ts        # gestión de la cita por el cliente (pasos 8 y 9)
      entrar/page.tsx                           # ingreso y salida del dueño (paso 4)
      admin/
        layout.tsx                              # exige sesión, navegación (paso 4)
        page.tsx · actions.ts                   # agenda, reprogramar, cancelar, cobrar (pasos 4, 11, 12)
        ventas/page.tsx                         # ventas sin cita, reembolsos (paso 12)
        gastos/page.tsx · gastos/actions.ts     # gastos y categorías (paso 13)
        resumen/page.tsx                        # resumen financiero (paso 14)
        ajustes/page.tsx · ajustes/actions.ts   # servicios, barberos, horarios, políticas (paso 15)
      api/
        health/route.ts                         # salud con la base (paso 2)
        auth/[...all]/route.ts                  # better-auth (paso 3)
        webhooks/wompi/route.ts                 # eventos de Wompi (paso 10)
        cron/expire-holds/route.ts              # limpieza diaria de apartados (paso 17)
    components/
      ui/button.tsx · field.tsx · card.tsx      # primitivas (paso 5)
      charts/bar-list.tsx                       # barras en CSS (paso 14)
    lib/
      env.ts                                    # variables de entorno por grupos (paso 1)
      money.ts                                  # formatCop / parseCop (paso 5)
      time.ts                                   # zonas horarias con Intl (paso 6)
    server/
      db/schema.ts · db/client.ts               # esquema y cliente (paso 2)
      auth.ts                                   # better-auth (paso 3)
      session.ts                                # requireOwner (paso 4)
      booking/slots.ts · availability.ts        # motor de horarios (paso 6)
      booking/token.ts · create.ts              # crear reservas (pasos 7 y 9)
      booking/manage.ts                         # cancelar / reprogramar (pasos 8 y 11)
      payments/wompi.ts · webhook.ts            # Wompi (pasos 9 y 10)
      admin/agenda.ts · sales.ts · expenses.ts · metrics.ts · settings.ts   # panel (pasos 11–15)
    types/css.d.ts                              # tipos para importar CSS (workspace)
  tests/
    setup/global-setup.ts · db.ts · fixtures.ts # infraestructura de pruebas (workspace)
    unit/*.test.ts                              # lógica pura
    integration/*.test.ts                       # contra Postgres real
    e2e/*.spec.ts                               # Playwright, Pixel 7
  .env.example · .gitignore · .nvmrc            # workspace
  biome.json · docker-compose.yml · drizzle.config.ts · next.config.ts   # workspace (next.config editado en el paso 17)
  package.json · pnpm-workspace.yaml · playwright.config.ts · postcss.config.mjs · tsconfig.json · vitest.config.ts   # workspace
  vercel.json                                   # paso 17
  CLAUDE.md · AGENTS.md                         # workspace
```

**Boundary rules**

- `src/components/**` nunca importa `src/server/**`; los datos entran por props desde páginas.
- `src/app/**` no consulta la base directamente: llama funciones de `src/server/**`.
- `src/server/**` y `src/lib/**` no importan React ni `next/*`, con una excepción: `src/server/session.ts`.
- `src/server/db/client.ts` es el único lugar que abre una conexión (además de `scripts/db-reset.ts` y `tests/setup/db.ts`, que trabajan con bases de prueba).
- Resolución de módulos: la convención (rutas relativas `.ts` fuera de `app/` y `components/`) está en la *Resolution convention matrix* de §19.6.

Cada archivo del árbol tiene un solo origen: un paso de §9 que lo nombra en su lista de archivos, o
un archivo real bajo `workspace/` copiado por el Bootstrap. `drizzle/` lo produce `drizzle-kit`, y
`next-env.d.ts` y `.next/` los produce Next.

---

## 4. Data Model

### Entities

**`user`, `session`, `account`, `verification`** — tablas núcleo de better-auth (nombres de campos
fijados por la librería). Solo existe un usuario: el dueño.

**`shop_settings`** — una sola fila (`id = 1`) con la configuración de la barbería.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | smallint | PK, `= 1` | fila única |
| `name`, `whatsapp_phone`, `address` | text | not null | WhatsApp como `57` + 10 dígitos |
| `timezone` | text | default `America/Bogota` | zona IANA para horarios y cortes de día |
| `deposit_percent` | smallint | 10–100, default 100 | porcentaje cobrado por transferencia |
| `self_service_cutoff_hours` | smallint | 3–5, default 4 | horas antes de la cita en que el cliente deja de poder cancelar o cambiar |
| `hold_minutes` | smallint | 10–30, default 15 | tiempo para pagar una reserva por transferencia |
| `slot_interval_minutes`, `min_notice_minutes`, `max_advance_days` | smallint | defaults 15, 60, 30 | reglas del motor de horarios |

**`barbers`** — `id`, `name`, `active`, `sort_order`. Se desactivan, no se borran.

**`services`** — `id`, `name`, `duration_minutes` (10–240), `price_cop` (> 0), `buffer_after_minutes`
(0–60), `active`, `sort_order`. El precio cambia sin afectar reservas existentes (cada reserva guarda
su `price_cop`).

**`working_hours`** — `barber_id`, `weekday` (0 = domingo … 6 = sábado), `start_time`, `end_time`
(hora local de la tienda). Único por `(barber_id, weekday, start_time)`; varios tramos por día permiten
pausas.

**`time_off`** — `barber_id` (null = toda la barbería cerrada), `starts_at`, `ends_at`, `reason`.

**`customers`** — `name`, `phone` (único, `57` + 10 dígitos), `consent_at` (autorización de datos,
Ley 1581).

**`bookings`** — la cita. Ciclo de vida: `held` (apartada esperando pago) → `confirmed` →
`completed` | `cancelled` | `no_show`. Nunca se borra.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK | |
| `barber_id`, `service_id`, `customer_id` | uuid | FK `restrict` | |
| `starts_at`, `ends_at` | timestamptz | `ends_at > starts_at` | lo que ve el cliente |
| `blocked_from`, `blocked_until` | timestamptz | `blocked_from <= starts_at`, `blocked_until >= ends_at` | rango que ocupa, búfer incluido; lo compara `bookings_no_overlap` |
| `status` | enum `booking_status` | not null | |
| `payment_method` | enum `booking_payment_method` | `cash` \| `transfer` | |
| `price_cop` | integer | not null | precio congelado al reservar |
| `deposit_cop` | integer | 0 ≤ x ≤ `price_cop` | anticipo cobrado por Wompi |
| `deposit_status` | enum `deposit_status` | default `none` | `none`, `pending`, `paid`, `applied`, `transferred`, `refund_pending`, `refunded`, `forfeited` |
| `manage_token_hash` | text | unique | SHA-256 hex del token del enlace privado |
| `hold_expires_at` | timestamptz | obligatorio si `status = held` | |
| `rescheduled_from_id` | uuid | FK a `bookings` | cadena de reprogramaciones |
| `cancelled_at`, `cancelled_by`, `cancel_reason`, `completed_at` | | | `cancelled_by`: `customer`, `owner`, `system` |

**`payments`** — un intento de pago Wompi por reserva: `booking_id`, `reference` (`BK-<id>`, único),
`amount_cop`, `status` (`PENDING`, `APPROVED`, `DECLINED`, `VOIDED`, `ERROR`), `wompi_transaction_id`
(único), `last_event_at`.

**`sales`** — el libro de ingresos. `kind`: `deposit` (anticipo en línea), `balance` (cobro al
atender), `walk_in` (venta sin cita), `refund` (devolución, monto negativo). `method`: `cash`,
`nequi`, `daviplata`, `card`, `transfer`, `wompi`. `amount_cop` distinto de 0 y negativo solo si es
`refund`. Único `(booking_id, kind)` cuando hay reserva: hace idempotentes el webhook y los cobros.

**`expense_categories`** — `name` único, `active`. **`expenses`** — `category_id`, `amount_cop` (> 0),
`spent_on` (día local `YYYY-MM-DD`), `description`, `method`.

### Relationships

- `user` —(1:N)→ `session`, `account` · cascade al borrar el usuario.
- `barbers` —(1:N)→ `working_hours`, `time_off` · cascade (son configuración del barbero).
- `barbers`, `services`, `customers` —(1:N)→ `bookings` · **restrict**: no se borra nada con citas; se desactiva.
- `bookings` —(1:N)→ `payments` · restrict. `bookings` —(0..1)→ `bookings` (`rescheduled_from_id`).
- `bookings` —(1:N)→ `sales` · restrict. `barbers`/`services` —(1:N)→ `sales` · set null.
- `expense_categories` —(1:N)→ `expenses` · restrict.

### Indexes

| Table | Index | Why |
|---|---|---|
| `bookings` | `bookings_no_overlap` (GiST: `barber_id =`, `tstzrange(blocked_from, blocked_until, '[)') &&`, solo `held`/`confirmed`) | imposibilita las dobles reservas bajo concurrencia |
| `bookings` | `(barber_id, starts_at)` | disponibilidad y agenda por día |
| `bookings` | `(status, hold_expires_at)` | vencer apartados |
| `bookings` | `(customer_id)` | límite de 3 citas futuras por cliente |
| `sales` | único `(booking_id, kind)` donde `booking_id` no es null | idempotencia de webhook y cobros |
| `sales` | `(occurred_at)` | resumen por periodo |
| `expenses` | `(spent_on)` | gastos por mes |
| `time_off` | `(starts_at)` | días libres que tocan un día |
| `working_hours` | único `(barber_id, weekday, start_time)` | semilla idempotente, reemplazo de horarios |

### Schema

`src/server/db/schema.ts` (paso 2 lo escribe tal cual):

```ts
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ── better-auth core tables (field names are fixed by the library) ─────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: tstz("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: tstz("access_token_expires_at"),
  refreshTokenExpiresAt: tstz("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: tstz("expires_at").notNull(),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ── enums ──────────────────────────────────────────────────────────────────────
export const bookingStatus = pgEnum("booking_status", [
  "held",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
export const bookingPaymentMethod = pgEnum("booking_payment_method", ["cash", "transfer"]);
export const depositStatus = pgEnum("deposit_status", [
  "none",
  "pending",
  "paid",
  "applied",
  "transferred",
  "refund_pending",
  "refunded",
  "forfeited",
]);
export const cancelActor = pgEnum("cancel_actor", ["customer", "owner", "system"]);
export const paymentStatus = pgEnum("payment_status", [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "VOIDED",
  "ERROR",
]);
export const saleKind = pgEnum("sale_kind", ["deposit", "balance", "walk_in", "refund"]);
export const moneyMethod = pgEnum("money_method", [
  "cash",
  "nequi",
  "daviplata",
  "card",
  "transfer",
  "wompi",
]);

// ── shop configuration ─────────────────────────────────────────────────────────
export const shopSettings = pgTable(
  "shop_settings",
  {
    id: smallint("id").primaryKey().default(1),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("America/Bogota"),
    whatsappPhone: text("whatsapp_phone").notNull(),
    address: text("address").notNull().default(""),
    depositPercent: smallint("deposit_percent").notNull().default(100),
    selfServiceCutoffHours: smallint("self_service_cutoff_hours").notNull().default(4),
    holdMinutes: smallint("hold_minutes").notNull().default(15),
    slotIntervalMinutes: smallint("slot_interval_minutes").notNull().default(15),
    minNoticeMinutes: smallint("min_notice_minutes").notNull().default(60),
    maxAdvanceDays: smallint("max_advance_days").notNull().default(30),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("shop_settings_singleton", sql`${t.id} = 1`),
    check("shop_settings_deposit_percent", sql`${t.depositPercent} between 10 and 100`),
    check("shop_settings_cutoff_hours", sql`${t.selfServiceCutoffHours} between 3 and 5`),
    check("shop_settings_hold_minutes", sql`${t.holdMinutes} between 10 and 30`),
  ],
);

export const barbers = pgTable("barbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: smallint("sort_order").notNull().default(0),
  createdAt: tstz("created_at").notNull().defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    durationMinutes: smallint("duration_minutes").notNull(),
    priceCop: integer("price_cop").notNull(),
    bufferAfterMinutes: smallint("buffer_after_minutes").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("services_duration", sql`${t.durationMinutes} between 10 and 240`),
    check("services_price", sql`${t.priceCop} > 0`),
    check("services_buffer", sql`${t.bufferAfterMinutes} between 0 and 60`),
  ],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0 = domingo … 6 = sábado
    startTime: time("start_time").notNull(), // wall clock in shop_settings.timezone
    endTime: time("end_time").notNull(),
  },
  (t) => [
    check("working_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("working_hours_range", sql`${t.endTime} > ${t.startTime}`),
    uniqueIndex("working_hours_barber_day_start").on(t.barberId, t.weekday, t.startTime),
  ],
);

export const timeOff = pgTable(
  "time_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = the whole shop is closed
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "cascade" }),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    reason: text("reason").notNull().default(""),
  },
  (t) => [
    check("time_off_range", sql`${t.endsAt} > ${t.startsAt}`),
    index("time_off_starts_at").on(t.startsAt),
  ],
);

// ── customers and bookings ─────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(), // "57" + 10 digits
  consentAt: tstz("consent_at").notNull(), // Ley 1581 authorization
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    blockedFrom: tstz("blocked_from").notNull(),
    blockedUntil: tstz("blocked_until").notNull(),
    status: bookingStatus("status").notNull(),
    paymentMethod: bookingPaymentMethod("payment_method").notNull(),
    priceCop: integer("price_cop").notNull(),
    depositCop: integer("deposit_cop").notNull().default(0),
    depositStatus: depositStatus("deposit_status").notNull().default("none"),
    manageTokenHash: text("manage_token_hash").notNull().unique(),
    holdExpiresAt: tstz("hold_expires_at"),
    rescheduledFromId: uuid("rescheduled_from_id").references((): AnyPgColumn => bookings.id),
    cancelledAt: tstz("cancelled_at"),
    cancelledBy: cancelActor("cancelled_by"),
    cancelReason: text("cancel_reason"),
    completedAt: tstz("completed_at"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("bookings_time_range", sql`${t.endsAt} > ${t.startsAt}`),
    check(
      "bookings_blocked_range",
      sql`${t.blockedFrom} <= ${t.startsAt} and ${t.blockedUntil} >= ${t.endsAt}`,
    ),
    check("bookings_deposit", sql`${t.depositCop} between 0 and ${t.priceCop}`),
    check("bookings_hold", sql`${t.status} <> 'held' or ${t.holdExpiresAt} is not null`),
    index("bookings_barber_starts").on(t.barberId, t.startsAt),
    index("bookings_customer").on(t.customerId),
    index("bookings_status_hold").on(t.status, t.holdExpiresAt),
  ],
);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "restrict" }),
  reference: text("reference").notNull().unique(), // "BK-" + booking id
  amountCop: integer("amount_cop").notNull(),
  status: paymentStatus("status").notNull().default("PENDING"),
  wompiTransactionId: text("wompi_transaction_id").unique(),
  lastEventAt: tstz("last_event_at"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ── money ledger ───────────────────────────────────────────────────────────────
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "restrict" }),
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    kind: saleKind("kind").notNull(),
    method: moneyMethod("method").notNull(),
    amountCop: integer("amount_cop").notNull(), // negative only for kind = 'refund'
    occurredAt: tstz("occurred_at").notNull().defaultNow(),
    note: text("note").notNull().default(""),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("sales_amount_sign", sql`(${t.kind} = 'refund') = (${t.amountCop} < 0) and ${t.amountCop} <> 0`),
    uniqueIndex("sales_booking_kind")
      .on(t.bookingId, t.kind)
      .where(sql`${t.bookingId} is not null`),
    index("sales_occurred_at").on(t.occurredAt),
  ],
);

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: tstz("created_at").notNull().defaultNow(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    amountCop: integer("amount_cop").notNull(),
    spentOn: date("spent_on", { mode: "string" }).notNull(), // shop-local calendar day
    description: text("description").notNull().default(""),
    method: moneyMethod("method").notNull().default("cash"),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("expenses_amount", sql`${t.amountCop} > 0`),
    index("expenses_spent_on").on(t.spentOn),
  ],
);
```

Migración `--custom` `constraints_rls` (paso 2 la escribe en el archivo que genera `drizzle-kit
generate --custom --name=constraints_rls`):

```sql
-- Hand-written part of the schema: things Drizzle cannot express.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- No two held/confirmed bookings of one barber may overlap (buffers included).
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (
  "barber_id" WITH =,
  tstzrange("blocked_from", "blocked_until", '[)') WITH &&
) WHERE ("status" IN ('held', 'confirmed'));
--> statement-breakpoint
-- Supabase exposes schema public through its Data API; RLS with no policies closes it.
-- The app connects as the table owner, which bypasses RLS.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "shop_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "barbers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "working_hours" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "time_off" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
```

### Migrations

Drizzle Kit. Flujo: editar `schema.ts` → `pnpm db:generate` (drizzle-kit nombra el archivo) →
`pnpm db:migrate`. SQL que Drizzle no expresa: `pnpm exec drizzle-kit generate --custom --name=<nombre>`.
En producción las migraciones corren en el build de Vercel solo cuando `VERCEL_ENV=production`
(`vercel.json`, paso 17), contra `MIGRATION_DATABASE_URL`. Regla: *expand then contract* — nunca se
borra ni renombra una columna en el mismo despliegue que deja de usarla. Toda tabla nueva en `public`
lleva `ENABLE ROW LEVEL SECURITY` en una migración `--custom`.

### Seed data

`scripts/seed.ts` (`pnpm db:seed`, idempotente): configuración de la barbería, barberos `Andrés` y
`Camilo`, servicios `Corte clásico` (30 min, 15000), `Corte + barba` (45 min, 25000) y `Barba`
(20 min, 10000), horario lunes a sábado 09:00–19:00, categorías de gasto `Arriendo`, `Productos`,
`Servicios públicos`, `Nómina`, `Mantenimiento`, `Otros`, y la cuenta del dueño con
`OWNER_NAME/OWNER_EMAIL/OWNER_PASSWORD`. En producción solo se corre `pnpm owner:create`; los
servicios y barberos reales se cargan desde `/admin/ajustes`.

---

## 5. API Design

### Conventions

- Base path: no hay API pública. Las mutaciones son **server actions** de Next (POST al propio
  formulario); los route handlers existen solo para integraciones: `/api/auth/*`, `/api/health`,
  `/api/webhooks/wompi`, `/api/cron/expire-holds`.
- Response envelope: funciones de negocio → `{ ok: true, …datos } | { ok: false, error: <código> }`.
  Route handlers → JSON con estado HTTP (`/api/health`: `{ ok, db }`; cron: `{ expired }`; webhook: cuerpo vacío).
- Error codes (negocio): `invalid_input`, `slot_unavailable`, `slot_taken`, `too_many_bookings`,
  `transfer_unavailable` (solo pasos 7–8), `not_found`, `invalid_state`, `cutoff_passed`, `duplicate`.
  La interfaz traduce cada código a un mensaje en español.
- HTTP: 200 éxito · 400 cuerpo o firma inválidos (webhook) · 401 cron sin token · 404 token de cita desconocido · 503 salud sin base.
- Validation: zod en cada server action, route handler y en `src/lib/env.ts`.
- Pagination: no aplica en v1 (listas por día o por mes).
- Idempotency: webhook por estado final del pago + índice único de `sales`; cobros por transición de estado.
- Rate limits: better-auth limita los intentos de ingreso (activado en producción por defecto); las
  reservas se limitan por negocio a 3 citas futuras por celular.

### Routes

| Method | Path | Description | Auth | Rate limit |
|---|---|---|---|---|
| GET | `/` | Portada con servicios y precios | público | — |
| GET | `/reservar` | Flujo de reserva por pasos (`servicio`, `barbero`, `dia`, `hora`) | público | — |
| POST (action) | `/reservar` → `reservar` | Crea la reserva | público | 3 citas futuras por celular |
| GET | `/cita/[token]` | Detalle, pago y autogestión | token | — |
| POST (action) | `/cita/[token]` → `cancelar`, `reprogramar` | Autogestión dentro del plazo | token | — |
| GET | `/privacidad` | Política de datos | público | — |
| GET | `/manifest.webmanifest`, `/icons/[size]` | PWA | público | — |
| GET/POST | `/api/auth/*` | better-auth (ingreso, salida, sesión) | público | better-auth |
| GET | `/api/health` | Salud con `select 1` | público | — |
| POST | `/api/webhooks/wompi` | Eventos de Wompi | checksum | — |
| GET | `/api/cron/expire-holds` | Vence apartados | `Bearer CRON_SECRET` | Vercel Cron diario |
| GET | `/entrar` | Ingreso / salida del dueño | público | — |
| GET | `/admin`, `/admin/ventas`, `/admin/gastos`, `/admin/resumen`, `/admin/ajustes` | Panel | dueño | — |
| POST (actions) | `src/app/admin/**/actions.ts` | Mutaciones del panel | dueño (`requireOwner()`) | — |

### Critical endpoints — full detail

**`createBooking` (acción `reservar`)** — entrada: `serviceId`, `barberId | "any"`, `startsAt` (ISO),
`name` (2–60), `phone` (móvil colombiano), `consent` (true), `method` (`cash` | `transfer`).
Errores: `invalid_input`, `slot_unavailable`, `slot_taken`, `too_many_bookings`. Efectos: upsert de
`customers`; una fila en `bookings` (`confirmed` en efectivo, `held` por transferencia); por
transferencia además una fila en `payments`. Salida: `{ ok: true, bookingId, token }` y redirección a `/cita/<token>`.

**`cancelBooking` / `rescheduleBooking` (cliente)** — requieren token válido, reserva `confirmed` y
`now <= starts_at - self_service_cutoff_hours`. Errores: `not_found`, `invalid_state`,
`cutoff_passed`, `slot_taken`. Efectos en §4 (`deposit_status` y `rescheduled_from_id`).

**`POST /api/webhooks/wompi`** — cuerpo de evento Wompi (`event`, `data.transaction.{id, status,
reference, amount_in_cents}`, `signature.{properties, checksum}`, `timestamp`). Checksum inválido → 400
sin escrituras; evento válido → 200 siempre. `APPROVED` con monto correcto: pago `APPROVED`, venta
`deposit`, reserva `confirmed`/`paid` (o `refund_pending` si el horario se perdió). `DECLINED`,
`VOIDED`, `ERROR`: libera la reserva `held`.

**`completeBooking` (acción `cobrar`)** — solo desde `confirmed`; registra el saldo como venta
`balance` con el medio de pago elegido; anticipo `paid` → `applied`. Error `invalid_state`.

**`getMetrics({ from, to })`** — días locales inclusivos; devuelve `collectedCop`, `spentCop`,
`profitCop`, `customersServed`, `noShows`, `byMethod`, `expensesByCategory`, `byDay`, `byBarber`.

---

## 6. Frontend Architecture

### Routes

| Route | Page | Data source | Auth |
|---|---|---|---|
| `/` | Portada | `shop_settings` + servicios activos (servidor) | público |
| `/reservar` | Reserva por pasos | `getAvailability` según `searchParams` | público |
| `/cita/[token]` | Mi cita | `findByToken` | token |
| `/privacidad` | Política de datos | `shop_settings` | público |
| `/entrar` | Ingreso del dueño | better-auth en el cliente | público |
| `/admin` | Agenda del día | `getAgenda(dia)` | dueño |
| `/admin/ventas` | Ventas y reembolsos | `listSales`, `listPendingRefunds` | dueño |
| `/admin/gastos` | Gastos y categorías | `listExpenses`, `listCategories` | dueño |
| `/admin/resumen` | Resumen financiero | `getMetrics` | dueño |
| `/admin/ajustes` | Configuración | tablas de configuración | dueño |

### Rendering strategy

Todo es dinámico en el servidor: cada página que lee la base exporta
`export const dynamic = "force-dynamic";` (Next 16 sin `cacheComponents`). No hay páginas estáticas
con datos porque los horarios cambian con cada reserva. `/manifest.webmanifest` y `/icons/*` son
rutas de metadatos de Next. No se usa `"use cache"`.

### Component hierarchy

```
/reservar  (Server Component, sin JS de cliente)
  └─ pasos como <a href="?servicio=…&barbero=…&dia=…&hora=…">  → formulario final <form action={reservar}>
       Field(Nombre) · Field(Celular) · radios de pago · casilla de autorización · Button(Confirmar reserva)

/cita/[token]  (Server Component)
  ├─ Card(resumen de la cita)
  ├─ [held]      enlace «Pagar con Wompi» + enlace «Ya pagué, actualizar»
  └─ [confirmed] <form action={cancelar}> · <form action={reprogramar}> (GET ?dia= para elegir día)

/admin (layout Server: requireOwner + nav)
  └─ page (Server): selector de día → por barbero → Card(cita) con <details> Reprogramar/Cancelar, Cobrar, No vino, WhatsApp

/entrar  ("use client" — única página de cliente): formulario → authClient.signIn.email
```

### State management

Sin estado global. El estado del flujo de reserva vive en la URL (`searchParams`), así funciona con
el botón «atrás» y sin JavaScript. Los formularios son `<form action={serverAction}>` normales: la acción
recibe `FormData` y, si falla, redirige a la misma página con `?error=<código>`, que la página muestra
en `role="alert"`. Después de mutar:
`revalidatePath`. No hay caché de datos en el cliente ni librería de estado.

### Loading, empty, and error states

| Superficie | Cargando | Vacío | Error |
|---|---|---|---|
| Horas en `/reservar` | render en servidor (sin spinner) | «No hay horarios disponibles este día.» | mensaje del código en `role="alert"` |
| `/cita/[token]` | render en servidor | — | token desconocido → 404 «Esta cita no existe.» |
| Agenda | render en servidor | «No hay citas para este día.» | mensaje de la acción en `role="alert"` |
| Reembolsos pendientes | — | «No hay reembolsos pendientes.» | idem |
| Gastos del mes | — | «No hay gastos en este mes.» | idem |
| Gráficos del resumen | — | «Sin datos en este periodo.» | — |

---

## 7. Design System

Sistema definido desde `knowledge/capabilities/styling.md` (la skill `ui-ux-pro-max` no estaba
instalada en la sesión de diseño). Dirección: barbería premium — fondo casi negro con acento dorado
en oscuro; papel cálido con dorado tostado en claro. Sigue la preferencia del sistema operativo.

### Colors

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--primary` | `#7a5410` | `#d4a24c` | botones principales, enlaces, anillo de foco |
| `--primary-fg` | `#ffffff` | `#141414` | texto sobre primary |
| `--background` | `#fafaf7` | `#0e0e10` | página |
| `--surface` | `#ffffff` | `#17171a` | tarjetas, paneles |
| `--border` | `#8e8e86` | `#6b6b74` | bordes de inputs, divisores |
| `--fg` | `#18181b` | `#f4f4f5` | texto |
| `--fg-muted` | `#52525b` | `#a1a1aa` | texto secundario |
| `--destructive` | `#b91c1c` | `#f87171` | errores, cancelar |
| `--success` | `#15803d` | `#4ade80` | confirmaciones |

**Contrast** (medido con la fórmula WCAG 2.2): texto `--fg` sobre `--background` 16.94:1 (claro) y
17.54:1 (oscuro); los tres pares más riesgosos — `--primary-fg` sobre `--primary` 6.77:1 / 7.96:1,
`--success` sobre `--background` 4.80:1 / 11.07:1, `--border` sobre `--surface` (límite de input)
3.30:1 / 3.39:1. Todos cumplen AA (4.5:1 texto, 3:1 bordes de componentes).

### Typography

| Role | Family | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| Display | pila del sistema (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, …`) | 30px / 36px (`text-3xl`) | 600 | -0.025em (`tracking-tight`) |
| Heading | igual | 24px / 32px (`text-2xl`), 18px / 28px (`text-lg`) | 600 | -0.025em |
| Body | igual | 16px / 24px (`text-base`) | 400 | 0 |
| Mono | `ui-monospace, SFMono-Regular, Menlo, monospace` | 14px / 20px | 400 | 0 |

**Font loading:** ninguna — fuentes del sistema, cero descargas y cero riesgo de `font-display`.

### Spacing, radius, elevation

- Spacing scale: base 4px (escala de Tailwind: 4, 8, 12, 16, 24, 32, 48, 64).
- Radius: `--radius-control` 8px (inputs, botones), `--radius-card` 12px (tarjetas), `rounded-full` para indicadores.
- Shadows: ninguna — bordes de 1px `--border` en lugar de elevación.
- Max content width: 1024px (`max-w-5xl`) en el layout; formularios públicos 768px (`max-w-3xl`). Breakpoints de Tailwind: 640 / 768 / 1024 / 1280px; diseño mobile-first desde 320px.

### Motion

150ms `ease-out`, solo `opacity` y `transform`, siempre detrás de la variante `motion-safe:` (así
`prefers-reduced-motion: reduce` elimina toda animación). Sin animaciones de página ni de listas.

### Component style

Sobrio y táctil: superficies planas con borde fino, un solo color de acento para la acción principal
de cada pantalla, objetivos de toque de al menos 44px, texto grande y claro. Si un componente nuevo
necesita sombra, degradado o un segundo color de acento, no pertenece a este sistema.

---

## 8. Authentication & Authorization

### Provider and rationale

better-auth con correo y clave, **registro deshabilitado** (`disableSignUp: true`): la única cuenta
es la del dueño, creada por `pnpm owner:create` (o la semilla). Tablas en la misma base, sin
servicio externo. Los clientes no tienen cuenta: su «credencial» es el token del enlace de la cita.

### Flows

- Ingreso: `/entrar` → `authClient.signIn.email` → cookie de sesión `HttpOnly` → `/admin`. Error →
  «Correo o contraseña incorrectos».
- Sesión: 30 días, se renueva cada 24 h de uso.
- Salida: `/entrar?salir=1` → `authClient.signOut()`.
- Recuperar clave: no hay correo en v1; el dueño la restablece corriendo `pnpm owner:create` con otra
  clave después de borrar su cuenta desde la consola de base de datos (procedimiento en la lista de
  lanzamiento, §20.1). Cambio de clave desde la app: non-goal implícito de v1 (una sola cuenta).
- Cliente: el token (32 bytes aleatorios, base64url) viaja en el enlace `/cita/<token>`; en la base
  solo se guarda su SHA-256. Quien tenga el enlace puede gestionar la cita, igual que un código de reserva.

### Route protection

| Surface | Rule | Enforced where |
|---|---|---|
| `/admin/**` (páginas) | sesión válida | `src/app/admin/layout.tsx` → `requireOwner()` |
| server actions del panel | sesión válida | primera línea de cada función en `src/app/admin/**/actions.ts` (probado en pasos 11, 13, 15) |
| `/cita/[token]` y sus acciones | token cuyo hash existe | `src/server/booking/manage.ts` → `findByToken` |
| `/api/webhooks/wompi` | checksum válido | `src/server/payments/webhook.ts` |
| `/api/cron/expire-holds` | `Authorization: Bearer <CRON_SECRET>` | el propio route handler |

**Enforcement rule:** authorization is checked server-side on every request. Client-side route
guards are cosmetic and never the only check. A hidden button is not a permission. No se usa
`proxy.ts`/`middleware.ts`.

### Roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Dueño | todo el panel; reprogramar/cancelar sin plazo; cobrar; ventas; gastos; ajustes | crear otras cuentas desde la app |
| Cliente (con enlace) | ver su cita; pagarla; cancelar/reprogramar dentro del plazo | ver otras citas; gestionar fuera del plazo |
| Visitante | ver portada, reservar, leer privacidad | entrar al panel |

### Sessions

Cookie de better-auth `HttpOnly`, `SameSite=Lax`, `Secure` en producción; token opaco guardado en
`session`. CSRF: better-auth valida el `Origin` contra `trustedOrigins` (`APP_URL`); las server actions
de Next comparan `Origin` y `Host`.

### Multi-tenancy / row-level isolation

NOT APPLICABLE — una sola barbería y una sola cuenta (ver Non-Goals). RLS está activado en todas las
tablas solo para cerrar la Data API de Supabase; la app se conecta como dueña de las tablas.

---

## 9. BUILD ORDER

**This is the section the whole blueprint exists to produce.** Cada paso tiene cuatro campos — Do,
Done when, Verify, Checkpoint — y se ejecuta en ese orden. Reglas que el constructor aplica en cada
paso:

1. Un paso por sesión de trabajo; ningún paso toca más de 5 archivos ni tiene más de 6 criterios.
2. «Done when» son criterios EARS observables; `Verify` es shell literal que sale 0 cuando el paso está bien.
3. Un paso no está hecho hasta que su Verify pasa **y** los de los pasos anteriores siguen pasando.
4. Checkpoint: commit + etiqueta `step-NN-<slug>`. Si el paso siguiente sale mal, `git reset --hard` a la etiqueta anterior (con aprobación humana: está denegado en `.claude/settings.json`).
5. Nunca adelantes trabajo de pasos posteriores; si un paso está bloqueado, detente y repórtalo.
6. Las variables de entorno se validan por grupos al usarse (`src/lib/env.ts`), así ningún paso exige secretos de un paso posterior (§10, «Required by step»).
7. Ningún Verify depende del commit de su propio Checkpoint; las comprobaciones de estado de git viven en §20.1.

Orden: andamiaje → datos → acceso → primitivas → motor de horarios → reserva en efectivo →
autogestión → pago en línea → webhook → agenda → cobros → gastos → resumen → ajustes → portada/PWA →
despliegue. La primera rebanada vertical completa (reservar en efectivo y cancelar desde el celular)
queda funcionando en el paso 8.

### Step map

| # | Step | Depends on | Touches | Gate |
|---|---|---|---|---|
| 1 | Crear el cascarón de la app y el módulo de entorno | — | `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/lib/env.ts`, `tests/unit/smoke.test.ts` | `pnpm test:unit tests/unit/smoke.test.ts` |
| 2 | Definir el esquema, migrar Postgres local y exponer /api/health | 1 | `src/server/db/schema.ts`, `src/server/db/client.ts`, `src/app/api/health/route.ts`, `tests/integration/schema.test.ts`, `drizzle/**` | `pnpm test:int tests/integration/schema.test.ts` |
| 3 | Configurar better-auth, crear al dueño y sembrar datos | 2 | `src/server/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `scripts/create-owner.ts`, `scripts/seed.ts`, `tests/integration/seed.test.ts` | `pnpm test:int tests/integration/seed.test.ts` |
| 4 | Ingreso del dueño y panel /admin protegido | 3 | `src/app/entrar/page.tsx`, `src/server/session.ts`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `tests/e2e/admin-login.spec.ts` | `pnpm test:e2e tests/e2e/admin-login.spec.ts` |
| 5 | Componentes base, formato de dinero y prueba de tokens | 1 | `src/components/ui/button.tsx`, `src/components/ui/field.tsx`, `src/components/ui/card.tsx`, `src/lib/money.ts`, `tests/unit/tokens.test.ts` | `pnpm test:unit tests/unit/tokens.test.ts` |
| 6 | Motor de disponibilidad con zonas horarias | 2 | `src/lib/time.ts`, `src/server/booking/slots.ts`, `src/server/booking/availability.ts`, `tests/unit/slots.test.ts`, `tests/integration/availability.test.ts` | `pnpm test:unit tests/unit/slots.test.ts` |
| 7 | Reserva pública con pago en efectivo | 5, 6 | `src/server/booking/token.ts`, `src/server/booking/create.ts`, `src/app/reservar/page.tsx`, `src/app/reservar/actions.ts`, `tests/integration/booking-create.test.ts` | `pnpm test:int tests/integration/booking-create.test.ts` |
| 8 | Página de la cita: cancelar y reprogramar por el cliente | 7, 4 | `src/server/booking/manage.ts`, `src/app/cita/[token]/page.tsx`, `src/app/cita/[token]/actions.ts`, `tests/integration/booking-manage.test.ts`, `tests/e2e/booking-cash.spec.ts` | `pnpm test:int tests/integration/booking-manage.test.ts` |
| 9 | Pago por transferencia con Wompi: apartado y enlace de pago | 8 | `src/server/payments/wompi.ts`, `src/server/booking/create.ts`, `src/app/cita/[token]/page.tsx`, `tests/integration/wompi-checkout.test.ts`, `tests/e2e/booking-transfer.spec.ts` | `pnpm test:int tests/integration/wompi-checkout.test.ts` |
| 10 | Webhook de Wompi: confirmar o liberar la cita | 9 | `src/server/payments/webhook.ts`, `src/app/api/webhooks/wompi/route.ts`, `tests/integration/wompi-webhook.test.ts` | `pnpm test:int tests/integration/wompi-webhook.test.ts` |
| 11 | Agenda del dueño: ver, reprogramar y cancelar | 4, 8 | `src/server/admin/agenda.ts`, `src/server/booking/manage.ts`, `src/app/admin/page.tsx`, `src/app/admin/actions.ts`, `tests/integration/agenda.test.ts` | `pnpm test:int tests/integration/agenda.test.ts` |
| 12 | Cobros, no-shows, ventas sin cita y reembolsos | 10, 11 | `src/server/admin/sales.ts`, `src/app/admin/actions.ts`, `src/app/admin/page.tsx`, `src/app/admin/ventas/page.tsx`, `tests/integration/sales.test.ts` | `pnpm test:int tests/integration/sales.test.ts` |
| 13 | Gastos y categorías de gasto | 4 | `src/server/admin/expenses.ts`, `src/app/admin/gastos/page.tsx`, `src/app/admin/gastos/actions.ts`, `tests/integration/expenses.test.ts` | `pnpm test:int tests/integration/expenses.test.ts` |
| 14 | Resumen financiero del negocio | 12, 13 | `src/server/admin/metrics.ts`, `src/app/admin/resumen/page.tsx`, `src/components/charts/bar-list.tsx`, `tests/integration/metrics.test.ts` | `pnpm test:int tests/integration/metrics.test.ts` |
| 15 | Ajustes: servicios, precios, barberos, horarios y políticas | 7, 4 | `src/server/admin/settings.ts`, `src/app/admin/ajustes/page.tsx`, `src/app/admin/ajustes/actions.ts`, `tests/integration/settings.test.ts` | `pnpm test:int tests/integration/settings.test.ts` |
| 16 | Portada, política de privacidad, app instalable y accesibilidad | 8, 5 | `src/app/page.tsx`, `src/app/privacidad/page.tsx`, `src/app/manifest.ts`, `src/app/icons/[size]/route.tsx`, `tests/e2e/public.spec.ts` | `pnpm test:e2e tests/e2e/public.spec.ts` |
| 17 | Cabeceras de seguridad, cron de apartados, CI y despliegue | 9, 14, 15, 16 | `next.config.ts`, `src/app/api/cron/expire-holds/route.ts`, `vercel.json`, `.github/workflows/ci.yml`, `tests/integration/deploy.test.ts` | `pnpm test:int tests/integration/deploy.test.ts` |

---

#### Step 1 — Crear el cascarón de la app y el módulo de entorno

*Task `E1-T1` · epic `01-fundacion` · depende de: nada (Bootstrap de §10)*

**Do**

Archivos:
- `src/app/layout.tsx` — nuevo — layout raíz, idioma es-CO, enlace «Saltar al contenido»
- `src/app/globals.css` — nuevo — Tailwind v4 + tokens de §7
- `src/app/page.tsx` — nuevo — portada provisional con botón «Reservar cita» (se reemplaza en el paso 16)
- `src/lib/env.ts` — nuevo — grupos de variables validados de forma perezosa
- `tests/unit/smoke.test.ts` — nuevo — prueba de `dbEnv()` y `MissingEnvError`

Precondición: el bloque *Bootstrap* (§10 del blueprint, repetido abajo en «Arranque») ya corrió, así
que `package.json`, las configuraciones y las dependencias ya están en la raíz del proyecto. **Este
paso no instala nada ni crea un proyecto con un generador.**

Escribe estos cinco archivos con exactamente este contenido y después corre `pnpm format` una vez
(ajusta el formato al `biome.json` del proyecto).

`src/app/layout.tsx`
```tsx
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Barbería", template: "%s · Barbería" },
  description: "Reserva tu cita en la barbería desde el celular.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh bg-background text-fg antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2"
        >
          Saltar al contenido
        </a>
        <main id="contenido" className="mx-auto w-full max-w-5xl px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
```

`src/app/globals.css`
```css
@import "tailwindcss";

:root {
  color-scheme: light dark;
  --background: #fafaf7;
  --surface: #ffffff;
  --border: #8e8e86;
  --fg: #18181b;
  --fg-muted: #52525b;
  --primary: #7a5410;
  --primary-fg: #ffffff;
  --destructive: #b91c1c;
  --success: #15803d;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0e0e10;
    --surface: #17171a;
    --border: #6b6b74;
    --fg: #f4f4f5;
    --fg-muted: #a1a1aa;
    --primary: #d4a24c;
    --primary-fg: #141414;
    --destructive: #f87171;
    --success: #4ade80;
  }
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-border: var(--border);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-primary: var(--primary);
  --color-primary-fg: var(--primary-fg);
  --color-destructive: var(--destructive);
  --color-success: var(--success);
  --font-sans:
    ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial,
    sans-serif;
  --radius-control: 0.5rem;
  --radius-card: 0.75rem;
}

body {
  font-family: var(--font-sans);
}
```

`src/app/page.tsx`
```tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Barbería</h1>
      <p className="text-fg-muted">Reserva tu cita en minutos, desde el celular.</p>
      <Link
        href="/reservar"
        className="inline-flex min-h-11 items-center rounded-control bg-primary px-5 font-medium text-primary-fg"
      >
        Reservar cita
      </Link>
    </section>
  );
}
```

`src/lib/env.ts` — no lee nada al importarse; cada grupo se valida cuando alguien lo llama, por eso
ningún paso anterior depende de secretos de un paso posterior.
```ts
import { z } from "zod";

/**
 * Environment access, split into groups that are validated lazily — on the first call, never at
 * import. A group is required only from the build step that introduces its consumer (blueprint
 * §10, "Required by step"), so earlier gates never depend on later secrets.
 */
export class MissingEnvError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`MissingEnvError: ${variable} is missing or invalid`);
    this.name = "MissingEnvError";
    this.variable = variable;
  }
}

function fail(error: z.ZodError): never {
  throw new MissingEnvError(String(error.issues[0]?.path[0] ?? "unknown"));
}

const required = z.string().min(1);

const dbSchema = z.object({ DATABASE_URL: required });
const authSchema = z.object({ APP_URL: z.url(), BETTER_AUTH_SECRET: z.string().min(32) });
const ownerSchema = z.object({
  OWNER_NAME: required,
  OWNER_EMAIL: z.email(),
  OWNER_PASSWORD: z.string().min(10),
});
const wompiSchema = z.object({ WOMPI_PUBLIC_KEY: required, WOMPI_INTEGRITY_SECRET: required });
const wompiEventsSchema = z.object({ WOMPI_EVENTS_SECRET: required });
const cronSchema = z.object({ CRON_SECRET: z.string().min(16) });

export function dbEnv(): z.infer<typeof dbSchema> {
  const result = dbSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function authEnv(): z.infer<typeof authSchema> {
  const result = authSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function ownerEnv(): z.infer<typeof ownerSchema> {
  const result = ownerSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function wompiEnv(): z.infer<typeof wompiSchema> {
  const result = wompiSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function wompiEventsEnv(): z.infer<typeof wompiEventsSchema> {
  const result = wompiEventsSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}

export function cronEnv(): z.infer<typeof cronSchema> {
  const result = cronSchema.safeParse(process.env);
  return result.success ? result.data : fail(result.error);
}
```

`tests/unit/smoke.test.ts`
```ts
import { describe, expect, it } from "vitest";
import { dbEnv, MissingEnvError } from "../../src/lib/env.ts";

describe("env groups", () => {
  it("throws a named MissingEnvError when DATABASE_URL is missing", () => {
    const saved = process.env.DATABASE_URL;
    Reflect.deleteProperty(process.env, "DATABASE_URL");
    try {
      expect(() => dbEnv()).toThrow(MissingEnvError);
    } finally {
      if (saved !== undefined) process.env.DATABASE_URL = saved;
    }
  });

  it("returns the value when DATABASE_URL is present", () => {
    const saved = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://example/db";
    try {
      expect(dbEnv().DATABASE_URL).toBe("postgres://example/db");
    } finally {
      if (saved === undefined) Reflect.deleteProperty(process.env, "DATABASE_URL");
      else process.env.DATABASE_URL = saved;
    }
  });
});
```

**Done when**

- [ ] WHEN `pnpm lint` corre desde la raíz del proyecto con el bundle presente en `blueprints/` THE SYSTEM SHALL terminar con código 0.
- [ ] WHEN `pnpm typecheck` corre THE SYSTEM SHALL terminar con código 0 y cero errores.
- [ ] WHEN `pnpm test:unit tests/unit/smoke.test.ts` corre THE SYSTEM SHALL comprobar que `dbEnv()` lanza `MissingEnvError` sin `DATABASE_URL` y devuelve el valor cuando existe, con 0 pruebas fallidas.
- [ ] WHEN `pnpm build` corre THE SYSTEM SHALL terminar con código 0.
- [ ] WHEN la app compilada arranca y se pide `/` THE SYSTEM SHALL responder HTTP 200.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm lint                                 # expect: exit 0
pnpm typecheck                            # expect: exit 0
pnpm test:unit tests/unit/smoke.test.ts   # expect: exit 0, 2 passed, 0 failed
pnpm build                                # expect: exit 0
bash scripts/serve-check.sh / 200         # expect: exit 0 — prints `serve-check: / -> 200 ok`
```

**Checkpoint**

```bash
git add -A && git commit -m "step 1: scaffold"
git tag step-01-scaffold
# rollback target if the next step goes wrong: git reset --hard step-01-scaffold
```

---

#### Step 2 — Definir el esquema, migrar Postgres local y exponer /api/health

*Task `E1-T2` · epic `01-fundacion` · depende de: paso 1*

**Do**

Archivos:
- `src/server/db/schema.ts` — nuevo — esquema completo de §4
- `src/server/db/client.ts` — nuevo — cliente Drizzle sobre `postgres`
- `src/app/api/health/route.ts` — nuevo — `GET` que hace `select 1`
- `tests/integration/schema.test.ts` — nuevo — tablas, restricción de solapamiento, RLS
- `drizzle/**` — generado — la migración de `pnpm db:generate` y la `--custom` `constraints_rls`

1. `pnpm db:up` (Postgres 17 en Docker, puerto 54329; crea `barberia`, `barberia_test` y `barberia_e2e`).
2. Escribe `src/server/db/schema.ts` con exactamente este contenido:

```ts
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

// ── better-auth core tables (field names are fixed by the library) ─────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: tstz("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: tstz("access_token_expires_at"),
  refreshTokenExpiresAt: tstz("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: tstz("expires_at").notNull(),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ── enums ──────────────────────────────────────────────────────────────────────
export const bookingStatus = pgEnum("booking_status", [
  "held",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
]);
export const bookingPaymentMethod = pgEnum("booking_payment_method", ["cash", "transfer"]);
export const depositStatus = pgEnum("deposit_status", [
  "none",
  "pending",
  "paid",
  "applied",
  "transferred",
  "refund_pending",
  "refunded",
  "forfeited",
]);
export const cancelActor = pgEnum("cancel_actor", ["customer", "owner", "system"]);
export const paymentStatus = pgEnum("payment_status", [
  "PENDING",
  "APPROVED",
  "DECLINED",
  "VOIDED",
  "ERROR",
]);
export const saleKind = pgEnum("sale_kind", ["deposit", "balance", "walk_in", "refund"]);
export const moneyMethod = pgEnum("money_method", [
  "cash",
  "nequi",
  "daviplata",
  "card",
  "transfer",
  "wompi",
]);

// ── shop configuration ─────────────────────────────────────────────────────────
export const shopSettings = pgTable(
  "shop_settings",
  {
    id: smallint("id").primaryKey().default(1),
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("America/Bogota"),
    whatsappPhone: text("whatsapp_phone").notNull(),
    address: text("address").notNull().default(""),
    depositPercent: smallint("deposit_percent").notNull().default(100),
    selfServiceCutoffHours: smallint("self_service_cutoff_hours").notNull().default(4),
    holdMinutes: smallint("hold_minutes").notNull().default(15),
    slotIntervalMinutes: smallint("slot_interval_minutes").notNull().default(15),
    minNoticeMinutes: smallint("min_notice_minutes").notNull().default(60),
    maxAdvanceDays: smallint("max_advance_days").notNull().default(30),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("shop_settings_singleton", sql`${t.id} = 1`),
    check("shop_settings_deposit_percent", sql`${t.depositPercent} between 10 and 100`),
    check("shop_settings_cutoff_hours", sql`${t.selfServiceCutoffHours} between 3 and 5`),
    check("shop_settings_hold_minutes", sql`${t.holdMinutes} between 10 and 30`),
  ],
);

export const barbers = pgTable("barbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: smallint("sort_order").notNull().default(0),
  createdAt: tstz("created_at").notNull().defaultNow(),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    durationMinutes: smallint("duration_minutes").notNull(),
    priceCop: integer("price_cop").notNull(),
    bufferAfterMinutes: smallint("buffer_after_minutes").notNull().default(0),
    active: boolean("active").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("services_duration", sql`${t.durationMinutes} between 10 and 240`),
    check("services_price", sql`${t.priceCop} > 0`),
    check("services_buffer", sql`${t.bufferAfterMinutes} between 0 and 60`),
  ],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0 = domingo … 6 = sábado
    startTime: time("start_time").notNull(), // wall clock in shop_settings.timezone
    endTime: time("end_time").notNull(),
  },
  (t) => [
    check("working_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("working_hours_range", sql`${t.endTime} > ${t.startTime}`),
    uniqueIndex("working_hours_barber_day_start").on(t.barberId, t.weekday, t.startTime),
  ],
);

export const timeOff = pgTable(
  "time_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = the whole shop is closed
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "cascade" }),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    reason: text("reason").notNull().default(""),
  },
  (t) => [
    check("time_off_range", sql`${t.endsAt} > ${t.startsAt}`),
    index("time_off_starts_at").on(t.startsAt),
  ],
);

// ── customers and bookings ─────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(), // "57" + 10 digits
  consentAt: tstz("consent_at").notNull(), // Ley 1581 authorization
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    startsAt: tstz("starts_at").notNull(),
    endsAt: tstz("ends_at").notNull(),
    blockedFrom: tstz("blocked_from").notNull(),
    blockedUntil: tstz("blocked_until").notNull(),
    status: bookingStatus("status").notNull(),
    paymentMethod: bookingPaymentMethod("payment_method").notNull(),
    priceCop: integer("price_cop").notNull(),
    depositCop: integer("deposit_cop").notNull().default(0),
    depositStatus: depositStatus("deposit_status").notNull().default("none"),
    manageTokenHash: text("manage_token_hash").notNull().unique(),
    holdExpiresAt: tstz("hold_expires_at"),
    rescheduledFromId: uuid("rescheduled_from_id").references((): AnyPgColumn => bookings.id),
    cancelledAt: tstz("cancelled_at"),
    cancelledBy: cancelActor("cancelled_by"),
    cancelReason: text("cancel_reason"),
    completedAt: tstz("completed_at"),
    createdAt: tstz("created_at").notNull().defaultNow(),
    updatedAt: tstz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    check("bookings_time_range", sql`${t.endsAt} > ${t.startsAt}`),
    check(
      "bookings_blocked_range",
      sql`${t.blockedFrom} <= ${t.startsAt} and ${t.blockedUntil} >= ${t.endsAt}`,
    ),
    check("bookings_deposit", sql`${t.depositCop} between 0 and ${t.priceCop}`),
    check("bookings_hold", sql`${t.status} <> 'held' or ${t.holdExpiresAt} is not null`),
    index("bookings_barber_starts").on(t.barberId, t.startsAt),
    index("bookings_customer").on(t.customerId),
    index("bookings_status_hold").on(t.status, t.holdExpiresAt),
  ],
);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "restrict" }),
  reference: text("reference").notNull().unique(), // "BK-" + booking id
  amountCop: integer("amount_cop").notNull(),
  status: paymentStatus("status").notNull().default("PENDING"),
  wompiTransactionId: text("wompi_transaction_id").unique(),
  lastEventAt: tstz("last_event_at"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

// ── money ledger ───────────────────────────────────────────────────────────────
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "restrict" }),
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    kind: saleKind("kind").notNull(),
    method: moneyMethod("method").notNull(),
    amountCop: integer("amount_cop").notNull(), // negative only for kind = 'refund'
    occurredAt: tstz("occurred_at").notNull().defaultNow(),
    note: text("note").notNull().default(""),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("sales_amount_sign", sql`(${t.kind} = 'refund') = (${t.amountCop} < 0) and ${t.amountCop} <> 0`),
    uniqueIndex("sales_booking_kind")
      .on(t.bookingId, t.kind)
      .where(sql`${t.bookingId} is not null`),
    index("sales_occurred_at").on(t.occurredAt),
  ],
);

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: tstz("created_at").notNull().defaultNow(),
});

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => expenseCategories.id, { onDelete: "restrict" }),
    amountCop: integer("amount_cop").notNull(),
    spentOn: date("spent_on", { mode: "string" }).notNull(), // shop-local calendar day
    description: text("description").notNull().default(""),
    method: moneyMethod("method").notNull().default("cash"),
    createdAt: tstz("created_at").notNull().defaultNow(),
  },
  (t) => [
    check("expenses_amount", sql`${t.amountCop} > 0`),
    index("expenses_spent_on").on(t.spentOn),
  ],
);
```

3. `src/server/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbEnv } from "../../lib/env.ts";
import * as schema from "./schema.ts";

// prepare: false → compatible with Supabase's transaction pooler in production.
const client = postgres(dbEnv().DATABASE_URL, { prepare: false, max: 10, onnotice: () => {} });

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { client as sqlClient };
```

4. `pnpm db:generate` — drizzle-kit escribe la primera migración en `drizzle/` con el nombre que él
   elija. No la renombres ni la edites.
5. `pnpm exec drizzle-kit generate --custom --name=constraints_rls` — crea un archivo SQL vacío cuyo
   nombre termina en `_constraints_rls.sql`. Escribe en él exactamente:

```sql
-- Hand-written part of the schema: things Drizzle cannot express.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- No two held/confirmed bookings of one barber may overlap (buffers included).
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING gist (
  "barber_id" WITH =,
  tstzrange("blocked_from", "blocked_until", '[)') WITH &&
) WHERE ("status" IN ('held', 'confirmed'));
--> statement-breakpoint
-- Supabase exposes schema public through its Data API; RLS with no policies closes it.
-- The app connects as the table owner, which bypasses RLS.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "shop_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "barbers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "working_hours" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "time_off" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "expense_categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "expenses" ENABLE ROW LEVEL SECURITY;
```

6. `pnpm db:migrate`.
7. `src/app/api/health/route.ts`: `export const dynamic = "force-dynamic";` y un `GET` que ejecuta
   `select 1` con `sqlClient` y responde `Response.json({ ok: true, db: "up" })` (200) o, si la consulta
   lanza, `Response.json({ ok: false, db: "down" }, { status: 503 })`.
8. `tests/integration/schema.test.ts` (usa `sql`/`truncateAll` de `tests/setup/db.ts` y `seedShop` de
   `tests/setup/fixtures.ts`; `beforeEach` → `truncateAll()` + `seedShop()`):
   - para cada tabla de la lista del criterio 1, `select to_regclass('public."<tabla>"')` no es null;
   - insertar dos reservas `confirmed` del mismo barbero con rangos `blocked_*` solapados → la segunda
     falla con `code === "23P01"`; con la segunda en `cancelled` → se inserta; dos rangos contiguos
     (`[09:00, 09:30)` y `[09:30, 10:00)`) → ambos se insertan;
   - `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'` → todas con `relrowsecurity = true`.
   Para insertar reservas crudas usa `customer_id` de `seedShop()`, `price_cop` 15000,
   `payment_method` `'cash'` y un `manage_token_hash` distinto por fila.

**Done when**

- [ ] WHEN `pnpm db:migrate` corre contra la base local vacía THE SYSTEM SHALL terminar con código 0 y crear las tablas `user`, `session`, `account`, `verification`, `shop_settings`, `barbers`, `services`, `working_hours`, `time_off`, `customers`, `bookings`, `payments`, `sales`, `expense_categories` y `expenses`.
- [ ] WHEN `pnpm db:check` corre después de migrar THE SYSTEM SHALL terminar con código 0.
- [ ] WHEN se insertan dos reservas `confirmed` del mismo barbero cuyos rangos `[blocked_from, blocked_until)` se solapan THE SYSTEM SHALL rechazar la segunda con el código de Postgres `23P01` (restricción `bookings_no_overlap`), y WHEN la segunda está `cancelled` o los rangos solo se tocan THE SYSTEM SHALL aceptarla.
- [ ] WHEN se leen las tablas del esquema `public` THE SYSTEM SHALL reportar `relrowsecurity = true` en todas.
- [ ] WHEN la app compilada arranca con la base arriba y se pide `/api/health` THE SYSTEM SHALL responder HTTP 200.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                       # expect: exit 0 — container healthy
pnpm db:migrate                                  # expect: exit 0
pnpm db:check                                    # expect: exit 0
pnpm test:int tests/integration/schema.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                   # expect: exit 0
pnpm lint                                        # expect: exit 0
pnpm build                                       # expect: exit 0
bash scripts/serve-check.sh /api/health 200      # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 2: db-schema"
git tag step-02-db-schema
# rollback target if the next step goes wrong: git reset --hard step-02-db-schema
```

---

#### Step 3 — Configurar better-auth, crear al dueño y sembrar datos

*Task `E1-T3` · epic `01-fundacion` · depende de: paso 2*

**Do**

Archivos:
- `src/server/auth.ts` — nuevo — instancia de better-auth
- `src/app/api/auth/[...all]/route.ts` — nuevo — handler de better-auth
- `scripts/create-owner.ts` — nuevo — `ensureOwner()` idempotente + CLI
- `scripts/seed.ts` — nuevo — `seed()` idempotente + CLI
- `tests/integration/seed.test.ts` — nuevo

1. `src/server/auth.ts`:

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authEnv } from "../lib/env.ts";
import { db } from "./db/client.ts";
import { account, session, user, verification } from "./db/schema.ts";

const env = authEnv();

export const auth = betterAuth({
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 10 },
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
});
```

2. `src/app/api/auth/[...all]/route.ts`:

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

export const dynamic = "force-dynamic";
export const { GET, POST } = toNextJsHandler(auth);
```

3. `scripts/create-owner.ts` exporta `ensureOwner(input: { name: string; email: string; password: string }): Promise<"created" | "exists">`:
   si ya hay un `user` con ese email devuelve `"exists"`; si no, usa el contexto de better-auth:
   `const ctx = await auth.$context;` `const hash = await ctx.password.hash(input.password);`
   `const created = await ctx.adapter.create({ model: "user", data: { name, email, emailVerified: true } });`
   `await ctx.adapter.create({ model: "account", data: { userId: created.id, accountId: created.id, providerId: "credential", password: hash } });`
   y devuelve `"created"`. Al final, el mismo patrón de `scripts/db-reset.ts` para detectar ejecución
   directa (`process.argv[1]` + `pathToFileURL`): llama `ensureOwner(ownerEnv())` con los nombres
   `OWNER_NAME/OWNER_EMAIL/OWNER_PASSWORD`, imprime el resultado, `await sqlClient.end()`.
4. `scripts/seed.ts` exporta `seed(): Promise<void>`, idempotente (todo con
   `on conflict do nothing` o «insertar solo si no existe»):
   - `shop_settings` id 1: nombre `Barbería`, `whatsapp_phone` `573001112233`, dirección vacía, resto por defecto;
   - barberos `Andrés` (sort 1) y `Camilo` (sort 2), solo si la tabla está vacía;
   - servicios, solo si la tabla está vacía: `Corte clásico` 30 min 15000 COP (sort 1),
     `Corte + barba` 45 min 25000 COP (sort 2), `Barba` 20 min 10000 COP (sort 3), búfer 0;
   - horario lunes a sábado (weekday 1–6) 09:00–19:00 para cada barbero (`on conflict do nothing`
     sobre `working_hours_barber_day_start`);
   - categorías de gasto `Arriendo`, `Productos`, `Servicios públicos`, `Nómina`, `Mantenimiento`, `Otros`;
   - `ensureOwner(ownerEnv() → name/email/password)`.
   Ejecución directa: `await seed()`, imprime `seed: ok`, `await sqlClient.end()`.
   Todos los imports con rutas relativas `.ts` (`../src/server/auth.ts`, …): Node ejecuta estos scripts
   con su soporte nativo de TypeScript y no entiende `@/`.
5. `tests/integration/seed.test.ts`: `beforeAll` → `truncateAll()`, luego `await seed()` dos veces;
   comprueba los criterios 1–5 con consultas SQL y con `auth.api.signInEmail({ body: { email, password } })`
   (debe devolver `token`), `auth.api.signInEmail` con clave errónea (debe lanzar y no crear filas en
   `session`) y `auth.api.signUpEmail({ body: { name: "X", email: "otro@barberia.local", password: "una-clave-larga-1" } })` (debe lanzar).

**Done when**

- [ ] WHEN `seed()` corre dos veces seguidas THE SYSTEM SHALL dejar exactamente una fila en `shop_settings` y exactamente un `user` con el email `OWNER_EMAIL`.
- [ ] WHEN `pnpm test:int tests/integration/seed.test.ts` corre THE SYSTEM SHALL confirmar que existen los servicios `Corte clásico`, `Corte + barba` y `Barba`, los barberos `Andrés` y `Camilo` y las categorías `Arriendo`, `Productos`, `Servicios públicos`, `Nómina`, `Mantenimiento` y `Otros`.
- [ ] WHEN `auth.api.signInEmail` recibe el email y la clave del dueño sembrado THE SYSTEM SHALL devolver un token de sesión.
- [ ] WHEN `auth.api.signInEmail` recibe una clave incorrecta THE SYSTEM SHALL rechazarla y no crear filas en `session`.
- [ ] WHEN `auth.api.signUpEmail` recibe un email nuevo THE SYSTEM SHALL rechazarlo porque el registro está deshabilitado.
- [ ] WHEN `pnpm db:seed` corre dos veces contra la base de desarrollo THE SYSTEM SHALL terminar con código 0 ambas veces.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                     # expect: exit 0
pnpm db:migrate                                # expect: exit 0
pnpm db:seed                                   # expect: exit 0 — prints `seed: ok`
pnpm db:seed                                   # expect: exit 0 — second run, idempotent
pnpm test:int tests/integration/seed.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                 # expect: exit 0
pnpm lint                                      # expect: exit 0
pnpm build                                     # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 3: auth-seed"
git tag step-03-auth-seed
# rollback target if the next step goes wrong: git reset --hard step-03-auth-seed
```

---

#### Step 4 — Ingreso del dueño y panel /admin protegido

*Task `E1-T4` · epic `01-fundacion` · depende de: paso 3*

**Do**

Archivos:
- `src/app/entrar/page.tsx` — nuevo — formulario de ingreso (cliente) y salida con `?salir=1`
- `src/server/session.ts` — nuevo — `getOwnerSession()` y `requireOwner()`
- `src/app/admin/layout.tsx` — nuevo — exige sesión, navegación del panel
- `src/app/admin/page.tsx` — nuevo — «Agenda» provisional (se completa en el paso 11)
- `tests/e2e/admin-login.spec.ts` — nuevo

1. `src/server/session.ts` (único archivo de `src/server/**` que puede importar `next/headers` y `next/navigation`):
   `getOwnerSession()` → `auth.api.getSession({ headers: await headers() })`;
   `requireOwner()` → si no hay sesión, `redirect("/entrar")`; si hay, la devuelve. Como el registro
   está deshabilitado, cualquier usuario con sesión es el dueño.
2. `src/app/entrar/page.tsx` — `"use client"`. Crea el cliente con
   `createAuthClient()` de `better-auth/react` (sin `baseURL`: usa el mismo origen). Formulario con
   `<label>` «Correo» y «Contraseña» (`type="email"`, `type="password"`, `autoComplete` `email` y
   `current-password`, pegar permitido), botón «Entrar». Al enviar: `authClient.signIn.email({ email, password })`;
   con error muestra `Correo o contraseña incorrectos` en un elemento `role="alert"`; con éxito
   `router.push("/admin")` y `router.refresh()`. Si la URL trae `?salir=1`, al montar llama
   `authClient.signOut()` y muestra «Sesión cerrada». Título `<h1>` «Entrar».
3. `src/app/admin/layout.tsx` — `export const dynamic = "force-dynamic";`, `await requireOwner()`,
   `<nav aria-label="Panel">` con enlaces «Agenda» `/admin`, «Ventas» `/admin/ventas`, «Gastos»
   `/admin/gastos`, «Resumen» `/admin/resumen`, «Ajustes» `/admin/ajustes`, «Salir» `/entrar?salir=1`.
   Los enlaces a páginas de pasos posteriores dan 404 hasta que ese paso exista; es esperado.
4. `src/app/admin/page.tsx` — `<h1>` «Agenda» y el texto «Aquí verás las citas del día.».
5. `tests/e2e/admin-login.spec.ts` (usa `process.env.OWNER_EMAIL`/`OWNER_PASSWORD`; el servidor de
   Playwright ya sembró la base e2e): anónimo en `/admin` → URL termina en `/entrar`; ingreso válido →
   `getByRole("heading", { level: 1, name: "Agenda" })` visible; clave errónea → alerta con el texto y la
   URL sigue en `/entrar`; ingresar y luego abrir `/entrar?salir=1`, esperar «Sesión cerrada», abrir
   `/admin` → vuelve a `/entrar`.

**Done when**

- [ ] WHEN un visitante sin sesión abre `/admin` THE SYSTEM SHALL redirigirlo a `/entrar`.
- [ ] WHEN el dueño envía en `/entrar` el `OWNER_EMAIL` y el `OWNER_PASSWORD` sembrados THE SYSTEM SHALL llevarlo a `/admin` y mostrar un encabezado de nivel 1 «Agenda».
- [ ] WHEN se envía una clave incorrecta THE SYSTEM SHALL quedarse en `/entrar` y mostrar `Correo o contraseña incorrectos` en un elemento con `role="alert"`.
- [ ] WHEN el dueño con sesión abre `/entrar?salir=1` THE SYSTEM SHALL cerrar la sesión de modo que una nueva visita a `/admin` redirija a `/entrar`.
- [ ] WHEN `pnpm test:e2e tests/e2e/admin-login.spec.ts` corre THE SYSTEM SHALL terminar con código 0 y 0 pruebas fallidas.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                    # expect: exit 0
pnpm typecheck                                # expect: exit 0
pnpm lint                                     # expect: exit 0
pnpm test:e2e tests/e2e/admin-login.spec.ts   # expect: exit 0, 0 failed
pnpm build                                    # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 4: admin-login"
git tag step-04-admin-login
# rollback target if the next step goes wrong: git reset --hard step-04-admin-login
```

---

#### Step 5 — Componentes base, formato de dinero y prueba de tokens

*Task `E1-T5` · epic `01-fundacion` · depende de: paso 1*

**Do**

Archivos:
- `src/components/ui/button.tsx` — nuevo
- `src/components/ui/field.tsx` — nuevo
- `src/components/ui/card.tsx` — nuevo
- `src/lib/money.ts` — nuevo — `formatCop()` y `parseCop()`
- `tests/unit/tokens.test.ts` — nuevo

1. `Button` (`src/components/ui/button.tsx`): acepta las props de `<button>` más
   `variant?: "primary" | "secondary" | "danger"` (por defecto `primary`); `type` por defecto `"button"`;
   clases base `inline-flex min-h-11 items-center justify-center rounded-control px-4 font-medium
   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60`;
   `primary` → `bg-primary text-primary-fg`, `secondary` → `border border-border bg-surface text-fg`,
   `danger` → `border border-destructive text-destructive`.
2. `Field` (`src/components/ui/field.tsx`): props `label`, `name`, `error?`, `hint?` y el resto de
   `<input>`; genera `id` con `useId()` (sin `"use client"`: `useId` funciona en Server Components),
   `<label htmlFor={id}>`, `aria-invalid` cuando hay error, `aria-describedby` apuntando al texto de
   ayuda y al error; el error va en `<p role="alert" className="text-destructive">`. Input con
   `min-h-11 rounded-control border border-border bg-surface px-3`.
3. `Card` (`src/components/ui/card.tsx`): `<section>` con `rounded-card border border-border bg-surface p-4`,
   prop opcional `title` renderizado como `<h2 className="text-lg font-semibold">`.
4. `src/lib/money.ts`: `formatCop(value: number): string` con
   `new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })`;
   `parseCop(input: string): number | null` que quita todo lo que no sea dígito y devuelve el entero
   (o `null` si queda vacío).
5. `tests/unit/tokens.test.ts`:
   - lee `src/app/globals.css`; el bloque `:root { … }` inicial y el bloque dentro de
     `@media (prefers-color-scheme: dark)` definen cada uno los nueve tokens del criterio 1;
   - recorre con `fs.readdirSync(…, { recursive: true })` todos los `.tsx` de `src/components/` y `src/app/`
     excepto `src/app/layout.tsx` y cualquier ruta bajo `src/app/icons/`, y no encuentra ninguna
     coincidencia de `/#[0-9a-fA-F]{3,8}\b/`;
   - importa los tres módulos de `src/components/ui/` y comprueba que `Button`, `Field` y `Card` son funciones;
   - `parseCop("$ 15.000")` es `15000`, `parseCop("abc")` es `null`, y `formatCop(15000)` coincide con `/15\.000/`.

**Done when**

- [ ] WHEN `pnpm test:unit tests/unit/tokens.test.ts` corre THE SYSTEM SHALL comprobar que `src/app/globals.css` define `--background`, `--surface`, `--border`, `--fg`, `--fg-muted`, `--primary`, `--primary-fg`, `--destructive` y `--success` tanto en `:root` como dentro del bloque `prefers-color-scheme: dark`.
- [ ] WHEN esa prueba recorre los `.tsx` de `src/components/` y `src/app/` salvo `src/app/layout.tsx` y `src/app/icons/` THE SYSTEM SHALL encontrar cero literales de color hexadecimales.
- [ ] WHEN esa prueba importa `src/components/ui/button.tsx`, `field.tsx` y `card.tsx` THE SYSTEM SHALL encontrar las funciones exportadas `Button`, `Field` y `Card`.
- [ ] WHEN `parseCop` recibe `$ 15.000` THE SYSTEM SHALL devolver `15000`, y WHEN recibe `abc` THE SYSTEM SHALL devolver `null`.
- [ ] WHEN `pnpm typecheck` y `pnpm lint` corren THE SYSTEM SHALL terminar con código 0.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm test:unit tests/unit/tokens.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                             # expect: exit 0
pnpm lint                                  # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 5: ui-base"
git tag step-05-ui-base
# rollback target if the next step goes wrong: git reset --hard step-05-ui-base
```

---

#### Step 6 — Motor de disponibilidad con zonas horarias

*Task `E1-T6` · epic `01-fundacion` · depende de: paso 2*

**Do**

Archivos:
- `src/lib/time.ts` — nuevo — utilidades de zona horaria con `Intl`
- `src/server/booking/slots.ts` — nuevo — `generateSlots()` puro
- `src/server/booking/availability.ts` — nuevo — `getAvailability()` sobre la base
- `tests/unit/slots.test.ts` — nuevo
- `tests/integration/availability.test.ts` — nuevo

1. `src/lib/time.ts` (sin dependencias, solo `Intl`):
   - `offsetMinutes(instant: Date, timeZone: string): number` — desfase de la zona en ese instante
     (con `Intl.DateTimeFormat(..., { timeZoneName: "longOffset" })` o comparando partes);
   - `wallTimeToInstant(day: string, hhmm: string, timeZone: string): Date | null` — `day` es
     `YYYY-MM-DD`. Algoritmo: `guess = Date.UTC(y, m-1, d, h, min)`; candidatos
     `guess - offsetMinutes(guess - 24h)` y `guess - offsetMinutes(guess + 24h)` (en ms); conserva
     los que al mostrarse en la zona dan exactamente ese día y hora; devuelve el menor (primera
     ocurrencia en horas ambiguas) o `null` si ninguno coincide (hora inexistente);
   - `localDay(instant: Date, timeZone: string): string` (`YYYY-MM-DD`), `weekdayOf(day: string): number`
     (0 = domingo), `addDays(day: string, n: number): string`, `minutesOf(hhmm: string): number`;
   - `formatDateTime(instant: Date, timeZone: string): string` y `formatTime(...)` para la interfaz, con
     `Intl.DateTimeFormat("es-CO", …)`.
2. `src/server/booking/slots.ts`:

```ts
export type Window = { start: string; end: string }; // "HH:MM" wall clock, already filtered to the day's weekday
export type Busy = { from: Date; until: Date };      // half-open [from, until)
export type SlotInput = {
  timeZone: string;
  day: string;                 // "YYYY-MM-DD" in timeZone
  windows: Window[];
  busy: Busy[];                // bookings (blocked_from..blocked_until) and time off
  durationMinutes: number;
  bufferAfterMinutes: number;
  intervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  now: Date;
};
export function generateSlots(input: SlotInput): Date[]; // ascending UTC instants
```

   Reglas: si `day` es posterior a `localDay(now) + maxAdvanceDays`, devuelve `[]`. Para cada ventana,
   candidatos desde `start` cada `intervalMinutes` mientras `inicio + duración <= end` (comparando
   minutos del reloj local); cada candidato se convierte con `wallTimeToInstant` (si es `null`, se
   omite); se descarta si `instante < now + minNoticeMinutes` o si
   `[instante, instante + duración + búfer)` se solapa con algún `busy` (intervalos semiabiertos).
   Sin duplicados, orden ascendente.
3. `src/server/booking/availability.ts`: `getAvailability(input: { day: string; serviceId: string; barberId: string | "any"; now: Date }): Promise<{ barberId: string; startsAt: Date }[]>`.
   Lee `shop_settings` (id 1), el servicio activo, los barberos activos (uno o todos, por `sort_order`),
   sus `working_hours` del `weekdayOf(day)`, los `time_off` del barbero o de toda la tienda
   (`barber_id is null`) que tocan ese día, y las reservas que bloquean: `status = 'confirmed'` o
   (`status = 'held'` y `hold_expires_at > now`). Llama `generateSlots` por barbero. Con `"any"`,
   une los resultados y para cada hora conserva el primer barbero por `sort_order`.
4. `tests/unit/slots.test.ts` — un caso por cada criterio 1–5 con estos datos exactos (todos con
   `busy: []` salvo el 5, `bufferAfterMinutes: 0` salvo el 5, `minNoticeMinutes: 0` salvo el 1 y el 5,
   `maxAdvanceDays: 400`, `durationMinutes` 30):
   - Bogotá: `day` `2026-10-05`, ventana `09:00`–`19:00`, intervalo 15, `minNoticeMinutes` 60,
     `now` `2026-10-01T00:00:00Z`;
   - Santiago (salto adelante): `America/Santiago`, `day` `2026-09-06`, ventana `00:00`–`02:00`,
     intervalo 30, `now` `2026-09-01T00:00:00Z`;
   - Santiago (atraso): `day` `2026-04-04`, ventana `22:30`–`23:30`, intervalo 30, `now` `2026-04-01T00:00:00Z`;
   - Kolkata: `Asia/Kolkata`, `day` `2026-10-05`, ventana `09:00`–`10:00`, intervalo 30, `now` `2026-10-01T00:00:00Z`;
   - búfer: Bogotá `2026-10-05`, ventana `09:00`–`19:00`, intervalo 15, `bufferAfterMinutes` 10,
     `minNoticeMinutes` 0, `busy` `[{ from: 2026-10-05T15:00:00Z, until: 2026-10-05T15:45:00Z }]`,
     `now` `2026-10-01T00:00:00Z`.
   Más dos casos extra: `now` `2026-10-05T14:10:00Z` con `minNoticeMinutes` 60 → el primer slot de
   Bogotá es `2026-10-05T15:15:00.000Z`; `maxAdvanceDays` 2 con `now` `2026-10-01T00:00:00Z` → `[]`.
5. `tests/integration/availability.test.ts` — `truncateAll()` + `seedShop()`; con `now`
   `2026-10-01T12:00:00Z` y `day` `2026-10-05` (lunes): una reserva `confirmed` de Andrés 10:00–10:30
   local elimina `2026-10-05T15:00:00.000Z` de Andrés; una reserva `held` con `hold_expires_at`
   `2026-10-01T11:00:00Z` no elimina nada; un `time_off` con `barber_id` null que cubre todo el día
   deja la lista vacía.

**Done when**

- [ ] WHEN `generateSlots` corre para `America/Bogota` el `2026-10-05` con ventana 09:00–19:00, servicio de 30 minutos, intervalo de 15, sin bloqueos, `minNoticeMinutes` 60 y `now` `2026-10-01T00:00:00Z` THE SYSTEM SHALL devolver 39 slots, el primero `2026-10-05T14:00:00.000Z` y el último `2026-10-05T23:30:00.000Z`.
- [ ] WHEN la ventana es 00:00–02:00 en `America/Santiago` el `2026-09-06` (cambio de hora hacia adelante) con servicio e intervalo de 30 minutos THE SYSTEM SHALL devolver exactamente `2026-09-06T04:00:00.000Z` y `2026-09-06T04:30:00.000Z`.
- [ ] WHEN la ventana es 22:30–23:30 en `America/Santiago` el `2026-04-04` (noche del cambio de hora hacia atrás) con servicio e intervalo de 30 minutos THE SYSTEM SHALL devolver exactamente `2026-04-05T01:30:00.000Z` y `2026-04-05T02:00:00.000Z`.
- [ ] WHEN la ventana es 09:00–10:00 en `Asia/Kolkata` el `2026-10-05` con servicio e intervalo de 30 minutos THE SYSTEM SHALL devolver exactamente `2026-10-05T03:30:00.000Z` y `2026-10-05T04:00:00.000Z`.
- [ ] WHEN existe un bloqueo `[2026-10-05T15:00Z, 2026-10-05T15:45Z)` y el servicio de 30 minutos tiene búfer de 10 THE SYSTEM SHALL omitir todo slot de Bogotá cuyo `[inicio, inicio + 40 min)` se solape y conservar `2026-10-05T14:15:00.000Z` y `2026-10-05T15:45:00.000Z`.
- [ ] WHEN `getAvailability` corre contra la base de pruebas THE SYSTEM SHALL excluir un slot ocupado por una reserva `confirmed`, incluir un slot cuya única reserva es `held` con `hold_expires_at` vencido, y no devolver slots en un día cubierto por un `time_off` de toda la tienda.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm test:unit tests/unit/slots.test.ts                # expect: exit 0, 0 failed
pnpm db:up                                             # expect: exit 0
pnpm test:int tests/integration/availability.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                         # expect: exit 0
pnpm lint                                              # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 6: slot-engine"
git tag step-06-slot-engine
# rollback target if the next step goes wrong: git reset --hard step-06-slot-engine
```

---

#### Step 7 — Reserva pública con pago en efectivo

*Task `E2-T1` · epic `02-reservas-y-pagos` · depende de: paso 5, paso 6*

**Do**

Archivos:
- `src/server/booking/token.ts` — nuevo — token de gestión y su hash
- `src/server/booking/create.ts` — nuevo — `createBooking()` transaccional
- `src/app/reservar/page.tsx` — nuevo — flujo de reserva por pasos con `searchParams`
- `src/app/reservar/actions.ts` — nuevo — server action `reservar`
- `tests/integration/booking-create.test.ts` — nuevo

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

**Done when**

- [ ] WHEN `createBooking` recibe una solicitud válida en efectivo para un slot libre THE SYSTEM SHALL insertar una fila en `bookings` con `status='confirmed'`, `payment_method='cash'`, `deposit_cop=0` y `price_cop` igual al precio vigente del servicio, y devolver un token cuyo SHA-256 hex es igual a `manage_token_hash`.
- [ ] WHEN 50 llamadas a `createBooking` para el mismo barbero y la misma hora corren en paralelo THE SYSTEM SHALL devolver `{ ok: true }` exactamente una vez y `{ ok: false, error: "slot_taken" }` 49 veces, dejando una sola reserva.
- [ ] WHEN la hora pedida no está en `getAvailability` para ese barbero y día (fuera de horario, dentro del aviso mínimo o más allá de `max_advance_days`) THE SYSTEM SHALL devolver `{ ok: false, error: "slot_unavailable" }` sin insertar nada.
- [ ] WHEN el celular no es un móvil colombiano de 10 dígitos que empieza por 3 o no se dio la autorización de datos THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }` sin insertar nada.
- [ ] WHEN un celular ya tiene 3 reservas futuras en `held` o `confirmed` THE SYSTEM SHALL devolver `{ ok: false, error: "too_many_bookings" }`.
- [ ] WHEN `barberId` es `"any"` y el primer barbero por `sort_order` está ocupado a esa hora THE SYSTEM SHALL reservar con el siguiente barbero libre.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                               # expect: exit 0
pnpm test:int tests/integration/booking-create.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                           # expect: exit 0
pnpm lint                                                # expect: exit 0
pnpm build                                               # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 7: booking-cash"
git tag step-07-booking-cash
# rollback target if the next step goes wrong: git reset --hard step-07-booking-cash
```

---

#### Step 8 — Página de la cita: cancelar y reprogramar por el cliente

*Task `E2-T2` · epic `02-reservas-y-pagos` · depende de: paso 7, paso 4*

**Do**

Archivos:
- `src/server/booking/manage.ts` — nuevo — `findByToken`, `cancelBooking`, `rescheduleBooking`
- `src/app/cita/[token]/page.tsx` — nuevo — detalle y acciones de la cita
- `src/app/cita/[token]/actions.ts` — nuevo — server actions `cancelar` y `reprogramar`
- `tests/integration/booking-manage.test.ts` — nuevo
- `tests/e2e/booking-cash.spec.ts` — nuevo — reserva en efectivo y cancelación de punta a punta

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

**Done when**

- [ ] WHEN el cliente cancela con un token válido al menos `self_service_cutoff_hours` antes de `starts_at` THE SYSTEM SHALL poner `status='cancelled'` y `cancelled_by='customer'` y el slot SHALL volver a aparecer en `getAvailability`.
- [ ] WHEN el cliente cancela o reprograma más tarde que `self_service_cutoff_hours` antes de `starts_at` THE SYSTEM SHALL devolver `{ ok: false, error: "cutoff_passed" }` sin cambiar nada.
- [ ] WHEN el cliente reprograma a un slot libre THE SYSTEM SHALL cancelar la original con `cancel_reason='reprogramada'`, crear una reserva `confirmed` cuyo `rescheduled_from_id` es el id original y devolver un token nuevo.
- [ ] WHEN el cliente reprograma a un slot ocupado THE SYSTEM SHALL devolver `{ ok: false, error: "slot_taken" }` y dejar la reserva original en `confirmed`.
- [ ] WHEN una reserva con `deposit_status='paid'` se cancela a tiempo THE SYSTEM SHALL dejarla en `refund_pending`, y WHEN se reprograma THE SYSTEM SHALL marcar la original `transferred` y la nueva `paid` con el mismo `deposit_cop`.
- [ ] WHEN `pnpm test:e2e tests/e2e/booking-cash.spec.ts` corre THE SYSTEM SHALL reservar en efectivo desde `/reservar` en un Pixel 7, llegar a `/cita/<token>` con «Cita confirmada», cancelarla ahí y mostrar «Cita cancelada», terminando con código 0.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                               # expect: exit 0
pnpm test:int tests/integration/booking-manage.test.ts   # expect: exit 0, 0 failed
pnpm test:e2e tests/e2e/booking-cash.spec.ts             # expect: exit 0, 0 failed
pnpm typecheck                                           # expect: exit 0
pnpm lint                                                # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 8: booking-manage"
git tag step-08-booking-manage
# rollback target if the next step goes wrong: git reset --hard step-08-booking-manage
```

---

#### Step 9 — Pago por transferencia con Wompi: apartado y enlace de pago

*Task `E2-T3` · epic `02-reservas-y-pagos` · depende de: paso 8*

**Do**

Archivos:
- `src/server/payments/wompi.ts` — nuevo — firma de integridad, depósito, URL de checkout
- `src/server/booking/create.ts` — edición — soporte de `method: "transfer"` y vencimiento de apartados
- `src/app/cita/[token]/page.tsx` — edición — estado «Pendiente de pago» con botón a Wompi
- `tests/integration/wompi-checkout.test.ts` — nuevo
- `tests/e2e/booking-transfer.spec.ts` — nuevo

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

**Done when**

- [ ] WHEN `integritySignature` recibe la referencia `sk8-438k4-xmxm392-sn2m2`, el monto en centavos `490000`, la moneda `COP` y el secreto `prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6` THE SYSTEM SHALL devolver `37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5` (ejemplo publicado por Wompi).
- [ ] WHEN `depositFor` recibe un precio y un porcentaje THE SYSTEM SHALL devolver el precio completo al 100 % y, en otro caso, el porcentaje redondeado hacia arriba al millar sin superar el precio (25000 al 30 % → 8000).
- [ ] WHEN `createBooking` recibe una solicitud por transferencia para un slot libre THE SYSTEM SHALL insertar una reserva `held` con `hold_expires_at = now + hold_minutes`, `deposit_status='pending'` y el `deposit_cop` calculado, y una fila en `payments` con `reference = 'BK-' || id de la reserva`, `status='PENDING'` y `amount_cop = deposit_cop`.
- [ ] WHEN corre un `createBooking` nuevo después de que venció el `hold_expires_at` de una reserva `held` en ese mismo slot THE SYSTEM SHALL marcar el apartado vencido como `cancelled` con `cancelled_by='system'` y reservar el slot.
- [ ] WHEN se arma `checkoutUrl` para una reserva apartada THE SYSTEM SHALL devolver `https://checkout.wompi.co/p/` con `public-key`, `currency=COP`, `amount-in-cents`, `reference`, `signature:integrity`, `redirect-url` hacia `/cita/<token>` y `expiration-time` igual a `hold_expires_at` en ISO-8601, con la firma calculada sobre referencia + monto + `COP` + expiración + secreto.
- [ ] WHEN `pnpm test:e2e tests/e2e/booking-transfer.spec.ts` corre THE SYSTEM SHALL mostrar «Pendiente de pago» en `/cita/<token>` y un enlace «Pagar con Wompi» cuyo `href` empieza por `https://checkout.wompi.co/p/`, terminando con código 0.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

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
git add -A && git commit -m "step 9: wompi-checkout"
git tag step-09-wompi-checkout
# rollback target if the next step goes wrong: git reset --hard step-09-wompi-checkout
```

---

#### Step 10 — Webhook de Wompi: confirmar o liberar la cita

*Task `E2-T4` · epic `02-reservas-y-pagos` · depende de: paso 9*

**Do**

Archivos:
- `src/server/payments/webhook.ts` — nuevo — `eventChecksum()` y `handleWompiEvent()`
- `src/app/api/webhooks/wompi/route.ts` — nuevo — `POST`
- `tests/integration/wompi-webhook.test.ts` — nuevo

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

**Done when**

- [ ] WHEN `eventChecksum` concatena `1234-1610641025-49201`, `APPROVED`, `4490000`, el timestamp `1530291411` y el secreto `prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z` THE SYSTEM SHALL devolver `5a18ec5e8fdb7df463e9f94774cba8f583ba21bd04a09ceff2ea68a4bc0aefbe`, y la comparación con `signature.checksum` SHALL ignorar mayúsculas y minúsculas.
- [ ] WHEN llega un POST cuyo checksum no coincide THE SYSTEM SHALL responder 400 sin cambiar ninguna fila.
- [ ] WHEN llega un evento `transaction.updated` válido con `status: "APPROVED"` y el monto correcto para una reserva `held` THE SYSTEM SHALL responder 200, dejar el pago `APPROVED`, la reserva `confirmed` con `deposit_status='paid'` e insertar una venta `kind='deposit'`, `method='wompi'`, `amount_cop = deposit_cop`.
- [ ] WHEN el mismo evento APPROVED llega dos veces THE SYSTEM SHALL responder 200 las dos veces y mantener exactamente una venta `deposit` para esa reserva.
- [ ] WHEN llega un evento válido con `status` `DECLINED`, `VOIDED` o `ERROR` para una reserva `held` THE SYSTEM SHALL dejarla `cancelled` con `cancelled_by='system'` y liberar el slot.
- [ ] WHEN llega un APPROVED después de vencido el apartado y el slot ya lo tomó otra persona THE SYSTEM SHALL dejar la reserva `cancelled`, poner `deposit_status='refund_pending'` y registrar igualmente la venta `deposit`.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                              # expect: exit 0
pnpm test:int tests/integration/wompi-webhook.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                          # expect: exit 0
pnpm lint                                               # expect: exit 0
pnpm build                                              # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 10: wompi-webhook"
git tag step-10-wompi-webhook
# rollback target if the next step goes wrong: git reset --hard step-10-wompi-webhook
```

---

#### Step 11 — Agenda del dueño: ver, reprogramar y cancelar

*Task `E2-T5` · epic `02-reservas-y-pagos` · depende de: paso 4, paso 8*

**Do**

Archivos:
- `src/server/admin/agenda.ts` — nuevo — `getAgenda(day)`
- `src/server/booking/manage.ts` — edición — modo dueño (`ownerReschedule`, `ownerCancel`)
- `src/app/admin/page.tsx` — edición — agenda del día
- `src/app/admin/actions.ts` — nuevo — server actions del panel
- `tests/integration/agenda.test.ts` — nuevo

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

**Done when**

- [ ] WHEN `getAgenda(day)` corre THE SYSTEM SHALL devolver las reservas `held`, `confirmed`, `completed` y `no_show` de ese día local de la tienda agrupadas por barbero activo en `sort_order`, cada grupo ordenado por `starts_at`, con nombre y celular del cliente y nombre del servicio.
- [ ] WHEN el dueño reprograma con `ownerReschedule` THE SYSTEM SHALL ignorar `self_service_cutoff_hours` y el horario laboral, permitir cambiar de barbero y seguir rechazando solapamientos con `{ ok: false, error: "slot_taken" }`.
- [ ] WHEN el dueño cancela una reserva con `deposit_status='paid'` eligiendo `refund` THE SYSTEM SHALL dejar `deposit_status='refund_pending'`, y eligiendo `forfeit` THE SYSTEM SHALL dejar `deposit_status='forfeited'`, en ambos casos con `cancelled_by='owner'`.
- [ ] WHEN la prueba lee `src/app/admin/actions.ts` THE SYSTEM SHALL encontrar `await requireOwner();` como primera sentencia de cada función async exportada.
- [ ] WHEN `pnpm build` corre THE SYSTEM SHALL terminar con código 0.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

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
git add -A && git commit -m "step 11: admin-agenda"
git tag step-11-admin-agenda
# rollback target if the next step goes wrong: git reset --hard step-11-admin-agenda
```

---

#### Step 12 — Cobros, no-shows, ventas sin cita y reembolsos

*Task `E2-T6` · epic `02-reservas-y-pagos` · depende de: paso 10, paso 11*

**Do**

Archivos:
- `src/server/admin/sales.ts` — nuevo — `completeBooking`, `markNoShow`, `recordWalkIn`, `markRefunded`, `listSales`
- `src/app/admin/actions.ts` — edición — acciones de cobro y ventas
- `src/app/admin/page.tsx` — edición — botones «Cobrar» y «No vino» en cada cita
- `src/app/admin/ventas/page.tsx` — nuevo — venta sin cita, reembolsos pendientes, ventas del día
- `tests/integration/sales.test.ts` — nuevo

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

**Done when**

- [ ] WHEN el dueño cobra una reserva en efectivo de 25000 eligiendo `nequi` THE SYSTEM SHALL dejarla `completed` e insertar una venta `kind='balance'`, `method='nequi'`, `amount_cop=25000`.
- [ ] WHEN el dueño cobra una reserva cuyo anticipo se pagó en línea THE SYSTEM SHALL registrar solo el saldo `price_cop - deposit_cop` (ninguna venta si es cero) y dejar `deposit_status='applied'`.
- [ ] WHEN el dueño marca una reserva como `no_show` THE SYSTEM SHALL dejar `status='no_show'` y, si `deposit_status='paid'`, cambiarlo a `forfeited` sin crear reembolso.
- [ ] WHEN se registra una venta sin cita de 15000 en `cash` THE SYSTEM SHALL insertar una venta `kind='walk_in'` sin `booking_id`.
- [ ] WHEN el dueño marca como devuelto un anticipo `refund_pending` THE SYSTEM SHALL dejar `deposit_status='refunded'` e insertar una venta `kind='refund'` con `amount_cop = -deposit_cop`, y una segunda llamada SHALL no cambiar nada.
- [ ] WHEN se cobra una reserva que ya está `completed` THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_state" }` sin insertar ventas.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

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
git add -A && git commit -m "step 12: admin-sales"
git tag step-12-admin-sales
# rollback target if the next step goes wrong: git reset --hard step-12-admin-sales
```

---

#### Step 13 — Gastos y categorías de gasto

*Task `E3-T1` · epic `03-negocio-y-lanzamiento` · depende de: paso 4*

**Do**

Archivos:
- `src/server/admin/expenses.ts` — nuevo
- `src/app/admin/gastos/page.tsx` — nuevo
- `src/app/admin/gastos/actions.ts` — nuevo
- `tests/integration/expenses.test.ts` — nuevo

1. `src/server/admin/expenses.ts`: `recordExpense({ categoryId, amountCop, spentOn, description, method })`
   (monto entero > 0, `spentOn` `YYYY-MM-DD`, categoría activa; si no, `invalid_input`),
   `listExpenses({ from, to })` (rango inclusivo sobre `spent_on`, más reciente primero, con nombre de
   categoría), `deleteExpense(id)` (los gastos sí se pueden borrar: son registros del dueño, no de
   clientes), `listCategories({ activeOnly })`, `createCategory(name)` (duplicado sin distinguir
   mayúsculas → `duplicate`), `setCategoryActive(id, active)`.
2. `src/app/admin/gastos/actions.ts` — `"use server"`, cada función exportada empieza con
   `await requireOwner();`: `registrarGasto`, `borrarGasto`, `crearCategoria`, `cambiarEstadoCategoria`.
3. `src/app/admin/gastos/page.tsx` — `export const dynamic = "force-dynamic";`, `<h1>` «Gastos»;
   formulario (categoría activa, monto con `parseCop`, fecha con hoy local por defecto, método, descripción);
   filtro por mes (`?mes=YYYY-MM`, por defecto el actual) con total del mes; lista con botón «Borrar»;
   sección «Categorías» para crear, desactivar o reactivar. Vacío: «No hay gastos en este mes.».
4. `tests/integration/expenses.test.ts` — criterios 1–5 contra la base y el criterio 6 leyendo el
   archivo de acciones como texto (mismo método que `tests/integration/agenda.test.ts`).

**Done when**

- [ ] WHEN se registra un gasto de 800000 en la categoría `Arriendo` con fecha `2026-10-01` THE SYSTEM SHALL insertar una fila en `expenses` con esos valores.
- [ ] WHEN el monto es 0, negativo o no entero, o la categoría está inactiva THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }` sin insertar nada.
- [ ] WHEN `listExpenses({ from: "2026-10-01", to: "2026-10-31" })` corre THE SYSTEM SHALL devolver solo gastos con `spent_on` dentro de ese rango inclusivo, del más reciente al más antiguo.
- [ ] WHEN se desactiva una categoría con gastos THE SYSTEM SHALL conservar sus gastos y excluirla de `listCategories({ activeOnly: true })`.
- [ ] WHEN se crea una categoría con un nombre que ya existe sin distinguir mayúsculas THE SYSTEM SHALL devolver `{ ok: false, error: "duplicate" }`.
- [ ] WHEN la prueba lee `src/app/admin/gastos/actions.ts` THE SYSTEM SHALL encontrar `await requireOwner();` como primera sentencia de cada función async exportada.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                         # expect: exit 0
pnpm test:int tests/integration/expenses.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                     # expect: exit 0
pnpm lint                                          # expect: exit 0
pnpm build                                         # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 13: expenses"
git tag step-13-expenses
# rollback target if the next step goes wrong: git reset --hard step-13-expenses
```

---

#### Step 14 — Resumen financiero del negocio

*Task `E3-T2` · epic `03-negocio-y-lanzamiento` · depende de: paso 12, paso 13*

**Do**

Archivos:
- `src/server/admin/metrics.ts` — nuevo — `getMetrics({ from, to })`
- `src/app/admin/resumen/page.tsx` — nuevo
- `src/components/charts/bar-list.tsx` — nuevo — barras horizontales en CSS, sin librería
- `tests/integration/metrics.test.ts` — nuevo

1. `src/server/admin/metrics.ts` — `getMetrics({ from, to }: { from: string; to: string })`, días
   locales inclusivos. Convierte los límites a instantes con `wallTimeToInstant(from, "00:00", tz)` y
   `wallTimeToInstant(addDays(to, 1), "00:00", tz)` y filtra `sales.occurred_at` y `bookings.starts_at`
   con `>= inicio` y `< fin`; `expenses.spent_on` con `between from and to`. Devuelve:
   `collectedCop` (suma de `sales.amount_cop`), `spentCop` (suma de `expenses.amount_cop`),
   `profitCop = collectedCop - spentCop`, `customersServed` (reservas `completed` + ventas `walk_in`),
   `noShows` (reservas `no_show`), `byMethod` (suma por `sales.method`, incluye métodos con total 0 si
   tuvieron movimientos), `expensesByCategory` (orden descendente), `byDay` (recaudado por día local) y
   `byBarber` (ventas con `barber_id`).
2. `src/components/charts/bar-list.tsx` — props `items: { label: string; value: number }[]` y
   `format: (n: number) => string`; cada fila muestra etiqueta, valor y una barra `bg-primary` de
   ancho `round(value / max * 100)%` (con `max` > 0), `role="list"`/`role="listitem"`, texto accesible
   con el valor. Vacío: «Sin datos en este periodo.».
3. `src/app/admin/resumen/page.tsx` — `export const dynamic = "force-dynamic";`, `<h1>` «Resumen»;
   atajos «Hoy», «Esta semana», «Este mes» y rango `?desde=&hasta=` (por defecto el mes actual);
   tarjetas «Clientes atendidos», «Recaudado», «Gastado», «Ganancia» (en `text-destructive` si es
   negativa), «No vinieron»; `BarList` para ingresos por método, gastos por categoría, recaudado por día
   y por barbero; enlace a «Reembolsos pendientes» en `/admin/ventas`.
4. `tests/integration/metrics.test.ts` — con `seedShop()` y este conjunto de datos exacto (zona
   `America/Bogota`):
   ventas: `deposit` 15000 `wompi` en `2026-10-03T15:00:00Z`; `balance` 25000 `cash` en
   `2026-10-03T16:00:00Z`; `walk_in` 15000 `nequi` en `2026-10-10T20:00:00Z`; `refund` -15000 `wompi`
   en `2026-10-12T14:00:00Z`; `walk_in` 10000 `cash` en `2026-11-01T02:00:00Z` (31 de octubre, 21:00 local).
   gastos: `Arriendo` 800000 el `2026-10-01`; `Productos` 120000 el `2026-10-15`; `Productos` 30000 el
   `2026-11-01`. reservas: dos `completed` el `2026-10-03` y una `no_show` el `2026-10-05`
   (insertadas por SQL con horas de 10:00 local). Categorías creadas en el test si no existen.

**Done when**

- [ ] WHEN `getMetrics({ from: "2026-10-01", to: "2026-10-31" })` corre sobre el conjunto de datos descrito en esta tarea THE SYSTEM SHALL devolver `collectedCop = 50000`, `spentCop = 920000` y `profitCop = -870000`.
- [ ] WHEN corre sobre ese mismo conjunto THE SYSTEM SHALL devolver `customersServed = 4` (2 reservas completadas + 2 ventas sin cita) y `noShows = 1`.
- [ ] WHEN corre sobre ese mismo conjunto THE SYSTEM SHALL devolver en `byMethod` los totales `cash` 35000, `nequi` 15000 y `wompi` 0.
- [ ] WHEN corre sobre ese mismo conjunto THE SYSTEM SHALL devolver `expensesByCategory` con `Arriendo` 800000 y `Productos` 120000, en ese orden descendente.
- [ ] WHEN una venta ocurre en `2026-11-01T02:00:00Z` THE SYSTEM SHALL contarla en octubre porque el límite de día es `America/Bogota` (21:00 del 31 de octubre).

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                        # expect: exit 0
pnpm test:int tests/integration/metrics.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                    # expect: exit 0
pnpm lint                                         # expect: exit 0
pnpm build                                        # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 14: dashboard"
git tag step-14-dashboard
# rollback target if the next step goes wrong: git reset --hard step-14-dashboard
```

---

#### Step 15 — Ajustes: servicios, precios, barberos, horarios y políticas

*Task `E3-T3` · epic `03-negocio-y-lanzamiento` · depende de: paso 7, paso 4*

**Do**

Archivos:
- `src/server/admin/settings.ts` — nuevo
- `src/app/admin/ajustes/page.tsx` — nuevo
- `src/app/admin/ajustes/actions.ts` — nuevo
- `tests/integration/settings.test.ts` — nuevo

1. `src/server/admin/settings.ts`:
   - `updateShopSettings({ name, whatsappPhone, address, depositPercent, selfServiceCutoffHours, holdMinutes })`
     — zod: `depositPercent` entero 10–100, `selfServiceCutoffHours` entero 3–5, `holdMinutes` 10–30,
     WhatsApp normalizado como en el paso 7; fuera de rango → `invalid_input` sin escribir.
   - `upsertService({ id?, name, durationMinutes, priceCop, bufferAfterMinutes, active, sortOrder })`
     (duración 10–240, precio entero > 0, búfer 0–60). Cambiar el precio no toca `bookings.price_cop`.
   - `upsertBarber({ id?, name, active, sortOrder })`.
   - `setWorkingHours({ barberId, weekday, ranges: { start, end }[] })` — reemplaza en una transacción
     todas las filas de ese barbero y día; lista vacía = no trabaja ese día.
   - `addTimeOff({ barberId | null, from: "YYYY-MM-DD", to: "YYYY-MM-DD", reason })` (días locales
     completos, convertidos con `wallTimeToInstant`) y `removeTimeOff(id)`.
2. `src/app/admin/ajustes/actions.ts` — `"use server"`, cada función exportada empieza con
   `await requireOwner();`.
3. `src/app/admin/ajustes/page.tsx` — `export const dynamic = "force-dynamic";`, `<h1>` «Ajustes»;
   secciones «Barbería» (nombre, WhatsApp, dirección, «Porcentaje de anticipo por transferencia»,
   «Horas mínimas para que el cliente cancele o cambie» con opciones 3, 4 y 5, «Minutos para pagar
   una reserva por transferencia»), «Servicios y precios», «Barberos», «Horario semanal» (por barbero,
   lunes a domingo, «Cerrado» o hora de inicio y fin) y «Días libres».
4. `tests/integration/settings.test.ts` — criterios 1–5 contra la base; criterio 6 leyendo el archivo
   de acciones como texto.

**Done when**

- [ ] WHEN el dueño cambia `Corte clásico` de 15000 a 18000 THE SYSTEM SHALL usar 18000 en las reservas nuevas mientras las existentes conservan `price_cop` 15000.
- [ ] WHEN `self_service_cutoff_hours` se guarda con 3, 4 o 5 THE SYSTEM SHALL aceptarlo, y WHEN se envía 2 o 6 THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }` y conservar el valor anterior.
- [ ] WHEN `deposit_percent` se envía fuera de 10–100 THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }`.
- [ ] WHEN el horario del martes de un barbero se reemplaza por 10:00–14:00 THE SYSTEM SHALL hacer que `getAvailability` de ese barbero un martes no devuelva ningún slot antes de las 10:00 ni que termine después de las 14:00 hora local.
- [ ] WHEN un barbero se desactiva THE SYSTEM SHALL excluirlo de `getAvailability` con `barberId: "any"` sin cambiar sus reservas existentes.
- [ ] WHEN la prueba lee `src/app/admin/ajustes/actions.ts` THE SYSTEM SHALL encontrar `await requireOwner();` como primera sentencia de cada función async exportada.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                         # expect: exit 0
pnpm test:int tests/integration/settings.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                     # expect: exit 0
pnpm lint                                          # expect: exit 0
pnpm build                                         # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 15: settings"
git tag step-15-settings
# rollback target if the next step goes wrong: git reset --hard step-15-settings
```

---

#### Step 16 — Portada, política de privacidad, app instalable y accesibilidad

*Task `E3-T4` · epic `03-negocio-y-lanzamiento` · depende de: paso 8, paso 5*

**Do**

Archivos:
- `src/app/page.tsx` — edición — portada definitiva
- `src/app/privacidad/page.tsx` — nuevo — política de tratamiento de datos (Ley 1581 de 2012)
- `src/app/manifest.ts` — nuevo — manifiesto PWA
- `src/app/icons/[size]/route.tsx` — nuevo — íconos PNG generados con `next/og`
- `tests/e2e/public.spec.ts` — nuevo — manifiesto, íconos, privacidad, axe, 320px

1. `src/app/page.tsx` — `export const dynamic = "force-dynamic";`; lee `shop_settings` y los
   servicios activos: `<h1>` con el nombre de la barbería, dirección, lista de servicios con duración
   y precio (`formatCop`), botón «Reservar cita» (`/reservar`), enlace «Escribir por WhatsApp»
   (`https://wa.me/<whatsapp_phone>`) y enlace al pie «Política de privacidad».
2. `src/app/privacidad/page.tsx` — `<h1>` «Política de tratamiento de datos»; responsable (nombre
   de la barbería, dirección y WhatsApp de `shop_settings`); datos que se recogen (nombre y celular);
   finalidad («gestionar tus citas y comunicarnos contigo sobre ellas»); la frase «De acuerdo con la
   Ley 1581 de 2012 puedes conocer, actualizar, rectificar y suprimir tus datos, y revocar la
   autorización» y cómo pedirlo (WhatsApp); conservación (mientras haya citas y hasta 24 meses después
   de la última). `export const dynamic = "force-dynamic";`.
3. `src/app/manifest.ts` — `MetadataRoute.Manifest`: `name` «Barbería — Reservas», `short_name`
   «Barbería», `start_url` `/`, `display` `standalone`, `lang` `es-CO`, `background_color` `#0e0e10`,
   `theme_color` `#0e0e10`, `icons` `[{ src: "/icons/192", sizes: "192x192", type: "image/png" }, { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" }]`.
   Next lo sirve en `/manifest.webmanifest` y agrega el `<link rel="manifest">`.
4. `src/app/icons/[size]/route.tsx` — `GET` que acepta solo `192` o `512` (otro → 404) y devuelve
   `new ImageResponse(...)` de `next/og` de ese tamaño: fondo `#0e0e10`, letra «B» centrada en `#d4a24c`.
5. `tests/e2e/public.spec.ts` — criterios 1–5; axe con `new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()`
   sobre `/`, `/reservar`, `/privacidad` y `/entrar`, esperando `violations` vacío; el de 320 px con
   `page.setViewportSize({ width: 320, height: 800 })` y
   `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

**Done when**

- [ ] WHEN se pide `/manifest.webmanifest` THE SYSTEM SHALL devolver JSON con `name`, `short_name`, `start_url` `/`, `display` `standalone` e íconos de tamaños `192x192` y `512x512` que apuntan a `/icons/192` y `/icons/512`.
- [ ] WHEN se piden `/icons/192` y `/icons/512` THE SYSTEM SHALL responder 200 con `content-type` `image/png`.
- [ ] WHEN se pide `/privacidad` THE SYSTEM SHALL mostrar el nombre de la barbería como responsable y el texto `Ley 1581 de 2012` junto con `conocer, actualizar, rectificar y suprimir`.
- [ ] WHEN axe-core analiza `/`, `/reservar`, `/privacidad` y `/entrar` en un Pixel 7 con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa` THE SYSTEM SHALL reportar 0 violaciones.
- [ ] WHEN `/` se carga a 320 px CSS de ancho THE SYSTEM SHALL tener `document.documentElement.scrollWidth` igual a `clientWidth`.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                 # expect: exit 0
pnpm test:e2e tests/e2e/public.spec.ts     # expect: exit 0, 0 failed
pnpm test:unit tests/unit/tokens.test.ts   # expect: exit 0 — no hex literals outside layout.tsx and icons/
pnpm typecheck                             # expect: exit 0
pnpm lint                                  # expect: exit 0
pnpm build                                 # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "step 16: public-pwa"
git tag step-16-public-pwa
# rollback target if the next step goes wrong: git reset --hard step-16-public-pwa
```

---

#### Step 17 — Cabeceras de seguridad, cron de apartados, CI y despliegue

*Task `E3-T5` · epic `03-negocio-y-lanzamiento` · depende de: paso 9, paso 14, paso 15, paso 16*

**Do**

Archivos:
- `next.config.ts` — edición — cabeceras de seguridad
- `src/app/api/cron/expire-holds/route.ts` — nuevo — `GET` protegido con `CRON_SECRET`
- `vercel.json` — nuevo — comando de build y cron diario
- `.github/workflows/ci.yml` — nuevo — CI con Postgres de servicio
- `tests/integration/deploy.test.ts` — nuevo

1. `next.config.ts` — agrega `async headers()` con una regla `source: "/:path*"` y estas cabeceras
   exactas: `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`;
   `X-Frame-Options: DENY`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
   `Strict-Transport-Security: max-age=63072000; includeSubDomains`;
   `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`.
2. `src/app/api/cron/expire-holds/route.ts` — `export const dynamic = "force-dynamic";`; `GET`: si
   ``request.headers.get("authorization") !== `Bearer ${cronEnv().CRON_SECRET}` `` → 401; si no, en una
   transacción llama `expireStaleHolds(tx, new Date())` (paso 9) y responde `Response.json({ expired: n })`.
3. `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "if [ \"$VERCEL_ENV\" = \"production\" ]; then pnpm db:migrate; fi && pnpm build",
  "crons": [{ "path": "/api/cron/expire-holds", "schedule": "0 8 * * *" }]
}
```

4. `.github/workflows/ci.yml` — en `push` y `pull_request`; un job `ubuntu-latest` con servicio
   `postgres:17.11-alpine` (usuario/clave/base `barberia`, puerto `54329:5432`, `--health-cmd pg_isready`);
   pasos: `actions/checkout@v7`; `pnpm/action-setup@v6` (sin `version`: la toma de `packageManager`);
   `actions/setup-node@v7` con `node-version-file: .nvmrc` y `cache: pnpm`; crear las bases
   `barberia_test` y `barberia_e2e` con `psql`; y en este orden `pnpm install --frozen-lockfile`,
   `pnpm lint`, `pnpm typecheck`, `pnpm db:migrate`, `pnpm test`,
   `pnpm exec playwright install --with-deps chromium`, `pnpm test:e2e`, `pnpm build`. `env` del job:
   todas las variables de `.env.example` con sus valores locales (los mismos del archivo, apuntando al
   puerto 54329) y `CI: "true"`.
5. `tests/integration/deploy.test.ts` — criterio 1 importando `next.config.ts` y llamando
   `headers()`; criterios 2–3 importando el `GET` del route con `new Request(...)` (con y sin
   `authorization`) sobre reservas `held` vencidas creadas por SQL; criterio 4 parseando `vercel.json`;
   criterio 5 leyendo `ci.yml` como texto y comprobando que cada comando aparece en ese orden (índices
   crecientes de `indexOf`).

**Done when**

- [ ] WHEN se llama `headers()` de `next.config.ts` THE SYSTEM SHALL devolver para `/:path*` `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y una `Content-Security-Policy` que contiene `frame-ancestors 'none'`, y la app compilada SHALL enviar `x-content-type-options` en `/`.
- [ ] WHEN se llama `GET /api/cron/expire-holds` sin `Authorization: Bearer <CRON_SECRET>` THE SYSTEM SHALL responder 401 sin cambiar nada.
- [ ] WHEN se llama con el token correcto THE SYSTEM SHALL cancelar cada reserva `held` cuyo `hold_expires_at` ya pasó (`cancelled_by='system'`) y responder 200 con `{ expired: <n> }`.
- [ ] WHEN se parsea `vercel.json` THE SYSTEM SHALL encontrar un cron con `path` `/api/cron/expire-holds` y un `buildCommand` que corre `pnpm db:migrate` solo cuando `VERCEL_ENV` es `production`.
- [ ] WHEN se lee `.github/workflows/ci.yml` THE SYSTEM SHALL encontrar, en este orden, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm db:migrate`, `pnpm test`, `pnpm test:e2e` y `pnpm build`.

**Verify** — desde la raíz del proyecto; cada línea sale 0 cuando el paso está bien.

```bash
pnpm db:up                                                 # expect: exit 0
pnpm test:int tests/integration/deploy.test.ts             # expect: exit 0, 0 failed
pnpm typecheck                                             # expect: exit 0
pnpm lint                                                  # expect: exit 0
pnpm build                                                 # expect: exit 0
bash scripts/serve-check.sh / 200 x-content-type-options   # expect: exit 0 — header present
bash scripts/serve-check.sh /api/cron/expire-holds 401     # expect: exit 0 — no bearer token → 401
```

**Checkpoint**

```bash
git add -A && git commit -m "step 17: hardening-deploy"
git tag step-17-hardening-deploy
# rollback target if the next step goes wrong: git reset --hard step-17-hardening-deploy
```


---

### 9.1 Parity and cutover

NOT APPLICABLE — greenfield build, no system is being replaced.

---

## 10. Environment Setup

### Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 24.21.0 (LTS «Krypton», fijado en `.nvmrc`) | `node -v` → `v24.21.0` |
| corepack (incluido en Node 24) | el de Node | `corepack --version` |
| pnpm | 11.27.1 (lo activa el Bootstrap con corepack) | `pnpm -v` → `11.27.1` |
| Docker con Compose v2 | cualquiera reciente | `docker compose version` |
| git, rsync, curl, bash | del sistema | `git --version && rsync --version && curl --version` |

### Accounts to create first

| Servicio | Para qué | URL | Primer paso que lo necesita |
|---|---|---|---|
| Wompi (comercio) | llaves `pub_test_…`, secreto de integridad y de eventos del ambiente de pruebas | https://comercios.wompi.co | ninguno para construir: los pasos 9–10 usan valores de prueba locales; se necesita para el lanzamiento |
| Supabase | Postgres de producción | https://supabase.com/dashboard | lanzamiento (§12) |
| Vercel | hosting y cron | https://vercel.com/new | lanzamiento (§12) |
| GitHub | repositorio y CI | https://github.com/new | paso 17 escribe el workflow; correrlo requiere el repo |

La construcción completa (pasos 1–17) corre en local sin ninguna cuenta: Postgres va en Docker y
Wompi se prueba con eventos firmados localmente. Las cuentas solo se necesitan para publicar.

### Environment variables

| Variable | Purpose | Where to get it | Required by step | Secret? |
|---|---|---|---|---|
| `DATABASE_URL` | conexión de la app, drizzle-kit y scripts | local: `postgres://barberia:barberia@localhost:54329/barberia` · prod: Supabase → Connect → *Transaction pooler* (puerto 6543) | 2 | sí |
| `TEST_DATABASE_URL` | base de las pruebas de integración | local: `postgres://barberia:barberia@localhost:54329/barberia_test` | 2 | no |
| `E2E_DATABASE_URL` | base de las pruebas e2e | local: `postgres://barberia:barberia@localhost:54329/barberia_e2e` | 4 | no |
| `MIGRATION_DATABASE_URL` | migraciones en producción | Supabase → Connect → *Session pooler* (puerto 5432, IPv4); vacío en local | 17 (solo producción) | sí |
| `APP_URL` | URL pública: origen de auth, enlaces, `redirect-url` de Wompi | local `http://localhost:3000`; prod `https://<dominio>` | 3 | no |
| `BETTER_AUTH_SECRET` | firma de sesiones (≥ 32 caracteres) | `openssl rand -base64 32` | 3 | sí |
| `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` | cuenta del dueño (semilla y `owner:create`; clave ≥ 10) | los elige el dueño | 3 | la clave sí |
| `WOMPI_PUBLIC_KEY` | llave pública del checkout | Wompi → Desarrolladores → Llaves | 9 | no |
| `WOMPI_INTEGRITY_SECRET` | firma de integridad del checkout | Wompi → Desarrolladores → Secretos para integración técnica | 9 | sí |
| `WOMPI_EVENTS_SECRET` | checksum de eventos | Wompi → Desarrolladores → Secretos para integración técnica | 10 | sí |
| `CRON_SECRET` | token que Vercel Cron envía al endpoint de limpieza (≥ 16) | `openssl rand -hex 24`; Vercel lo envía solo | 17 | sí |
| `VERCEL_ENV` | decide si el build migra (`production`) | la define Vercel automáticamente; no va en `.env` | 17 (solo en Vercel) | no |
| `CI` | Playwright y herramientas detectan CI | la define GitHub Actions; el workflow la fija en `"true"` | 17 (solo en CI) | no |

`.env.example` (§19.6) se commitea con todas las llaves y valores locales falsos; el Bootstrap lo
copia a `.env`, que está en `.gitignore`. No hay validación global al arrancar: cada grupo de
`src/lib/env.ts` (`dbEnv`, `authEnv`, `ownerEnv`, `wompiEnv`, `wompiEventsEnv`, `cronEnv`) se valida
la primera vez que su consumidor lo llama y falla con `MissingEnvError: <VAR>`. Por eso ningún paso
necesita variables de un paso posterior.

**Quién carga `.env` para cada herramienta** (el framework solo lo hace para la app):

| Herramienta | Mecanismo | Dónde |
|---|---|---|
| Next (`dev`, `build`, `start`) | carga automática de `.env` de Next | — |
| drizzle-kit (`db:generate`, `db:migrate`, `db:check`) | `process.loadEnvFile(".env")` al inicio de `drizzle.config.ts` | §19.6 |
| Vitest | `process.loadEnvFile(".env")` en `vitest.config.ts`; el proyecto `integration` fija `DATABASE_URL = TEST_DATABASE_URL` | §19.6 |
| Playwright y su servidor web | `process.loadEnvFile(".env")` en `playwright.config.ts`; el servidor recibe `DATABASE_URL = E2E_DATABASE_URL` y `APP_URL` | §19.6 |
| Scripts (`db:reset`, `db:seed`, `owner:create`) | `node --env-file-if-exists=.env …` en los scripts de `package.json` | §19.6 |
| CI | variables en el `env` del job | paso 17 |

### Files that must be committed

| File | Why it is committed | Ignore-file exception line |
|---|---|---|
| `.env.example` | plantilla de variables | `!.env.example` después de `.env.*` en `.gitignore` |
| `pnpm-lock.yaml` | instalaciones reproducibles (`--frozen-lockfile` en CI) | — no lo cubre ningún patrón |
| `drizzle/**` | migraciones versionadas | — no lo cubre ningún patrón |
| `biome.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `drizzle.config.ts`, `docker-compose.yml`, `docker/initdb/01-databases.sql`, `next.config.ts`, `postcss.config.mjs`, `pnpm-workspace.yaml`, `.nvmrc`, `package.json` | configuraciones de las que dependen los Verify | — no las cubre ningún patrón |
| `scripts/db-reset.ts`, `scripts/serve-check.sh`, `tests/setup/*.ts`, `src/types/css.d.ts` | infraestructura de pruebas | — no las cubre ningún patrón |
| `CLAUDE.md`, `AGENTS.md`, `.claude/**` | configuración del agente | — no las cubre ningún patrón |
| `blueprints/barberia-reservas/**` | el plano y el avance (`tasks.json`) | — no lo cubre ningún patrón |

El `.gitignore` llega con la copia de `workspace/` (primera línea del Bootstrap), antes del primer
commit, que es la última línea del Bootstrap.

### Bootstrap

Proyecto nuevo: crea la carpeta del proyecto, mueve este bundle a `blueprints/barberia-reservas/`
dentro de ella y corre desde la raíz del proyecto:

```bash
set -e
# Run from the project root, with this bundle at blueprints/barberia-reservas/.
# order matters: workspace copy (brings .gitignore, package.json, configs) → git init → identity →
#                .env → pnpm → install → format → browsers → Postgres → first commit
# Safe to run twice: every line below exits 0 when its work is already done.

rsync -a --ignore-existing blueprints/barberia-reservas/workspace/ ./   # never overwrites a file that exists (package.json, lockfile, edited configs); exits 0 either way
git rev-parse --git-dir >/dev/null 2>&1 || git init -b main            # idempotent: no-op inside an existing repo
git config user.email >/dev/null 2>&1 || git config user.email "builder@barberia.local"
git config user.name >/dev/null 2>&1 || git config user.name "Builder"
[ -f .env ] || cp .env.example .env                                     # local values; .env is gitignored

mkdir -p "$HOME/.local/bin"
corepack enable --install-directory "$HOME/.local/bin"                   # bare `corepack enable` fails with EACCES when Node was installed as root
export PATH="$HOME/.local/bin:$PATH"
corepack prepare pnpm@11.27.1 --activate

# pnpm 11 aborts on dependency build scripts it was not told to allow (ERR_PNPM_IGNORED_BUILDS).
# pnpm-workspace.yaml allows the known ones; if the resolver pulls in another, approve and retry once.
pnpm install || { pnpm approve-builds --all && pnpm install; }

pnpm exec biome format --write .                                        # align the copied files with biome.json; exits 0 when nothing changes
pnpm exec playwright install chromium                                   # browser for tests/e2e (CI adds --with-deps)
pnpm db:up                                                              # Postgres 17 on :54329, waits for the healthcheck

git rev-parse --verify HEAD >/dev/null 2>&1 || { git add -A && git commit -m "chore: bootstrap"; }   # first commit only once; .gitignore is already on disk
```

Después del Bootstrap el proyecto no tiene código de la app: el paso 1 lo escribe. El Bootstrap no
corre migraciones (no hay esquema hasta el paso 2).

---

## 11. Dependencies

Versiones verificadas en vivo el 2026-09-28 contra `https://registry.npmjs.org/-/package/<paquete>/dist-tags`
(y la ficha de la versión para los rangos *peer*), con `WebFetch` en esta sesión (la verificación del
*stack-researcher* se hizo en el hilo principal). Las fija `package.json` (§19.6) de forma exacta, sin
`^`; las instala `pnpm install` del Bootstrap.

### Runtime

| Package | Version | Source (registry URL or track file) | Checked | Installed by | Purpose |
|---|---|---|---|---|---|
| `next` | 16.3.6 | https://registry.npmjs.org/next (latest; `engines.node >=20.9.0`; peer react `^18.2.0 \|\| ^19.0.0`) | 2026-09-28 | §10 Bootstrap | framework |
| `react` | 19.3.0 | https://registry.npmjs.org/react (latest) | 2026-09-28 | §10 Bootstrap | UI |
| `react-dom` | 19.3.0 | https://registry.npmjs.org/react-dom (latest) | 2026-09-28 | §10 Bootstrap | UI |
| `drizzle-orm` | 0.45.3 | https://registry.npmjs.org/drizzle-orm (latest; 1.0 solo en `rc` — no usar) | 2026-09-28 | §10 Bootstrap | ORM |
| `postgres` | 3.4.9 | https://registry.npmjs.org/postgres (latest) | 2026-09-28 | §10 Bootstrap | driver Postgres |
| `better-auth` | 1.7.6 | https://registry.npmjs.org/better-auth (latest; exporta `./adapters/drizzle` y `./next-js`; peer `drizzle-orm ^0.45.2`, `next ^16`) | 2026-09-28 | §10 Bootstrap | autenticación del dueño |
| `zod` | 4.6.5 | https://registry.npmjs.org/zod (latest) | 2026-09-28 | §10 Bootstrap | validación |

### Development

| Package | Version | Source (registry URL or track file) | Checked | Installed by | Purpose |
|---|---|---|---|---|---|
| `typescript` | 6.0.3 | https://registry.npmjs.org/typescript/6.0.3 (latest es 7.0.2; Next exige `experimental.useTypeScriptCli` para TS 7 — track ts-node, Gotchas) | 2026-09-28 | §10 Bootstrap | compilador (`tsc --noEmit`) |
| `@types/node` | 24.19.0 | https://registry.npmjs.org/@types/node (tag `old-version`, línea 24 = runtime) | 2026-09-28 | §10 Bootstrap | tipos de Node 24 |
| `@types/react` | 19.3.0 | https://registry.npmjs.org/@types/react (latest) | 2026-09-28 | §10 Bootstrap | tipos |
| `@types/react-dom` | 19.3.0 | https://registry.npmjs.org/@types/react-dom (latest) | 2026-09-28 | §10 Bootstrap | tipos |
| `tailwindcss` | 4.3.3 | https://registry.npmjs.org/tailwindcss (latest) | 2026-09-28 | §10 Bootstrap | estilos |
| `@tailwindcss/postcss` | 4.3.3 | https://registry.npmjs.org/@tailwindcss/postcss (latest) | 2026-09-28 | §10 Bootstrap | integración con Next |
| `@biomejs/biome` | 2.5.14 | https://registry.npmjs.org/@biomejs/biome (latest) | 2026-09-28 | §10 Bootstrap | lint + formato |
| `vitest` | 4.1.11 | https://registry.npmjs.org/vitest (tag `V4`; `engines.node ^20 \|\| ^22 \|\| >=24`) — 5.0.2 es `latest` pero es una mayor nueva que el track no ha ejercitado | 2026-09-28 | §10 Bootstrap | unit + integración |
| `@playwright/test` | 1.63.0 | https://registry.npmjs.org/@playwright/test (latest) | 2026-09-28 | §10 Bootstrap | e2e |
| `@axe-core/playwright` | 4.13.0 | https://registry.npmjs.org/@axe-core/playwright (latest) | 2026-09-28 | §10 Bootstrap | accesibilidad en e2e |
| `drizzle-kit` | 0.31.11 | https://registry.npmjs.org/drizzle-kit (latest) | 2026-09-28 | §10 Bootstrap | migraciones |

### Toolchain, images and CI actions (fijados en archivos emitidos)

| Item | Version | Source | Checked | Pinned in | Purpose |
|---|---|---|---|---|---|
| Node.js | 24.21.0 | https://nodejs.org/en/about/previous-releases («Latest LTS», Krypton) | 2026-09-28 | `.nvmrc`, `package.json#engines` | runtime |
| pnpm | 11.27.1 | https://registry.npmjs.org/pnpm (tag `latest-11`; `latest` ya es 12.6.0, mayor no ejercitada por el track) | 2026-09-28 | `package.json#packageManager`, Bootstrap | gestor de paquetes |
| `postgres` (imagen Docker) | `17.11-alpine` | https://hub.docker.com/v2/repositories/library/postgres/tags | 2026-09-28 | `docker-compose.yml`, `ci.yml` | base local y de CI |
| `actions/checkout` | `v7` | https://api.github.com/repos/actions/checkout/releases/latest (v7.0.1) | 2026-09-28 | `ci.yml` (paso 17) | CI |
| `actions/setup-node` | `v7` | https://github.com/actions/setup-node/releases (v7.0.0) | 2026-09-28 | `ci.yml` (paso 17) | CI |
| `pnpm/action-setup` | `v6` | https://github.com/pnpm/action-setup/releases (v6.1.0) | 2026-09-28 | `ci.yml` (paso 17) | CI |
| Wompi Web Checkout / Eventos | servicio (sin versión) | https://docs.wompi.co/docs/colombia/widget-checkout-web/ · https://docs.wompi.co/docs/colombia/eventos/ | 2026-09-28 | `src/server/payments/*` | pagos |

Dependencias de dependencias que no se fijan aquí (quedan en el lockfile): `vite` (la trae vitest),
`esbuild` (drizzle-kit), `sharp` (Next), `@better-auth/drizzle-adapter` (la trae better-auth).

### Deliberately not used

| Rejected | Instead | Why |
|---|---|---|
| `shadcn` / Radix UI | `src/components/ui/*` propios | su `init` es interactivo y agrega dependencias sin versión verificada; tres primitivas cubren v1 |
| `date-fns` / `@date-fns/tz` / `luxon` | `src/lib/time.ts` con `Intl` | la única necesidad es convertir hora local ↔ instante; `Intl` viene en Node y en el navegador |
| `recharts` / librerías de gráficos | `BarList` en CSS | barras horizontales simples, sin JavaScript de cliente |
| `react-hook-form` | formularios nativos + server actions + zod | sin estado de cliente que manejar |
| `server-only` | regla de límites + `session.ts` como única excepción | su condición de exportación rompe Vitest y los scripts de Node sin configuración extra |
| `dotenv` | `process.loadEnvFile` / `--env-file-if-exists` de Node 24 | Node ya lo trae |
| Supabase JS / Supabase Auth | Drizzle + better-auth | Supabase se usa solo como Postgres administrado |
| `stripe` | Wompi | Stripe no opera como adquirente local en Colombia para Nequi/PSE |
| `middleware.ts` / `proxy.ts` | `requireOwner()` en layout y acciones | un matcher mal hecho salta la verificación en silencio |

---

## 12. Deployment Strategy

### Hosting

Vercel (plan Hobby para empezar; Pro si el negocio lo usa comercialmente según los términos de
Vercel), región `iad1` por defecto o `gru1` (São Paulo, la más cercana a Colombia) configurada en el
proyecto. Build: `vercel.json#buildCommand` (migra solo en producción, luego `pnpm build`); salida y
runtime por defecto de Next (Node.js). Base: Supabase, región `sa-east-1` (São Paulo), plan Free.

### Environments

| Environment | Branch | URL | Database | Third-party mode |
|---|---|---|---|---|
| Local | — | http://localhost:3000 | Docker `barberia` (+ `_test`, `_e2e`) | Wompi con valores falsos locales |
| Preview | cualquier PR | automática de Vercel | la de producción **no**: las variables de Preview apuntan a un proyecto Supabase de pruebas (o se dejan sin base y el preview solo sirve para revisar la portada) | Wompi sandbox (`pub_test_…`) |
| Production | `main` | `https://<dominio>` | Supabase producción | Wompi producción (`pub_prod_…`) |

### CI/CD

GitHub Actions (`.github/workflows/ci.yml`, paso 17) en cada push y PR: `pnpm install
--frozen-lockfile` → `pnpm lint` → `pnpm typecheck` → `pnpm db:migrate` → `pnpm test` → instalar
Chromium → `pnpm test:e2e` → `pnpm build`, con Postgres como servicio. Es el mismo conjunto que §20.1.
Vercel despliega por su integración con Git; se configura *Deployment Protection → Required checks*
para que no promueva un commit con CI en rojo.

### Release and rollback

Merge a `main` → Vercel construye; en producción el build corre `pnpm db:migrate` contra
`MIGRATION_DATABASE_URL` antes de `pnpm build`, así el código nuevo nunca corre sobre un esquema viejo.
Rollback: *Instant Rollback* de Vercel al despliegue anterior (segundos). Como las migraciones son
*expand then contract*, el código anterior sigue funcionando con el esquema nuevo; una migración nunca
se revierte automáticamente.

### Domain, DNS, TLS

Dominio propio (p. ej. `reservas.<barberia>.com`): registro `CNAME` a `cname.vercel-dns.com`; TLS
automático de Vercel. Actualizar `APP_URL` al dominio y la URL de eventos en Wompi
(`https://<dominio>/api/webhooks/wompi`).

---

## 13. Testing Strategy

| Layer | Framework | What it covers | Where | Runs |
|---|---|---|---|---|
| Unit | Vitest (proyecto `unit`) | motor de horarios y zonas, env, tokens y formato de dinero | `tests/unit/` | cada commit |
| Integration | Vitest (proyecto `integration`) contra Postgres real | restricción de solapamiento, reservas concurrentes, autogestión, webhook, cobros, gastos, métricas, ajustes, cron | `tests/integration/` | cada commit |
| E2E | Playwright (Pixel 7) + axe-core | ingreso, reserva en efectivo y cancelación, reserva por transferencia hasta el enlace de Wompi, PWA, privacidad, accesibilidad | `tests/e2e/` | cada commit en CI |

### Critical flows to cover E2E

1. Reservar en efectivo desde el celular y cancelar con el enlace (paso 8) — es lo que usan los clientes.
2. Reservar por transferencia y llegar al enlace de pago de Wompi (paso 9) — dinero.
3. Ingreso del dueño y protección de `/admin` (paso 4) — confianza.

### Test data

Integración: `tests/setup/global-setup.ts` borra y re-migra `barberia_test` antes de cada corrida;
cada prueba empieza con `truncateAll()` + `seedShop()` (`tests/setup/`) y pasa un `now` fijo. E2E:
el comando del servidor web de Playwright borra, migra y siembra `barberia_e2e` en cada corrida. Las
tres bases las crea `docker/initdb/01-databases.sql` y las sirve `docker-compose.yml` (§19.6); en CI,
el workflow crea las dos adicionales con `psql`. Las pruebas de integración corren una a la vez
(`fileParallelism: false`).

### What is deliberately not tested

- El pago real en Wompi (sandbox) — requiere su red; se hace una vez en la lista de lanzamiento (§20.1).
- La instalación de la PWA en un teléfono físico — se valida el manifiesto y los íconos.
- El renderizado de componentes aislados — lo cubren las pruebas e2e y axe sobre páginas reales.

---

## 14. Security & Secrets

| Concern | Control | Implemented in |
|---|---|---|
| Secret storage | variables de Vercel (producción/preview); `.env` local ignorado por git | §10, `.gitignore` |
| Secret rotation | rotar `BETTER_AUTH_SECRET` cierra todas las sesiones; secretos de Wompi se rotan en su panel y se actualizan en Vercel; revisar cada 12 meses o ante cualquier fuga | lista de lanzamiento |
| Input validation | zod en cada server action, route handler y en el entorno | `src/app/**/actions.ts`, `src/server/**`, `src/lib/env.ts` |
| Output encoding / XSS | JSX escapa por defecto; no se usa `dangerouslySetInnerHTML` | regla `ui.md` |
| SQL injection | consultas de Drizzle y plantillas etiquetadas de `postgres`; `sql.unsafe` solo en `scripts/db-reset.ts` y `tests/setup/db.ts` con nombres de tabla leídos del catálogo | `src/server/**` |
| AuthN / AuthZ | ver §8 — `requireOwner()` en layout y en cada acción; tokens de cita con hash | `src/server/session.ts`, `manage.ts` |
| CSRF | better-auth valida `Origin` contra `APP_URL`; server actions de Next comparan `Origin`/`Host` | `src/server/auth.ts` |
| Rate limiting / abuse | límite de intentos de better-auth; máximo 3 citas futuras por celular; `hold_minutes` limita apartados | `src/server/auth.ts`, `create.ts` |
| Webhook verification | checksum SHA-256 de Wompi antes de parsear como confiable; idempotencia por estado final y índice único | `src/server/payments/webhook.ts` |
| Dependency audit | `pnpm audit --prod` mensual; Dependabot de GitHub activado; lo corrige el dueño técnico | GitHub |
| Security headers | `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `X-Frame-Options: DENY`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `Strict-Transport-Security: max-age=63072000; includeSubDomains`; `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` | `next.config.ts` (paso 17) |
| PII handling | se guarda nombre y celular del cliente con su autorización (`consent_at`); se conservan mientras haya citas y hasta 24 meses después de la última; supresión a pedido del titular por WhatsApp, hecha por el dueño | `/privacidad`, lista de lanzamiento |
| Logging hygiene | no se registran tokens de cita, secretos, cuerpos de webhook completos ni celulares; los errores se registran con código y id de reserva | `src/server/**` |
| Datos de Supabase expuestos | RLS activado en todas las tablas de `public` sin políticas: la Data API no devuelve nada | migración `constraints_rls` (paso 2) |

**Hard rules**
- No secret is ever committed, printed in a log, sent to an error tracker, or embedded in a
  client bundle. Anything reaching the browser is public — treat it that way. (`WOMPI_PUBLIC_KEY` es
  pública por diseño y viaja en la URL de checkout.)
- All server-side authorization checks run before the work, not after.
- Third-party webhooks are verified by signature before their body is parsed as trusted.

**Régimen regulado:** datos personales en Colombia — **Ley 1581 de 2012** y Decreto 1377 de 2013
(compilado en el Decreto 1074 de 2015). Obligaciones para esta construcción: autorización previa y
expresa (casilla obligatoria y `consent_at`), política de tratamiento publicada (`/privacidad`),
finalidad limitada a gestionar citas, y canal para que el titular conozca, actualice, rectifique y
suprima sus datos. Los pagos con tarjeta los procesa Wompi en su checkout: la app nunca ve datos de
tarjeta (fuera de alcance PCI). No hay datos de salud ni de menores.

---

## 15. Accessibility

**Target: WCAG 2.2 Level AA.**

### Baseline requirements
| Requirement | Rule |
|---|---|
| Semantic HTML | Landmarks (`header`/`nav`/`main`/`footer`), one `h1` per page, headings in order, lists for lists |
| Keyboard | Every interactive element reachable and operable by keyboard; logical tab order; no traps; skip-to-content link (en `layout.tsx`, paso 1) |
| Focus visible | `focus-visible:outline-2 outline-primary outline-offset-2` en `Button` y enlaces; ≥ 3:1 |
| Contrast | Text 4.5:1, large text and UI boundaries 3:1 — the §7 palette already satisfies this |
| Forms | Every input has a programmatic label (`Field`); errors are text in `role="alert"` with `aria-describedby` |
| Images | El ícono de la PWA no se muestra en páginas; no hay imágenes con contenido en v1 |
| Motion | Everything animated respects `prefers-reduced-motion: reduce` (solo `motion-safe:`) |
| Zoom / reflow | Usable at 200% zoom and at 320 CSS px wide without horizontal scrolling (probado en el paso 16) |
| Live regions | Mensajes de error y confirmación en `role="alert"` / `role="status"` |

### WCAG 2.2 additions — the ones most often missed
| SC | Requirement |
|---|---|
| 2.4.11 Focus Not Obscured (Min) | No hay barras fijas que tapen el foco |
| 2.5.7 Dragging Movements | No hay interacciones de arrastre; la agenda usa botones y formularios |
| 2.5.8 Target Size (Min) | Objetivos de al menos 44×44 px (`min-h-11`) |
| 3.3.7 Redundant Entry | La reserva conserva lo elegido en la URL; reprogramar no vuelve a pedir nombre ni celular |
| 3.3.8 Accessible Authentication (Min) | `/entrar` permite gestores de contraseñas y pegar; sin CAPTCHA |

### Verification
```bash
pnpm test:e2e tests/e2e/public.spec.ts   # expect: exit 0 — axe reports 0 violations on /, /reservar, /privacidad, /entrar
```
Automated checks catch roughly a third of real issues. Before launch: keyboard-only pass over
reservar → cita → cancelar, one screen-reader pass (TalkBack en Android) over the booking flow, and
a 200% zoom pass at 320px.

---

## 16. Observability & Cost

### Instrumentation
| Signal | Tool | What it captures | Who looks at it |
|---|---|---|---|
| Errors | Vercel Runtime Logs (nivel `error`) | excepciones de server actions y route handlers, con id de reserva, sin datos personales | el dueño técnico, semanal |
| Logs | Vercel Runtime Logs | `console.info`/`console.error` con una línea JSON por evento (`{ evt, bookingId, code }`) | idem |
| Metrics | `/admin/resumen` | clientes, recaudado, gastado, no-shows | el dueño, diario |
| Uptime | Vercel Cron no aplica; monitor gratuito (p. ej. UptimeRobot) sobre `/api/health` cada 5 min | disponibilidad y base | el dueño técnico |

### The metrics that matter for this project

| Metric | Target | Alert at |
|---|---|---|
| `/api/health` responde 200 | 99.5 % mensual | 2 fallas seguidas del monitor |
| Webhooks de Wompi con 400 | 0 | cualquiera (firma mal configurada) |
| Reembolsos pendientes | 0 al cierre de semana | > 0 durante 3 días (visible en `/admin/ventas`) |
| No-shows | < 10 % | > 15 % en el mes (resumen) |

### Health check

`GET /api/health` (paso 2) ejecuta `select 1` contra la base: 200 `{ ok: true, db: "up" }` o 503
`{ ok: false, db: "down" }`. Lo consulta el monitor externo.

### Cost model
| Service | Free tier | Cost at v1 scale (≈ 400 citas/mes) | Cost at 10× | Cliff to watch |
|---|---|---|---|---|
| Vercel | Hobby gratis (uso no comercial según términos) | US$0 (Hobby) o US$20/mes (Pro) | US$20/mes | uso comercial exige Pro |
| Supabase | Free: 500 MB, pausa tras 7 días sin actividad | US$0 | US$25/mes (Pro) | pausa por inactividad y límite de 500 MB |
| Wompi | sin mensualidad | comisión por transacción según tarifa vigente de Wompi (consultar en su sitio) | proporcional | cada pago en línea |
| Dominio | — | ≈ US$12/año | igual | — |

**Estimated monthly cost at launch: US$0–20 más las comisiones de Wompi.** El rubro mayor son las
comisiones por pago en línea; la palanca más barata es que el efectivo siga disponible. Supabase Free
pausa proyectos inactivos una semana; el monitor de salud cada 5 minutos lo mantiene activo.

---

## 17. Model Routing

NOT APPLICABLE — this project does not call an LLM at runtime.

---

## 18. Skills to Use During Build

| Skill | Build steps | Why | Install |
|---|---|---|---|
| frontend-design | 7, 8, 11, 14, 16 | pantallas de reserva, agenda, resumen y portada con criterio visual | `/plugin marketplace add anthropics/skills` then `/plugin install example-skills@anthropic-agent-skills` |
| ui-ux-pro-max | 5, 16 | refinar primitivas y portada dentro de los tokens de §7 | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` then `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` |
| playwright-cli | 4, 8, 9, 16 | escribir y depurar las pruebas e2e | `npm install -g @playwright/cli@latest` then `playwright-cli install --skills` |
| /claude-seo-ai:audit | después del 16 | SEO y visibilidad en motores de respuesta de la portada | `/plugin marketplace add Hainrixz/claude-seo-ai` then `/plugin install claude-seo-ai@claude-seo-ai` then `/reload-plugins` |
| /humanizalo | 16 | que el texto de la portada y la política suene natural en español | `git clone https://github.com/Hainrixz/humanizalo.git ~/.claude/skills/humanizalo` |

`frontend-design`, `ui-ux-pro-max` y `playwright-cli` se activan solos (sin `/`). Ninguna es
obligatoria: si falta, el constructor sigue con este blueprint y lo anota en una línea.

---

## 19. Agent Workspace

Modo bundle: todo lo de esta sección son **archivos reales** bajo
`blueprints/barberia-reservas/workspace/`, que refleja exactamente la raíz del proyecto. El constructor
lo copia con la primera línea del Bootstrap (§10):

```bash
rsync -a --ignore-existing blueprints/barberia-reservas/workspace/ ./   # skips files that exist; exits 0 either way
```

Nunca se sobrescriben con una segunda corrida: `package.json`, `pnpm-lock.yaml` (lo crea la
instalación) ni ninguna configuración que un paso haya editado (`next.config.ts` en el paso 17). Se
eligió `rsync --ignore-existing` porque `cp -Rn` sale 1 en macOS cuando omite un archivo y 0 en GNU.

```
workspace/
├── CLAUDE.md                          # §19.1
├── AGENTS.md                          # §19.2
├── .claude/settings.json              # §19.3
├── .claude/skills/add-migration/SKILL.md, add-admin-feature/SKILL.md   # §19.4
├── .claude/rules/database.md, booking.md, payments.md, ui.md, tests.md # §19.5
└── (configuración de §19.6)           # package.json, tsconfig.json, biome.json, …
```

No se emite `.claude/commands/`.

### 19.1 `CLAUDE.md`

Archivo `workspace/CLAUDE.md` (≈ 150 líneas). Empieza por la tabla de comandos; luego stack,
arquitectura (recorrido de una petición y tabla de límites de importación), reglas de código, tokens
de diseño con valores literales, tabla de variables con el paso desde el que son obligatorias,
punteros a `.claude/rules/` y seis reglas no negociables.

### 19.2 `AGENTS.md`

Archivo `workspace/AGENTS.md`: descripción, comandos, las seis reglas no negociables y el puntero a
`CLAUDE.md` como fuente de verdad.

### 19.3 `.claude/settings.json`

Archivo `workspace/.claude/settings.json`. `allow` cubre cada comando que aparece en un Verify de §9,
en el Bootstrap y en §20.1: `pnpm install`, `pnpm approve-builds`, `pnpm format`, `pnpm lint`,
`pnpm typecheck`, `pnpm build`, `pnpm dev`, `pnpm test`, `pnpm test:unit`, `pnpm test:int`,
`pnpm test:e2e`, `pnpm db:up`, `pnpm db:down`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:check`,
`pnpm db:reset`, `pnpm db:seed`, `pnpm owner:create`, `pnpm exec drizzle-kit generate`,
`pnpm exec biome format`, `pnpm exec playwright install`, `bash scripts/serve-check.sh`,
`docker compose ps|logs`, `rsync -a --ignore-existing`, `ls`, `test -f` y los comandos de git de
lectura, commit y etiqueta. `deny`: leer `.env`, `git push`, `git reset --hard`,
`docker compose down -v`, `docker volume rm`.

### 19.4 Project skills — `.claude/skills/<name>/SKILL.md`

| Skill | Triggers on | What it automates |
|---|---|---|
| `add-migration` | «agregar columna», «nueva tabla», «cambiar el esquema», RLS, restricciones | editar `schema.ts` → `db:generate` → `--custom` si hace falta SQL → `db:migrate` → prueba de integración |
| `add-admin-feature` | «nueva pantalla del panel», «que el dueño pueda…», «nuevo reporte» | función de negocio + prueba → acción con `requireOwner()` → página dinámica → enlace en la navegación |

### 19.5 `.claude/rules/*.md`

| File | `paths` globs | Covers |
|---|---|---|
| `.claude/rules/database.md` | `src/server/db/**`, `drizzle/**`, `scripts/**` | tipos de columnas, dinero, RLS, migraciones, scripts con Node |
| `.claude/rules/booking.md` | `src/server/booking/**`, `src/lib/time.ts`, `src/app/reservar/**`, `src/app/cita/**` | motor puro, restricción, zonas, teléfonos, plazo, reprogramación, tokens |
| `.claude/rules/payments.md` | `src/server/payments/**`, `src/app/api/webhooks/**`, `src/server/admin/sales.ts` | checkout, firma de integridad, checksum de eventos, idempotencia, libro de ventas |
| `.claude/rules/ui.md` | `src/app/**/*.tsx`, `src/components/**` | tokens, primitivas, accesibilidad, textos, estados vacíos |
| `.claude/rules/tests.md` | `tests/**` | proyectos de Vitest, bases de prueba, `now` fijo, sin cadenas de `Intl` |

### 19.6 Verify-critical config and local infrastructure

Todos son archivos reales bajo `workspace/`, en la misma ruta que tendrán en el proyecto.

| File | Path in the project | Which `Verify` commands need it | Resolution/env handling it carries | Bundle-path exclusion |
|---|---|---|---|---|
| `package.json` | `package.json` | todos (`pnpm <script>`) | scripts de Node con `--env-file-if-exists=.env`; `"type": "module"`; versiones exactas | n/a — this tool never walks the tree |
| `pnpm-workspace.yaml` | `pnpm-workspace.yaml` | Bootstrap (`pnpm install`) | `allowBuilds` para `esbuild`, `sharp`, `@biomejs/biome`, `@tailwindcss/oxide`; sin `packages:` (no hay globs de workspace que puedan tomar `blueprints/`) | n/a — no workspace globs are declared |
| `.nvmrc` | `.nvmrc` | CI (`setup-node`) | — | n/a — this tool never walks the tree |
| `tsconfig.json` | `tsconfig.json` | `pnpm typecheck`, `pnpm build` | alias `@/*` → `./src/*`; `allowImportingTsExtensions`; `verbatimModuleSyntax` | `"exclude": ["node_modules", "blueprints", ".next/dev"]` |
| `src/types/css.d.ts` | `src/types/css.d.ts` | `pnpm typecheck` | `declare module "*.css"` para importar `globals.css` sin `next-env.d.ts` | n/a — declaration file |
| `next.config.ts` | `next.config.ts` | `pnpm build`, `serve-check.sh` | — (el paso 17 agrega cabeceras) | n/a — Next compiles only what `src/app` imports |
| `postcss.config.mjs` | `postcss.config.mjs` | `pnpm build` | plugin `@tailwindcss/postcss` | n/a — Tailwind scans for class names only; matches inside `blueprints/` add unused utilities and cannot fail a gate |
| `biome.json` | `biome.json` | `pnpm lint`, Bootstrap (`biome format`) | `css.parser.tailwindDirectives: true`; `vcs.useIgnoreFile`; ignora `tsconfig.json` porque `next build` lo reescribe con su propio formato | `"!!**/blueprints"` en `files.includes` (excluye y no indexa la carpeta, así el `biome.json` del bundle no es una segunda raíz) |
| `vitest.config.ts` | `vitest.config.ts` | `pnpm test:unit`, `pnpm test:int`, `pnpm test` | carga `.env` con `process.loadEnvFile`; alias `@` → `src`; proyecto `integration` con `env.DATABASE_URL = TEST_DATABASE_URL` y `globalSetup` | `exclude: ["**/node_modules/**", "blueprints/**", ".next/**", "tests/e2e/**"]` |
| `playwright.config.ts` | `playwright.config.ts` | `pnpm test:e2e` | carga `.env`; servidor web con `DATABASE_URL = E2E_DATABASE_URL`, `APP_URL` en :3100; reset + semilla antes de `next dev` | n/a — `testDir: "tests/e2e"` never reaches `blueprints/` |
| `drizzle.config.ts` | `drizzle.config.ts` | `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:check` | `process.loadEnvFile(".env")`; `MIGRATION_DATABASE_URL \|\| DATABASE_URL` | n/a — reads only `./src/server/db/schema.ts` and writes `./drizzle` |
| `docker-compose.yml` | `docker-compose.yml` | `pnpm db:up` (todos los pasos con base) | imagen `postgres:17.11-alpine`, puerto 54329, volumen con nombre, healthcheck que espera a que exista `barberia_e2e` | n/a — this tool never walks the tree |
| `docker/initdb/01-databases.sql` | `docker/initdb/01-databases.sql` | `pnpm db:up` | crea `barberia_test` y `barberia_e2e` | n/a — mounted file |
| `scripts/db-reset.ts` | `scripts/db-reset.ts` | integración (global setup) y e2e (servidor web) | imports de paquetes sin alias; lee `DATABASE_URL` (cargado por `--env-file-if-exists`) | n/a — resets one database, never walks the tree |
| `scripts/serve-check.sh` | `scripts/serve-check.sh` | pasos 1, 2, 17 y §20.1 | arranca `node node_modules/next/dist/bin/next start -p 3100` (Next carga `.env`) | n/a — this tool never walks the tree |
| `tests/setup/global-setup.ts` | `tests/setup/global-setup.ts` | `pnpm test:int` | no hace nada hasta que existe `drizzle/meta/_journal.json` (paso 2) | n/a — imported by Vitest |
| `tests/setup/db.ts` | `tests/setup/db.ts` | pruebas de integración | usa `DATABASE_URL` del proyecto `integration` | n/a — imported by tests |
| `tests/setup/fixtures.ts` | `tests/setup/fixtures.ts` | pruebas de integración | SQL crudo con los nombres de columna de §4 (sin importar el esquema, para compilar desde el paso 1) | n/a — imported by tests |
| `.gitignore` | `.gitignore` | Bootstrap (primer commit), `biome` (`useIgnoreFile`) | `.env` y `.env.*` ignorados, `!.env.example` | n/a — `blueprints/` is committed on purpose |
| `.env.example` | `.env.example` | Bootstrap (`cp` a `.env`) | todas las variables de §10 con valores locales | n/a |

Cada ruta que aparece en un Verify de §9 o en §20.1 la escribe un paso (lista de archivos del paso /
`files` de `tasks.json`) o está en esta tabla.

#### Resolution convention matrix

**The convention, stated once:** fuera de `src/app/**` y `src/components/**`, los módulos del
proyecto se importan con **rutas relativas que terminan en `.ts`** (`../lib/env.ts`); dentro de
`src/app/**` y `src/components/**` se usa el alias **`@/`** (`@/server/auth`). Los tipos siempre con
`import type`. Nada que un script de Node cargue puede usar `@/`.

| Context | Command that exercises it | Convention as it appears there | Config + literal setting that makes it work |
|---|---|---|---|
| Application source | `pnpm build` | `@/server/...` en app/components; `./x.ts` dentro de server/lib | `tsconfig.json` — `"paths": { "@/*": ["./src/*"] }`, `"allowImportingTsExtensions": true`, `"moduleResolution": "bundler"`; Turbopack lee los mismos `paths` |
| Test files | `pnpm test:unit …`, `pnpm test:int …` | `../../src/server/booking/create.ts` | `vitest.config.ts` — `resolve.alias: { "@": src }` (para módulos de app importados por pruebas); Vite resuelve `.ts` explícito |
| Standalone scripts | `pnpm db:seed` → `node --env-file-if-exists=.env scripts/seed.ts` | `../src/server/auth.ts` (relativo `.ts`, sin alias) | Node 24 ejecuta `.ts` quitando tipos y resuelve rutas literalmente; `tsconfig.json` — `"allowImportingTsExtensions": true` para que `tsc` acepte el mismo archivo; `"verbatimModuleSyntax": true` obliga `import type` |
| Build / bundle | `pnpm build` | igual que Application source | `tsconfig.json` (`"noEmit": true`; Next no emite con `tsc`) |
| drizzle-kit (carga `schema.ts`) | `pnpm db:generate` | `schema.ts` solo importa `drizzle-orm` | `drizzle.config.ts` — `schema: "./src/server/db/schema.ts"` |
| Playwright web server | `pnpm test:e2e` | scripts como en Standalone | `playwright.config.ts` — `webServer.command` con `node --env-file-if-exists=.env` |

#### Cross-artifact value reconciliation

| Shared value | Single source — the file that decides it | Literal value | Every other place it appears | Compared |
|---|---|---|---|---|
| Puerto de Postgres local | `docker-compose.yml` — `ports` | `54329` | `.env.example` (3 URLs) · `ci.yml` (paso 17, servicio y `env`) · §10 tabla de variables | yes |
| Usuario / clave / base | `docker-compose.yml` — `POSTGRES_USER`/`PASSWORD`/`DB` | `barberia` / `barberia` / `barberia` | `.env.example` · healthcheck (`-U barberia`) · `ci.yml` (paso 17) | yes |
| Bases de prueba | `docker/initdb/01-databases.sql` | `barberia_test`, `barberia_e2e` | `.env.example` (`TEST_DATABASE_URL`, `E2E_DATABASE_URL`) · healthcheck (`-d barberia_e2e`) · `ci.yml` (paso 17, `psql` crea ambas) | yes |
| Puerto de pruebas de servidor | `playwright.config.ts` — `port` / `scripts/serve-check.sh` — `port` | `3100` | ambos archivos · CLAUDE.md («port 3100») | yes |
| Puerto de desarrollo | Next por defecto | `3000` | `.env.example` (`APP_URL=http://localhost:3000`) · CLAUDE.md | yes |
| Ruta del esquema | `drizzle.config.ts` — `schema` | `./src/server/db/schema.ts` | §3 · paso 2 · `.claude/rules/database.md` · CLAUDE.md | yes |
| Carpeta de migraciones | `drizzle.config.ts` — `out` | `./drizzle` | `scripts/db-reset.ts` (`migrationsFolder: "drizzle"`) · `tests/setup/global-setup.ts` (`drizzle/meta/_journal.json`) · `biome.json` (`!**/drizzle`) | yes |
| Ruta del bundle | §19 (ubicación del bundle) | `blueprints/barberia-reservas/` (excluido como `blueprints`) | Bootstrap (`rsync`) · `tsconfig.json` `exclude` · `biome.json` `!!**/blueprints` · `vitest.config.ts` `blueprints/**` | yes |
| Nombre del paquete | `package.json` — `name` | `barberia-reservas` | slug del bundle · CI | yes |
| Versión de pnpm | `package.json` — `packageManager` | `pnpm@11.27.1` | Bootstrap (`corepack prepare pnpm@11.27.1`) · §11 | yes |
| Versión de Node | `.nvmrc` | `24.21.0` | `package.json#engines` (`>=24.2.0 <25`, lo incluye) · §10 · §11 · `ci.yml` (`node-version-file`) | yes |
| Imagen de Postgres | `docker-compose.yml` — `image` | `postgres:17.11-alpine` | `ci.yml` (paso 17) · §11 | yes |
| Nombre de la restricción | migración `constraints_rls` | `bookings_no_overlap` | §4 · pasos 2, 7 · CLAUDE.md · `.claude/rules/*` | yes |
| Referencia de pago | `src/server/booking/create.ts` (paso 9) | `BK-` + id de reserva | §4 · §5 · paso 10 · `.claude/rules/payments.md` | yes |
| Ruta del webhook | `src/app/api/webhooks/wompi/route.ts` (paso 10) | `/api/webhooks/wompi` | §5 · §12 (URL de eventos en Wompi) | yes |
| Ruta del cron | `src/app/api/cron/expire-holds/route.ts` (paso 17) | `/api/cron/expire-holds` | `vercel.json` · §5 · paso 17 Verify | yes |
| Script de ejecución de Next en pruebas | `scripts/serve-check.sh` / `playwright.config.ts` | `node node_modules/next/dist/bin/next` | ambos archivos | yes |

Regla 13 (ejecutar lo que se construye): el paso 1 ya arranca la build y pide `/` (`serve-check.sh`),
en el mismo paso en que existen el manifiesto y la configuración de Next; el paso 2 pide `/api/health`
con la base.

#### Byte-exact artifact reconciliation

| Byte-exact artifact | Authored by | First diffed at | Blueprint rules that constrain it | Runtime call that produces it, on the §11 pin | Both confirmed |
|---|---|---|---|---|---|
| Firma de integridad de Wompi `37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5` | paso 9 (criterio 1) | paso 9 | §4/`.claude/rules/payments.md`: `SHA-256 hex(reference + amountInCents + "COP" + secret)` | `createHash("sha256").update("sk8-438k4-xmxm392-sn2m2490000COPprod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6").digest("hex")` ejecutado con Node 22.22.2 el 2026-09-28 → ese valor; coincide con el ejemplo publicado por Wompi. SHA-256 no depende de la versión de Node | yes |
| Checksum de evento `5a18ec5e8fdb7df463e9f94774cba8f583ba21bd04a09ceff2ea68a4bc0aefbe` | paso 10 (criterio 1) | paso 10 | concatenar valores de `signature.properties`, `timestamp`, secreto; SHA-256; comparación sin mayúsculas | `createHash("sha256").update("1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z").digest("hex")` con Node 22.22.2 el 2026-09-28 → ese valor. (El checksum impreso en la documentación de Wompi para ese ejemplo es otro y no corresponde a su propio texto; por eso no se usa.) | yes |
| Instantes esperados del motor de horarios (pasos 6, criterios 1–5) | paso 6 | paso 6 | §4: `working_hours` en hora local; paso 6: horas inexistentes se omiten, ambiguas usan la primera ocurrencia; `[inicio, inicio + duración + búfer)` semiabierto | `Intl.DateTimeFormat(…, { timeZone, timeZoneName: "shortOffset" })` con Node 22.22.2 el 2026-09-28: Bogotá 09:00 = `14:00Z` (GMT-5); Santiago 2026-09-06 04:00Z = 01:00 GMT-3 y 03:30Z = 23:30 GMT-4 del día anterior (00:00–00:59 no existen); Santiago 2026-04-05 03:00Z = 23:00 GMT-4 del 4 y 02:30Z = 23:30 GMT-3 (23:00–23:59 se repiten); Kolkata 03:30Z = 09:00 GMT+5:30. Son reglas de la base de zonas IANA vigentes, no del formato de ICU; el Node 24 fijado usa la misma base o una posterior | yes |
| Totales del resumen (paso 14, criterios 1–5) | paso 14 | paso 14 | §4: `sales.amount_cop` negativo solo en `refund`; métricas del paso 14; día local `America/Bogota` | aritmética entera sobre el conjunto del paso 14: recaudado 15000 + 25000 + 15000 − 15000 + 10000 = 50000; gastado 800000 + 120000 = 920000; ganancia −870000; `cash` 25000 + 10000 = 35000; `nequi` 15000; `wompi` 15000 − 15000 = 0; `2026-11-01T02:00Z` = 21:00 del 31 de octubre en GMT-5 | yes |

---

## 20. Acceptance Gate, Risks & Decision Log

### 20.1 Global acceptance gate

The project is **done** when every command below exits 0 on a clean checkout (después de correr el
Bootstrap de §10), and not before. Es el mismo conjunto que corre CI.

```bash
pnpm install --frozen-lockfile                 # expect: exit 0
pnpm db:up                                     # expect: exit 0
pnpm db:migrate                                # expect: exit 0
pnpm lint                                      # expect: exit 0, zero errors and zero warnings
pnpm typecheck                                 # expect: exit 0
pnpm test                                      # expect: exit 0, 0 failed, 0 skipped (unit + integration)
pnpm test:e2e                                  # expect: exit 0, 0 failed (includes axe: 0 violations)
pnpm build                                     # expect: exit 0
bash scripts/serve-check.sh /api/health 200    # expect: exit 0 — the built app runs and reaches the DB
bash scripts/serve-check.sh / 200 x-content-type-options   # expect: exit 0 — security headers served
```

Plus these manual gates, each checked once before launch:

- [ ] Every step in §9 has its checkpoint tag in git: `git tag -l 'step-*'` lists `step-01-scaffold` … `step-17-hardening-deploy`, one per step. The repository is created by §10's Bootstrap.
- [ ] Every file §10's *Files that must be committed* table names is tracked — one path per invocation, e.g. `git ls-files --error-unmatch .env.example` and `git ls-files --error-unmatch pnpm-lock.yaml` each exit 0; and each is not ignored: `git check-ignore -q .env.example; test $? -eq 1` (1 = not ignored; 128 would be a usage error and fails this line).
- [ ] `.env` is ignored: `git check-ignore -q .env; test $? -eq 0`.
- [ ] The ignore file was in place before the first commit: `git log --diff-filter=A --format=%s -- .gitignore` prints `chore: bootstrap`.
- [ ] Every row of §19.6's *Byte-exact artifact reconciliation* table reads `Both confirmed: yes`.
- [ ] §10's Bootstrap block has been re-run once on the finished tree, **exited 0**, and afterwards `pnpm typecheck` still exits 0 (the guarded copy did not revert `package.json` or `next.config.ts`).
- [ ] Every row of §19.6's *Cross-artifact value reconciliation* table reads `Compared: yes`, and `pnpm lint` and `pnpm typecheck` above ran from the project root with the bundle present.
- [ ] Every non-goal in §1 is still un-built.
- [ ] Every environment variable in §10 is set in Vercel production and absent from the repo.
- [ ] Keyboard-only pass and one TalkBack pass over reservar → cita → cancelar (§15).

**Lista de lanzamiento (fuera de la construcción; requiere cuentas y personas):**

1. Crear el proyecto Supabase (São Paulo), copiar las cadenas *Transaction pooler* (`DATABASE_URL`) y *Session pooler* (`MIGRATION_DATABASE_URL`). No usar el editor de tablas para cambiar el esquema.
2. Crear el proyecto en Vercel desde el repositorio, región `gru1`, cargar todas las variables de §10, desplegar `main` (el build migra la base).
3. `pnpm owner:create` una vez contra producción (con las variables de producción en la terminal) y cargar servicios, precios, barberos y horarios reales en `/admin/ajustes`.
4. En Wompi: completar el registro del comercio, configurar la URL de eventos `https://<dominio>/api/webhooks/wompi` en sandbox y producción, y hacer **un pago real de prueba en sandbox** de punta a punta (reserva → pagar → la cita pasa a «Cita confirmada»).
5. Monitor externo de `/api/health` cada 5 minutos.
6. Si el dueño olvida la clave: en el SQL editor de Supabase, `delete from "user" where email = '<correo>'` (borra en cascada cuenta y sesiones) y volver a correr `pnpm owner:create`.
7. Publicar el enlace de reservas en WhatsApp Business e Instagram de la barbería.

**No warnings are ignored.**

### 20.2 Risk register

| Risk | Likelihood | Impact | Early signal | Mitigation |
|---|---|---|---|---|
| Clientes que reservan en efectivo y no llegan | A | M | «No vinieron» > 10 % en el resumen | estado `no_show` e historial; botón de WhatsApp en la agenda para confirmar el día anterior; anticipo configurable por transferencia; recordatorios automáticos son la primera línea de §20.4 |
| El dueño no registra ventas o gastos y el resumen miente | A | A | días hábiles con recaudado 0 | cobrar está en la tarjeta de la cita (2 toques); venta sin cita y gasto son un formulario corto; métrica «Registro de caja» en §1 |
| Configuración de Wompi incompleta (URL de eventos o secretos) y las citas por transferencia nunca se confirman | M | A | reservas `held` que vencen aunque el cliente pagó; 400 en el webhook | prueba de pago en sandbox en la lista de lanzamiento; un APPROVED tardío queda como `refund_pending` visible en `/admin/ventas` en vez de perderse |
| Competencia gratuita (Booksy, Fresha, AgendaPro) hace que no valga la pena construirla | M | M | el dueño no usa el panel después de un mes | alcance v1 pequeño; la diferencia es el control de caja propio y sin comisiones por reserva |
| Supabase Free pausa la base por inactividad o Vercel Hobby no permite uso comercial | M | A | la app deja de responder tras días sin uso | monitor de salud cada 5 min mantiene actividad; presupuestar Vercel Pro (US$20/mes) si se usa comercialmente |
| Detalles no ejercitados del stack al construir (opción de Biome para Tailwind, `!!` en `files.includes`, transformación JSX de Vite 8 en Vitest, `auth.$context` de better-auth en scripts, `pnpm-workspace.yaml#allowBuilds`) | M | M | falla el Verify del paso 1, 3 o 5 con un error de configuración | el Bootstrap **no se ejecutó** en la sesión de diseño (su red bloqueó el registro de npm); sí se ejecutó la migración `constraints_rls` y sus restricciones en PostgreSQL 16.13 (23P01 en solapamiento, cancelada y contigua aceptadas, RLS en las 15 tablas, signo de `sales`, índice único parcial, plazo 3–5). Cada supuesto restante está en un Verify temprano (pasos 1, 3, 5) para fallar pronto con el mensaje real |
| Datos personales sin autorización o sin política | B | A | falta `consent_at` o `/privacidad` | casilla obligatoria validada en el servidor; política publicada en el paso 16 |

### 20.3 Decision log

| # | Decision | Rejected alternative | Why | Would reverse if |
|---|---|---|---|---|
| 1 | Runtime track TypeScript/Node con Next.js | Rails/Laravel | un solo lenguaje, despliegue sin configuración, el track por defecto del shape | el equipo que mantenga la app solo conoce PHP o Ruby |
| 2 | Postgres con restricción `EXCLUDE` como única defensa contra dobles reservas | verificar en código antes de insertar | la verificación en código pierde toda carrera; la restricción no | nunca para reservas pagas |
| 3 | Supabase solo como Postgres administrado (sin Supabase Auth ni su SDK) | Supabase completo | una sola fuente de sesiones, pruebas locales con Docker sin la CLI de Supabase | se necesitan subida de archivos o tiempo real que Supabase resuelva mejor |
| 4 | better-auth con registro deshabilitado, solo el dueño | Clerk / Supabase Auth | tablas en la misma base, sin costo, sin segundo proveedor | se agregan cuentas de barberos o de clientes |
| 5 | Wompi Web Checkout y confirmación por evento firmado | verificación manual del comprobante de transferencia | la cita se confirma sola y el horario no queda bloqueado esperando al dueño | la comisión de Wompi supera lo que cuesta verificar a mano |
| 6 | Transferencia = 100 % del servicio como anticipo, porcentaje configurable 10–100 | anticipo parcial fijo | decisión del dueño (el servicio cuesta 15.000 y la diferencia es mínima) | sube la tarifa y los clientes abandonan el pago |
| 7 | Plazo de autogestión configurable 3–5 h, 4 h por defecto | plazo fijo | decisión del dueño («de 3 a 5 horas») | el dueño quiere más de 5 horas |
| 8 | Anticipo en cancelación a tiempo → `refund_pending` (devolución manual); al reprogramar se abona; no-show o cancelación tardía → se pierde | reembolso automático por API | pocas devoluciones al mes; manual es más simple y seguro | > 5 devoluciones al mes |
| 9 | Una sola barbería (sin `organization_id`) | multi-tenant desde el día 1 | el shape recomienda multi-tenant si hay *cualquier* posibilidad de equipos; aquí el dueño describió su barbería y no la venta a otras | se decide vender la app a otras barberías o abrir otra sede |
| 10 | PWA en lugar de app nativa | Expo / React Native | un solo código, sin tiendas; el cliente reserva desde el enlace | se necesitan notificaciones push nativas |
| 11 | Sin librería de componentes; tres primitivas propias | shadcn/ui (mencionado en la ficha de arquitectura) | `shadcn init` es interactivo y agrega dependencias sin versión verificada; v1 son formularios y listas | el panel crece a tablas complejas, diálogos y selectores de fecha |
| 12 | Zonas horarias con `Intl` propio | `date-fns` + `@date-fns/tz` | una conversión puntual, sin dependencias | aparecen reglas recurrentes complejas (RRULE) |
| 13 | Formularios sin JavaScript de cliente (estado en la URL) | asistente en React con estado | carga rápida en celulares modestos, funciona con «atrás» | la conversión del flujo resulta baja en pruebas con clientes |
| 14 | Vencimiento de apartados dentro de cada reserva + cron diario | cola de trabajos o cron cada minuto | Vercel Hobby solo permite crons diarios; hacerlo en la transacción no depende del cron | se pasa a Vercel Pro y se quiere liberar horarios sin esperar la siguiente reserva |
| 15 | Vitest 4.1.x y pnpm 11.x aunque `latest` ya es 5.x y 12.x | tomar las mayores nuevas | el track las ejercitó; las mayores nuevas no se probaron | una corrida real confirma que las nuevas mayores funcionan con este stack |
| 16 | TypeScript 6.0.3 aunque `latest` es 7.0.2 | TS 7 | Next exige una opción experimental para TS 7 | Next soporta TS 7 sin opción experimental |

### 20.4 What to build next

1. **Recordatorios automáticos por WhatsApp** la noche anterior — cuando los no-shows superen el 10 % durante dos meses (§1).
2. **Reembolso automático por la API de Wompi** — con más de 5 devoluciones al mes.
3. **Inicio de sesión para barberos y comisiones** — al contratar más de 3 barberos.
4. **Cuentas de cliente con historial y fidelidad** — cuando los clientes lo pidan.
5. **App nativa** — con más de 300 clientes activos al mes o necesidad de push nativo.

---

*End of blueprint. Build order is §9. Stop when §20.1 is green.*
