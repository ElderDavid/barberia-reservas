import { pathToFileURL } from "node:url";
import { ownerEnv } from "../src/lib/env.ts";
import { db, sqlClient } from "../src/server/db/client.ts";
import {
  barbers,
  expenseCategories,
  services,
  shopSettings,
  workingHours,
} from "../src/server/db/schema.ts";
import { ensureOwner } from "./create-owner.ts";

const EXPENSE_CATEGORIES = [
  "Arriendo",
  "Productos",
  "Servicios públicos",
  "Nómina",
  "Mantenimiento",
  "Otros",
];

/** Demo shop data plus the owner account. Safe to run any number of times. */
export async function seed(): Promise<void> {
  await db
    .insert(shopSettings)
    .values({ id: 1, name: "Barbería", whatsappPhone: "573001112233", address: "" })
    .onConflictDoNothing();

  if ((await db.select({ id: barbers.id }).from(barbers).limit(1)).length === 0) {
    await db.insert(barbers).values([
      { name: "Andrés", sortOrder: 1 },
      { name: "Camilo", sortOrder: 2 },
    ]);
  }

  if ((await db.select({ id: services.id }).from(services).limit(1)).length === 0) {
    await db.insert(services).values([
      { name: "Corte clásico", durationMinutes: 30, priceCop: 15000, sortOrder: 1 },
      { name: "Corte + barba", durationMinutes: 45, priceCop: 25000, sortOrder: 2 },
      { name: "Barba", durationMinutes: 20, priceCop: 10000, sortOrder: 3 },
    ]);
  }

  const allBarbers = await db.select({ id: barbers.id }).from(barbers);
  const hours = allBarbers.flatMap((barber) =>
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      barberId: barber.id,
      weekday,
      startTime: "09:00",
      endTime: "19:00",
    })),
  );
  if (hours.length > 0) await db.insert(workingHours).values(hours).onConflictDoNothing();

  await db
    .insert(expenseCategories)
    .values(EXPENSE_CATEGORIES.map((name) => ({ name })))
    .onConflictDoNothing();

  const env = ownerEnv();
  await ensureOwner({ name: env.OWNER_NAME, email: env.OWNER_EMAIL, password: env.OWNER_PASSWORD });
}

// True only when run as `node scripts/seed.ts`; false when imported by tests.
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  await seed();
  console.log("seed: ok");
  await sqlClient.end();
}
