# Epic 01: Fundación: proyecto, datos, acceso y motor de horarios

> Existe una app Next.js que compila y sirve, con la base Postgres completa y protegida contra dobles reservas, el dueño puede entrar a /admin, y el motor de horarios calcula los slots en cualquier zona horaria.

| | |
|---|---|
| **Epic id** | `01-fundacion` |
| **Tasks** | `E1-T1` … `E1-T6` |
| **Depends on** | nada — empieza aquí (después del Bootstrap) |
| **Unlocks** | `02-reservas-y-pagos`, `03-negocio-y-lanzamiento` |
| **Parallel with** | — |

No necesitas ningún otro archivo para completar esta épica. Todo lo de abajo se repite aquí a propósito.

---

## Arranque (una vez, antes de `E1-T1`)

Proyecto nuevo: crea la carpeta del proyecto, mueve este bundle a `blueprints/barberia-reservas/`
dentro de ella y corre este bloque desde la raíz del proyecto. Requisitos: Node 24.21.0 (`.nvmrc`),
Docker con `docker compose`, `git`, `rsync`, `curl`.

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
    layout.tsx, globals.css, page.tsx     # NUEVO (T1)
    api/health/route.ts                   # NUEVO (T2)
    api/auth/[...all]/route.ts            # NUEVO (T3)
    entrar/page.tsx                       # NUEVO (T4)
    admin/layout.tsx, admin/page.tsx      # NUEVO (T4)
  components/ui/button.tsx, field.tsx, card.tsx   # NUEVO (T5)
  lib/env.ts                              # NUEVO (T1)
  lib/money.ts                            # NUEVO (T5)
  lib/time.ts                             # NUEVO (T6)
  server/db/schema.ts, db/client.ts       # NUEVO (T2)
  server/auth.ts                          # NUEVO (T3)
  server/session.ts                       # NUEVO (T4)
  server/booking/slots.ts, availability.ts   # NUEVO (T6)
  types/css.d.ts                          # existe (workspace), solo lectura
scripts/
  create-owner.ts, seed.ts                # NUEVO (T3)
  db-reset.ts, serve-check.sh             # existen (workspace), solo lectura
drizzle/                                  # GENERADO por drizzle-kit (T2)
tests/
  setup/db.ts, fixtures.ts, global-setup.ts   # existen (workspace), solo lectura
  unit/smoke.test.ts, tokens.test.ts, slots.test.ts          # NUEVO
  integration/schema.test.ts, seed.test.ts, availability.test.ts   # NUEVO
  e2e/admin-login.spec.ts                 # NUEVO
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar
un archivo que no aparece aquí, detente y repórtalo: el límite de la épica está mal.

## Data model touched here

| Entidad | Qué hace esta épica | Notas |
|---|---|---|
| todas (15 tablas) | las crea (T2) | esquema literal en la tarea `E1-T2` |
| `bookings` | restricción `bookings_no_overlap` | `EXCLUDE USING gist` sobre `barber_id` + `tstzrange(blocked_from, blocked_until, '[)')`, solo `held`/`confirmed` |
| `user`, `account` | crea al dueño (T3) | `providerId 'credential'`, clave con el hash de better-auth |
| `shop_settings`, `barbers`, `services`, `working_hours`, `expense_categories` | semilla (T3) | idempotente |

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| Bootstrap (§10) | `package.json`, configs, `tests/setup/*`, `scripts/db-reset.ts`, `scripts/serve-check.sh` | ya en la raíz; no se editan salvo que una tarea lo diga |

**Produced** — las épicas siguientes dependen de estas firmas:

| Export | Signature | Used by |
|---|---|---|
| `src/lib/env.ts` → `dbEnv`, `authEnv`, `ownerEnv`, `wompiEnv`, `wompiEventsEnv`, `cronEnv`, `MissingEnvError` | `() => { …vars }`, lanza `MissingEnvError` | todas |
| `src/server/db/client.ts` → `db`, `sqlClient` | cliente Drizzle / cliente `postgres` | todas |
| `src/server/auth.ts` → `auth` | instancia better-auth | 02, 03 |
| `src/server/session.ts` → `requireOwner()` | `Promise<Session>`, redirige a `/entrar` | 02, 03 |
| `src/lib/time.ts` → `wallTimeToInstant`, `localDay`, `addDays`, `weekdayOf`, `formatDateTime`, `formatTime` | ver T6 | 02, 03 |
| `src/lib/money.ts` → `formatCop`, `parseCop` | `(n: number) => string`, `(s: string) => number \| null` | 02, 03 |
| `src/server/booking/availability.ts` → `getAvailability` | `({ day, serviceId, barberId, now }) => Promise<{ barberId, startsAt }[]>` | 02, 03 |
| `src/components/ui/*` → `Button`, `Field`, `Card` | componentes React | 02, 03 |

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

### `E1-T1` — Crear el cascarón de la app y el módulo de entorno

**Depends on:** nada (solo el Arranque) · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/app/layout.tsx` — nuevo — layout raíz, idioma es-CO, enlace «Saltar al contenido»
- `src/app/globals.css` — nuevo — Tailwind v4 + tokens de §7
- `src/app/page.tsx` — nuevo — portada provisional con botón «Reservar cita» (se reemplaza en el paso 16)
- `src/lib/env.ts` — nuevo — grupos de variables validados de forma perezosa
- `tests/unit/smoke.test.ts` — nuevo — prueba de `dbEnv()` y `MissingEnvError`

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `pnpm lint` corre desde la raíz del proyecto con el bundle presente en `blueprints/` THE SYSTEM SHALL terminar con código 0.
2. WHEN `pnpm typecheck` corre THE SYSTEM SHALL terminar con código 0 y cero errores.
3. WHEN `pnpm test:unit tests/unit/smoke.test.ts` corre THE SYSTEM SHALL comprobar que `dbEnv()` lanza `MissingEnvError` sin `DATABASE_URL` y devuelve el valor cuando existe, con 0 pruebas fallidas.
4. WHEN `pnpm build` corre THE SYSTEM SHALL terminar con código 0.
5. WHEN la app compilada arranca y se pide `/` THE SYSTEM SHALL responder HTTP 200.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm lint                                 # expect: exit 0
pnpm typecheck                            # expect: exit 0
pnpm test:unit tests/unit/smoke.test.ts   # expect: exit 0, 2 passed, 0 failed
pnpm build                                # expect: exit 0
bash scripts/serve-check.sh / 200         # expect: exit 0 — prints `serve-check: / -> 200 ok`
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T1: Crear el cascarón de la app y el módulo de entorno"
git tag step-01-scaffold
# rollback target if the next step goes wrong: git reset --hard step-01-scaffold
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **No uses `create-next-app` ni `shadcn init`.** El manifiesto y las configuraciones ya los puso el Bootstrap con versiones fijadas; un generador los pisa.
- **`@theme` en el CSS rompe Biome si falta `css.parser.tailwindDirectives`.** Ya está en el `biome.json` del workspace; no lo quites.

### `E1-T2` — Definir el esquema, migrar Postgres local y exponer /api/health

**Depends on:** `E1-T1` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/server/db/schema.ts` — nuevo — esquema completo de §4
- `src/server/db/client.ts` — nuevo — cliente Drizzle sobre `postgres`
- `src/app/api/health/route.ts` — nuevo — `GET` que hace `select 1`
- `tests/integration/schema.test.ts` — nuevo — tablas, restricción de solapamiento, RLS
- `drizzle/**` — generado — la migración de `pnpm db:generate` y la `--custom` `constraints_rls`

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `pnpm db:migrate` corre contra la base local vacía THE SYSTEM SHALL terminar con código 0 y crear las tablas `user`, `session`, `account`, `verification`, `shop_settings`, `barbers`, `services`, `working_hours`, `time_off`, `customers`, `bookings`, `payments`, `sales`, `expense_categories` y `expenses`.
2. WHEN `pnpm db:check` corre después de migrar THE SYSTEM SHALL terminar con código 0.
3. WHEN se insertan dos reservas `confirmed` del mismo barbero cuyos rangos `[blocked_from, blocked_until)` se solapan THE SYSTEM SHALL rechazar la segunda con el código de Postgres `23P01` (restricción `bookings_no_overlap`), y WHEN la segunda está `cancelled` o los rangos solo se tocan THE SYSTEM SHALL aceptarla.
4. WHEN se leen las tablas del esquema `public` THE SYSTEM SHALL reportar `relrowsecurity = true` en todas.
5. WHEN la app compilada arranca con la base arriba y se pide `/api/health` THE SYSTEM SHALL responder HTTP 200.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

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
git add -A && git commit -m "E1-T2: Definir el esquema, migrar Postgres local y exponer /api/health"
git tag step-02-db-schema
# rollback target if the next step goes wrong: git reset --hard step-02-db-schema
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **No inventes nombres de migración.** drizzle-kit los elige; se referencian por el sufijo `_constraints_rls.sql` o por efecto (la restricción existe).
- **`btree_gist` es obligatorio** para mezclar `=` sobre `uuid` con `&&` sobre rangos en una restricción `EXCLUDE`.
- **`timestamptz + interval` no es inmutable**, por eso los búferes se guardan ya calculados en `blocked_from`/`blocked_until` en lugar de calcularse dentro de la restricción.

### `E1-T3` — Configurar better-auth, crear al dueño y sembrar datos

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/server/auth.ts` — nuevo — instancia de better-auth
- `src/app/api/auth/[...all]/route.ts` — nuevo — handler de better-auth
- `scripts/create-owner.ts` — nuevo — `ensureOwner()` idempotente + CLI
- `scripts/seed.ts` — nuevo — `seed()` idempotente + CLI
- `tests/integration/seed.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `seed()` corre dos veces seguidas THE SYSTEM SHALL dejar exactamente una fila en `shop_settings` y exactamente un `user` con el email `OWNER_EMAIL`.
2. WHEN `pnpm test:int tests/integration/seed.test.ts` corre THE SYSTEM SHALL confirmar que existen los servicios `Corte clásico`, `Corte + barba` y `Barba`, los barberos `Andrés` y `Camilo` y las categorías `Arriendo`, `Productos`, `Servicios públicos`, `Nómina`, `Mantenimiento` y `Otros`.
3. WHEN `auth.api.signInEmail` recibe el email y la clave del dueño sembrado THE SYSTEM SHALL devolver un token de sesión.
4. WHEN `auth.api.signInEmail` recibe una clave incorrecta THE SYSTEM SHALL rechazarla y no crear filas en `session`.
5. WHEN `auth.api.signUpEmail` recibe un email nuevo THE SYSTEM SHALL rechazarlo porque el registro está deshabilitado.
6. WHEN `pnpm db:seed` corre dos veces contra la base de desarrollo THE SYSTEM SHALL terminar con código 0 ambas veces.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

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
git add -A && git commit -m "E1-T3: Configurar better-auth, crear al dueño y sembrar datos"
git tag step-03-auth-seed
# rollback target if the next step goes wrong: git reset --hard step-03-auth-seed
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **No agregues el plugin `nextCookies()`.** El ingreso y la salida se hacen desde el cliente con `better-auth/react`; así `src/server/auth.ts` sigue cargando en scripts de Node y en Vitest.
- **`disableSignUp: true` también bloquea `signUpEmail` en el servidor**; por eso el dueño se crea con `ctx.adapter`, no con la API de registro.

### `E1-T4` — Ingreso del dueño y panel /admin protegido

**Depends on:** `E1-T3` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/app/entrar/page.tsx` — nuevo — formulario de ingreso (cliente) y salida con `?salir=1`
- `src/server/session.ts` — nuevo — `getOwnerSession()` y `requireOwner()`
- `src/app/admin/layout.tsx` — nuevo — exige sesión, navegación del panel
- `src/app/admin/page.tsx` — nuevo — «Agenda» provisional (se completa en el paso 11)
- `tests/e2e/admin-login.spec.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN un visitante sin sesión abre `/admin` THE SYSTEM SHALL redirigirlo a `/entrar`.
2. WHEN el dueño envía en `/entrar` el `OWNER_EMAIL` y el `OWNER_PASSWORD` sembrados THE SYSTEM SHALL llevarlo a `/admin` y mostrar un encabezado de nivel 1 «Agenda».
3. WHEN se envía una clave incorrecta THE SYSTEM SHALL quedarse en `/entrar` y mostrar `Correo o contraseña incorrectos` en un elemento con `role="alert"`.
4. WHEN el dueño con sesión abre `/entrar?salir=1` THE SYSTEM SHALL cerrar la sesión de modo que una nueva visita a `/admin` redirija a `/entrar`.
5. WHEN `pnpm test:e2e tests/e2e/admin-login.spec.ts` corre THE SYSTEM SHALL terminar con código 0 y 0 pruebas fallidas.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                    # expect: exit 0
pnpm typecheck                                # expect: exit 0
pnpm lint                                     # expect: exit 0
pnpm test:e2e tests/e2e/admin-login.spec.ts   # expect: exit 0, 0 failed
pnpm build                                    # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T4: Ingreso del dueño y panel /admin protegido"
git tag step-04-admin-login
# rollback target if the next step goes wrong: git reset --hard step-04-admin-login
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **No crees `middleware.ts` ni `proxy.ts`.** La protección real es `requireOwner()` en el layout y en cada server action; un matcher que excluya una ruta saltaría la verificación en silencio.
- **Los server actions son endpoints POST propios**: el layout no los protege. Por eso cada acción de admin empieza con `await requireOwner()`.

### `E1-T5` — Componentes base, formato de dinero y prueba de tokens

**Depends on:** `E1-T1` · **Priority:** p1 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/components/ui/button.tsx` — nuevo
- `src/components/ui/field.tsx` — nuevo
- `src/components/ui/card.tsx` — nuevo
- `src/lib/money.ts` — nuevo — `formatCop()` y `parseCop()`
- `tests/unit/tokens.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `pnpm test:unit tests/unit/tokens.test.ts` corre THE SYSTEM SHALL comprobar que `src/app/globals.css` define `--background`, `--surface`, `--border`, `--fg`, `--fg-muted`, `--primary`, `--primary-fg`, `--destructive` y `--success` tanto en `:root` como dentro del bloque `prefers-color-scheme: dark`.
2. WHEN esa prueba recorre los `.tsx` de `src/components/` y `src/app/` salvo `src/app/layout.tsx` y `src/app/icons/` THE SYSTEM SHALL encontrar cero literales de color hexadecimales.
3. WHEN esa prueba importa `src/components/ui/button.tsx`, `field.tsx` y `card.tsx` THE SYSTEM SHALL encontrar las funciones exportadas `Button`, `Field` y `Card`.
4. WHEN `parseCop` recibe `$ 15.000` THE SYSTEM SHALL devolver `15000`, y WHEN recibe `abc` THE SYSTEM SHALL devolver `null`.
5. WHEN `pnpm typecheck` y `pnpm lint` corren THE SYSTEM SHALL terminar con código 0.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm test:unit tests/unit/tokens.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                             # expect: exit 0
pnpm lint                                  # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T5: Componentes base, formato de dinero y prueba de tokens"
git tag step-05-ui-base
# rollback target if the next step goes wrong: git reset --hard step-05-ui-base
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **No compares la cadena exacta de `formatCop`**: `Intl` inserta un espacio no separable cuya forma cambia entre versiones de ICU. Solo `/15\.000/`.
- **Sin librería de componentes.** Estas tres piezas cubren el alcance v1; agregar shadcn/Radix trae dependencias sin versión verificada en §11.

### `E1-T6` — Motor de disponibilidad con zonas horarias

**Depends on:** `E1-T2` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/lib/time.ts` — nuevo — utilidades de zona horaria con `Intl`
- `src/server/booking/slots.ts` — nuevo — `generateSlots()` puro
- `src/server/booking/availability.ts` — nuevo — `getAvailability()` sobre la base
- `tests/unit/slots.test.ts` — nuevo
- `tests/integration/availability.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `generateSlots` corre para `America/Bogota` el `2026-10-05` con ventana 09:00–19:00, servicio de 30 minutos, intervalo de 15, sin bloqueos, `minNoticeMinutes` 60 y `now` `2026-10-01T00:00:00Z` THE SYSTEM SHALL devolver 39 slots, el primero `2026-10-05T14:00:00.000Z` y el último `2026-10-05T23:30:00.000Z`.
2. WHEN la ventana es 00:00–02:00 en `America/Santiago` el `2026-09-06` (cambio de hora hacia adelante) con servicio e intervalo de 30 minutos THE SYSTEM SHALL devolver exactamente `2026-09-06T04:00:00.000Z` y `2026-09-06T04:30:00.000Z`.
3. WHEN la ventana es 22:30–23:30 en `America/Santiago` el `2026-04-04` (noche del cambio de hora hacia atrás) con servicio e intervalo de 30 minutos THE SYSTEM SHALL devolver exactamente `2026-04-05T01:30:00.000Z` y `2026-04-05T02:00:00.000Z`.
4. WHEN la ventana es 09:00–10:00 en `Asia/Kolkata` el `2026-10-05` con servicio e intervalo de 30 minutos THE SYSTEM SHALL devolver exactamente `2026-10-05T03:30:00.000Z` y `2026-10-05T04:00:00.000Z`.
5. WHEN existe un bloqueo `[2026-10-05T15:00Z, 2026-10-05T15:45Z)` y el servicio de 30 minutos tiene búfer de 10 THE SYSTEM SHALL omitir todo slot de Bogotá cuyo `[inicio, inicio + 40 min)` se solape y conservar `2026-10-05T14:15:00.000Z` y `2026-10-05T15:45:00.000Z`.
6. WHEN `getAvailability` corre contra la base de pruebas THE SYSTEM SHALL excluir un slot ocupado por una reserva `confirmed`, incluir un slot cuya única reserva es `held` con `hold_expires_at` vencido, y no devolver slots en un día cubierto por un `time_off` de toda la tienda.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm test:unit tests/unit/slots.test.ts                # expect: exit 0, 0 failed
pnpm db:up                                             # expect: exit 0
pnpm test:int tests/integration/availability.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                         # expect: exit 0
pnpm lint                                              # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E1-T6: Motor de disponibilidad con zonas horarias"
git tag step-06-slot-engine
# rollback target if the next step goes wrong: git reset --hard step-06-slot-engine
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **No sumes 24 horas a un instante para obtener «mañana».** Opera sobre el día local (`addDays`) y convierte al final.
- **Bogotá no tiene horario de verano, pero la zona se lee de `shop_settings`**; las pruebas de Santiago y Kolkata protegen el día en que eso cambie.

---

## Epic acceptance

La épica está hecha cuando todas sus tareas están `done` **y**:

1. WHEN `pnpm lint && pnpm typecheck && pnpm test` corre con `pnpm db:up` THE SYSTEM SHALL terminar con código 0.
2. WHEN `pnpm test:e2e tests/e2e/admin-login.spec.ts` corre THE SYSTEM SHALL terminar con código 0.

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e tests/e2e/admin-login.spec.ts
```

Desde la raíz del proyecto. Ambos criterios los deciden estos comandos.

## Pitfalls

- (E1-T1) **No uses `create-next-app` ni `shadcn init`.** El manifiesto y las configuraciones ya los puso el Bootstrap con versiones fijadas; un generador los pisa.
- (E1-T2) **No inventes nombres de migración.** drizzle-kit los elige; se referencian por el sufijo `_constraints_rls.sql` o por efecto (la restricción existe).
- (E1-T3) **No agregues el plugin `nextCookies()`.** El ingreso y la salida se hacen desde el cliente con `better-auth/react`; así `src/server/auth.ts` sigue cargando en scripts de Node y en Vitest.
- (E1-T4) **No crees `middleware.ts` ni `proxy.ts`.** La protección real es `requireOwner()` en el layout y en cada server action; un matcher que excluya una ruta saltaría la verificación en silencio.
- (E1-T5) **No compares la cadena exacta de `formatCop`**: `Intl` inserta un espacio no separable cuya forma cambia entre versiones de ICU. Solo `/15\.000/`.
- (E1-T6) **No sumes 24 horas a un instante para obtener «mañana».** Opera sobre el día local (`addDays`) y convierte al final.

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
