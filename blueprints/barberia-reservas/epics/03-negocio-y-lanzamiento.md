# Epic 03: Control del negocio y lanzamiento

> El dueño registra gastos, ve el resumen financiero (clientes atendidos, recaudado, gastado, ganancia, por método, categoría, día y barbero), ajusta precios, horarios y políticas, y la app queda instalable, accesible, endurecida y lista para desplegar en Vercel con CI.

| | |
|---|---|
| **Epic id** | `03-negocio-y-lanzamiento` |
| **Tasks** | `E3-T1` … `E3-T5` |
| **Depends on** | `01-fundacion`; `E3-T2` y `E3-T5` además dependen de `02-reservas-y-pagos` |
| **Unlocks** | nada — es la última épica |
| **Parallel with** | `02-reservas-y-pagos` para `E3-T1` y `E3-T3` |

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
next.config.ts                          # existe (workspace); EDITADO (T5)
vercel.json                             # NUEVO (T5)
.github/workflows/ci.yml                # NUEVO (T5)
src/
  app/
    page.tsx                            # existe (01); EDITADO (T4)
    privacidad/page.tsx                 # NUEVO (T4)
    manifest.ts                         # NUEVO (T4)
    icons/[size]/route.tsx              # NUEVO (T4)
    admin/gastos/page.tsx, actions.ts   # NUEVO (T1)
    admin/resumen/page.tsx              # NUEVO (T2)
    admin/ajustes/page.tsx, actions.ts  # NUEVO (T3)
    api/cron/expire-holds/route.ts      # NUEVO (T5)
  components/charts/bar-list.tsx        # NUEVO (T2)
  server/admin/expenses.ts              # NUEVO (T1)
  server/admin/metrics.ts               # NUEVO (T2)
  server/admin/settings.ts              # NUEVO (T3)
tests/
  integration/expenses, metrics, settings, deploy (.test.ts)   # NUEVO
  e2e/public.spec.ts                    # NUEVO
```

Todo lo que esté fuera de este subárbol queda fuera de alcance. Si una tarea parece exigir editar
un archivo que no aparece aquí, detente y repórtalo: el límite de la épica está mal.

## Data model touched here

| Entidad | Campos | Notas |
|---|---|---|
| `expenses` | `category_id`, `amount_cop` (> 0), `spent_on` (`YYYY-MM-DD`), `description`, `method` | se pueden borrar |
| `expense_categories` | `name` (único), `active` | se desactivan, no se borran |
| `sales`, `bookings` | lectura para el resumen | ingresos = suma de `sales.amount_cop` |
| `shop_settings`, `services`, `barbers`, `working_hours`, `time_off` | edición (T3) | `CHECK`: anticipo 10–100, plazo 3–5 h, apartado 10–30 min |

## Contracts

**Consumed** — ya existe, no lo reconstruyas:

| From | Interface | Guarantee |
|---|---|---|
| `01-fundacion` | `requireOwner()`, `db`, `wallTimeToInstant`, `localDay`, `addDays`, `formatCop`, `parseCop`, `Button`, `Field`, `Card`, `getAvailability` | ver épica 01 |
| `02-reservas-y-pagos` | `createBooking`, `expireStaleHolds` | ver épica 02 |

**Produced** — las épicas siguientes dependen de estas firmas:

| Export | Signature | Used by |
|---|---|---|
| `src/server/admin/metrics.ts` → `getMetrics` | `({ from, to }) => Promise<Metrics>` | — |
| `src/server/admin/settings.ts` → `updateShopSettings`, `upsertService`, `upsertBarber`, `setWorkingHours`, `addTimeOff`, `removeTimeOff` | ver T3 | — |

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

### `E3-T1` — Gastos y categorías de gasto

**Depends on:** `E1-T4` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/server/admin/expenses.ts` — nuevo
- `src/app/admin/gastos/page.tsx` — nuevo
- `src/app/admin/gastos/actions.ts` — nuevo
- `tests/integration/expenses.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN se registra un gasto de 800000 en la categoría `Arriendo` con fecha `2026-10-01` THE SYSTEM SHALL insertar una fila en `expenses` con esos valores.
2. WHEN el monto es 0, negativo o no entero, o la categoría está inactiva THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }` sin insertar nada.
3. WHEN `listExpenses({ from: "2026-10-01", to: "2026-10-31" })` corre THE SYSTEM SHALL devolver solo gastos con `spent_on` dentro de ese rango inclusivo, del más reciente al más antiguo.
4. WHEN se desactiva una categoría con gastos THE SYSTEM SHALL conservar sus gastos y excluirla de `listCategories({ activeOnly: true })`.
5. WHEN se crea una categoría con un nombre que ya existe sin distinguir mayúsculas THE SYSTEM SHALL devolver `{ ok: false, error: "duplicate" }`.
6. WHEN la prueba lee `src/app/admin/gastos/actions.ts` THE SYSTEM SHALL encontrar `await requireOwner();` como primera sentencia de cada función async exportada.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                         # expect: exit 0
pnpm test:int tests/integration/expenses.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                     # expect: exit 0
pnpm lint                                          # expect: exit 0
pnpm build                                         # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T1: Gastos y categorías de gasto"
git tag step-13-expenses
# rollback target if the next step goes wrong: git reset --hard step-13-expenses
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **`spent_on` es un día calendario, no un instante.** Guárdalo como `YYYY-MM-DD` del día local; no conviertas a UTC.

### `E3-T2` — Resumen financiero del negocio

**Depends on:** `E2-T6`, `E3-T1` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/server/admin/metrics.ts` — nuevo — `getMetrics({ from, to })`
- `src/app/admin/resumen/page.tsx` — nuevo
- `src/components/charts/bar-list.tsx` — nuevo — barras horizontales en CSS, sin librería
- `tests/integration/metrics.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN `getMetrics({ from: "2026-10-01", to: "2026-10-31" })` corre sobre el conjunto de datos descrito en esta tarea THE SYSTEM SHALL devolver `collectedCop = 50000`, `spentCop = 920000` y `profitCop = -870000`.
2. WHEN corre sobre ese mismo conjunto THE SYSTEM SHALL devolver `customersServed = 4` (2 reservas completadas + 2 ventas sin cita) y `noShows = 1`.
3. WHEN corre sobre ese mismo conjunto THE SYSTEM SHALL devolver en `byMethod` los totales `cash` 35000, `nequi` 15000 y `wompi` 0.
4. WHEN corre sobre ese mismo conjunto THE SYSTEM SHALL devolver `expensesByCategory` con `Arriendo` 800000 y `Productos` 120000, en ese orden descendente.
5. WHEN una venta ocurre en `2026-11-01T02:00:00Z` THE SYSTEM SHALL contarla en octubre porque el límite de día es `America/Bogota` (21:00 del 31 de octubre).

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                        # expect: exit 0
pnpm test:int tests/integration/metrics.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                    # expect: exit 0
pnpm lint                                         # expect: exit 0
pnpm build                                        # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T2: Resumen financiero del negocio"
git tag step-14-dashboard
# rollback target if the next step goes wrong: git reset --hard step-14-dashboard
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **`date_trunc('day', occurred_at)` en SQL usa la zona de la sesión (UTC)** y parte los días a las 19:00 de Bogotá. Agrupa con `occurred_at at time zone 'America/Bogota'` (la zona de `shop_settings`) o en TypeScript con `localDay`.

### `E3-T3` — Ajustes: servicios, precios, barberos, horarios y políticas

**Depends on:** `E2-T1`, `E1-T4` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/server/admin/settings.ts` — nuevo
- `src/app/admin/ajustes/page.tsx` — nuevo
- `src/app/admin/ajustes/actions.ts` — nuevo
- `tests/integration/settings.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN el dueño cambia `Corte clásico` de 15000 a 18000 THE SYSTEM SHALL usar 18000 en las reservas nuevas mientras las existentes conservan `price_cop` 15000.
2. WHEN `self_service_cutoff_hours` se guarda con 3, 4 o 5 THE SYSTEM SHALL aceptarlo, y WHEN se envía 2 o 6 THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }` y conservar el valor anterior.
3. WHEN `deposit_percent` se envía fuera de 10–100 THE SYSTEM SHALL devolver `{ ok: false, error: "invalid_input" }`.
4. WHEN el horario del martes de un barbero se reemplaza por 10:00–14:00 THE SYSTEM SHALL hacer que `getAvailability` de ese barbero un martes no devuelva ningún slot antes de las 10:00 ni que termine después de las 14:00 hora local.
5. WHEN un barbero se desactiva THE SYSTEM SHALL excluirlo de `getAvailability` con `barberId: "any"` sin cambiar sus reservas existentes.
6. WHEN la prueba lee `src/app/admin/ajustes/actions.ts` THE SYSTEM SHALL encontrar `await requireOwner();` como primera sentencia de cada función async exportada.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

```bash
pnpm db:up                                         # expect: exit 0
pnpm test:int tests/integration/settings.test.ts   # expect: exit 0, 0 failed
pnpm typecheck                                     # expect: exit 0
pnpm lint                                          # expect: exit 0
pnpm build                                         # expect: exit 0
```

**Checkpoint**

```bash
git add -A && git commit -m "E3-T3: Ajustes: servicios, precios, barberos, horarios y políticas"
git tag step-15-settings
# rollback target if the next step goes wrong: git reset --hard step-15-settings
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **Desactivar, nunca borrar**, servicios y barberos con reservas: las llaves foráneas usan `restrict` a propósito.

### `E3-T4` — Portada, política de privacidad, app instalable y accesibilidad

**Depends on:** `E2-T2`, `E1-T5` · **Priority:** p1 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `src/app/page.tsx` — edición — portada definitiva
- `src/app/privacidad/page.tsx` — nuevo — política de tratamiento de datos (Ley 1581 de 2012)
- `src/app/manifest.ts` — nuevo — manifiesto PWA
- `src/app/icons/[size]/route.tsx` — nuevo — íconos PNG generados con `next/og`
- `tests/e2e/public.spec.ts` — nuevo — manifiesto, íconos, privacidad, axe, 320px

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN se pide `/manifest.webmanifest` THE SYSTEM SHALL devolver JSON con `name`, `short_name`, `start_url` `/`, `display` `standalone` e íconos de tamaños `192x192` y `512x512` que apuntan a `/icons/192` y `/icons/512`.
2. WHEN se piden `/icons/192` y `/icons/512` THE SYSTEM SHALL responder 200 con `content-type` `image/png`.
3. WHEN se pide `/privacidad` THE SYSTEM SHALL mostrar el nombre de la barbería como responsable y el texto `Ley 1581 de 2012` junto con `conocer, actualizar, rectificar y suprimir`.
4. WHEN axe-core analiza `/`, `/reservar`, `/privacidad` y `/entrar` en un Pixel 7 con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa` THE SYSTEM SHALL reportar 0 violaciones.
5. WHEN `/` se carga a 320 px CSS de ancho THE SYSTEM SHALL tener `document.documentElement.scrollWidth` igual a `clientWidth`.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

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
git add -A && git commit -m "E3-T4: Portada, política de privacidad, app instalable y accesibilidad"
git tag step-16-public-pwa
# rollback target if the next step goes wrong: git reset --hard step-16-public-pwa
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **`ImageResponse` no entiende variables CSS**: los colores del ícono van como literales; por eso `src/app/icons/` está exento de la prueba de tokens.

### `E3-T5` — Cabeceras de seguridad, cron de apartados, CI y despliegue

**Depends on:** `E2-T3`, `E3-T2`, `E3-T3`, `E3-T4` · **Priority:** p0 — metadato para recortes de alcance, no un orden de ejecución

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

**Files**
- `next.config.ts` — edición — cabeceras de seguridad
- `src/app/api/cron/expire-holds/route.ts` — nuevo — `GET` protegido con `CRON_SECRET`
- `vercel.json` — nuevo — comando de build y cron diario
- `.github/workflows/ci.yml` — nuevo — CI con Postgres de servicio
- `tests/integration/deploy.test.ts` — nuevo

**Acceptance**

Copiados literalmente del arreglo `acceptance` de esta tarea en `tasks.json`. Cada uno lo decide un comando de abajo, en esta máquina, durante la construcción.

1. WHEN se llama `headers()` de `next.config.ts` THE SYSTEM SHALL devolver para `/:path*` `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` y una `Content-Security-Policy` que contiene `frame-ancestors 'none'`, y la app compilada SHALL enviar `x-content-type-options` en `/`.
2. WHEN se llama `GET /api/cron/expire-holds` sin `Authorization: Bearer <CRON_SECRET>` THE SYSTEM SHALL responder 401 sin cambiar nada.
3. WHEN se llama con el token correcto THE SYSTEM SHALL cancelar cada reserva `held` cuyo `hold_expires_at` ya pasó (`cancelled_by='system'`) y responder 200 con `{ expired: <n> }`.
4. WHEN se parsea `vercel.json` THE SYSTEM SHALL encontrar un cron con `path` `/api/cron/expire-holds` y un `buildCommand` que corre `pnpm db:migrate` solo cuando `VERCEL_ENV` es `production`.
5. WHEN se lee `.github/workflows/ci.yml` THE SYSTEM SHALL encontrar, en este orden, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm db:migrate`, `pnpm test`, `pnpm test:e2e` y `pnpm build`.

**Verify** — cada comando, en orden, desde la raíz del proyecto. Cada uno sale 0 cuando la tarea está bien; la tarea está hecha cuando el último sale 0.

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
git add -A && git commit -m "E3-T5: Cabeceras de seguridad, cron de apartados, CI y despliegue"
git tag step-17-hardening-deploy
# rollback target if the next step goes wrong: git reset --hard step-17-hardening-deploy
```

Córrelos después de que el último comando de Verify salga 0 y antes de empezar la tarea siguiente.
La etiqueta es el punto de retorno de esta tarea y la cuenta la compuerta final; cópiala del campo
`checkpoint` de `tasks.json`, nunca la inventes.

**Trampas de esta tarea**
- **Vercel Cron llama con `GET`, no sigue redirecciones y en el plan Hobby corre como máximo una vez al día.** El vencimiento real de apartados ocurre en cada reserva (paso 9); el cron solo limpia.
- **No pongas `script-src` en la CSP** sin nonces: Next inyecta scripts en línea y la app dejaría de hidratar.

---

## Epic acceptance

La épica está hecha cuando todas sus tareas están `done` **y**:

1. WHEN `pnpm lint && pnpm typecheck && pnpm test` corre con `pnpm db:up` THE SYSTEM SHALL terminar con código 0.
2. WHEN `pnpm test:e2e` corre (todas las pruebas e2e) y luego `pnpm build` THE SYSTEM SHALL terminar ambos con código 0.

```bash
pnpm db:up
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e
pnpm build
```

Desde la raíz del proyecto. Ambos criterios los deciden estos comandos.

## Pitfalls

- (E3-T1) **`spent_on` es un día calendario, no un instante.** Guárdalo como `YYYY-MM-DD` del día local; no conviertas a UTC.
- (E3-T2) **`date_trunc('day', occurred_at)` en SQL usa la zona de la sesión (UTC)** y parte los días a las 19:00 de Bogotá. Agrupa con `occurred_at at time zone 'America/Bogota'` (la zona de `shop_settings`) o en TypeScript con `localDay`.
- (E3-T3) **Desactivar, nunca borrar**, servicios y barberos con reservas: las llaves foráneas usan `restrict` a propósito.
- (E3-T4) **`ImageResponse` no entiende variables CSS**: los colores del ícono van como literales; por eso `src/app/icons/` está exento de la prueba de tokens.
- (E3-T5) **Vercel Cron llama con `GET`, no sigue redirecciones y en el plan Hobby corre como máximo una vez al día.** El vencimiento real de apartados ocurre en cada reserva (paso 9); el cron solo limpia.

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
