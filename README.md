# Barbería — reservas y control

Aplicación web para una barbería en Colombia. Los clientes reservan su cita desde el celular, sin
crear cuenta, y pagan en efectivo o por transferencia (Wompi: Nequi, PSE o tarjeta). El dueño
gestiona la agenda, los cobros, los gastos y ve un resumen de cómo va el negocio.

Se puede instalar en el celular como una app (PWA) y todo el texto está en español de Colombia.

## Qué hace

**Para los clientes**

- Ver la portada con los servicios, precios, dirección y un botón de WhatsApp.
- Reservar una cita: elegir servicio, barbero (o «cualquiera»), día y hora disponibles.
- Pagar en efectivo en la barbería o por transferencia con Wompi.
- Cancelar o cambiar la cita desde un enlace privado, hasta unas horas antes (4 h por defecto).
- Leer la política de tratamiento de datos (Ley 1581 de 2012).

**Para el dueño** (entra en `/entrar` con su correo y clave)

- **Agenda:** citas del día por barbero; cobrar, marcar «No vino», cambiar o cancelar citas.
- **Ventas:** registrar ventas sin cita y reembolsos pendientes.
- **Gastos:** registrar gastos por categoría.
- **Resumen:** ingresos, gastos y ganancia por período.
- **Ajustes:** datos de la barbería, servicios, barberos, horarios y días libres.

Dos clientes nunca pueden quedar en la misma hora con el mismo barbero: la base de datos lo impide.

## Tecnología

Next.js 16 · TypeScript · Tailwind CSS 4 · Postgres (Docker en local, Supabase en producción) ·
Drizzle ORM · better-auth · Wompi · Vercel. Node 24 y pnpm 11.

## Correrla en tu computador

Necesitas [Node 24](https://nodejs.org), [pnpm](https://pnpm.io) y
[Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
pnpm install            # instala las dependencias
cp .env.example .env    # crea tu archivo de configuración local
pnpm db:up              # enciende la base de datos (Docker)
pnpm db:migrate         # crea las tablas
pnpm db:seed            # carga datos de ejemplo y la cuenta del dueño
pnpm dev                # abre la app en http://localhost:3000
```

La cuenta del dueño usa `OWNER_EMAIL` y `OWNER_PASSWORD` de tu archivo `.env`.

## Comandos útiles

| Para qué | Comando |
|---|---|
| Encender / apagar la base de datos | `pnpm db:up` · `pnpm db:down` |
| Servidor de desarrollo | `pnpm dev` |
| Revisar el código | `pnpm lint` · `pnpm typecheck` |
| Dar formato al código | `pnpm format` |
| Pruebas (unitarias + integración) | `pnpm test` |
| Pruebas en navegador simulando un celular | `pnpm test:e2e` |
| Compilar para producción | `pnpm build` |
| Borrar y recrear la base local | `pnpm db:reset` |
| Crear o actualizar la cuenta del dueño | `pnpm owner:create` |

Cada cambio que se sube a GitHub pasa por una revisión automática (`.github/workflows/ci.yml`)
que corre todas estas pruebas.

## Configuración (`.env`)

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a la base de datos |
| `TEST_DATABASE_URL`, `E2E_DATABASE_URL` | Bases para las pruebas |
| `APP_URL` | Dirección pública de la app |
| `BETTER_AUTH_SECRET` | Firma de las sesiones (32 caracteres o más) |
| `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` | Cuenta del dueño |
| `WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Pagos con Wompi |
| `CRON_SECRET` | Protege la limpieza diaria de apartados vencidos |
| `MIGRATION_DATABASE_URL` | Solo en producción, para aplicar cambios a la base |

El archivo `.env` nunca se sube a GitHub.

## Publicarla

1. **Supabase:** crea un proyecto (región São Paulo) y copia las dos direcciones de conexión
   (*Transaction pooler* para `DATABASE_URL` y *Session pooler* para `MIGRATION_DATABASE_URL`).
2. **Wompi:** en Desarrolladores copia la llave pública y los secretos de integridad y de eventos.
   Configura la URL de eventos como `https://<tu-dominio>/api/webhooks/wompi`.
3. **Vercel:** importa este repositorio, pega las variables de la tabla anterior y despliega.
   `vercel.json` aplica las migraciones en producción y programa la limpieza diaria.
4. Crea la cuenta del dueño con `pnpm owner:create` apuntando a la base de producción.
5. (Opcional) Conecta tu dominio propio en Vercel.

## Estructura

```
src/app/          páginas y acciones (público, /admin, /api)
src/components/   componentes visuales
src/server/       reglas del negocio y base de datos
src/lib/          utilidades (horas, dinero, configuración)
drizzle/          migraciones de la base de datos
scripts/          semilla, reinicio de la base y cuenta del dueño
tests/            pruebas unitarias, de integración y en navegador
blueprints/       plan original del proyecto (17 pasos)
```

Las reglas para trabajar en el código están en [`CLAUDE.md`](CLAUDE.md).
