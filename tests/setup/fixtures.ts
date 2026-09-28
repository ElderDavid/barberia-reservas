import { sql } from "./db.ts";

export type ShopFixture = {
  barberId: string;
  barber2Id: string;
  serviceId: string;
  customerId: string;
};

/**
 * Minimal shop for integration tests, written with raw SQL against the column names in
 * blueprint §4: settings row, barbers Andrés (sort 1) and Camilo (sort 2), the 30-minute
 * "Corte clásico" at 15000 COP, Monday–Saturday 09:00–19:00 for both, and one customer.
 */
export async function seedShop(): Promise<ShopFixture> {
  await sql`
    insert into shop_settings (id, name, timezone, whatsapp_phone, address, deposit_percent,
      self_service_cutoff_hours, hold_minutes, slot_interval_minutes, min_notice_minutes,
      max_advance_days)
    values (1, 'Barbería Test', 'America/Bogota', '573001112233', 'Calle 1 # 2-3', 100,
      4, 15, 15, 60, 30)
  `;
  const [barber] = await sql<{ id: string }[]>`
    insert into barbers (name, sort_order) values ('Andrés', 1) returning id
  `;
  const [barber2] = await sql<{ id: string }[]>`
    insert into barbers (name, sort_order) values ('Camilo', 2) returning id
  `;
  const [service] = await sql<{ id: string }[]>`
    insert into services (name, duration_minutes, price_cop, buffer_after_minutes, sort_order)
    values ('Corte clásico', 30, 15000, 0, 1) returning id
  `;
  const hours = [barber.id, barber2.id].flatMap((barberId) =>
    [1, 2, 3, 4, 5, 6].map((weekday) => ({
      barber_id: barberId,
      weekday,
      start_time: "09:00",
      end_time: "19:00",
    })),
  );
  await sql`
    insert into working_hours ${sql(hours, "barber_id", "weekday", "start_time", "end_time")}
  `;
  const [customer] = await sql<{ id: string }[]>`
    insert into customers (name, phone, consent_at)
    values ('Cliente Prueba', '573001234567', now()) returning id
  `;
  return {
    barberId: barber.id,
    barber2Id: barber2.id,
    serviceId: service.id,
    customerId: customer.id,
  };
}
