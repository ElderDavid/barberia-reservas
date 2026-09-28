import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { formatCop } from "@/lib/money";
import { formatDateTime, formatTime, localDay } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { listPendingRefunds, listSales, type SaleLine } from "@/server/admin/sales";
import { getBookingOptions } from "@/server/booking/create";
import { marcarReembolsado, registrarVentaSinCita } from "../actions";

export const dynamic = "force-dynamic";

const KINDS: Record<SaleLine["kind"], string> = {
  deposit: "Anticipo en línea",
  balance: "Cobro de cita",
  walk_in: "Venta sin cita",
  refund: "Devolución",
};

const METHODS: Record<string, string> = {
  cash: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  card: "Tarjeta",
  transfer: "Transferencia",
  wompi: "Wompi",
};

const select = "min-h-11 w-full rounded-control border border-border bg-surface px-3";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const timeZone = await getShopTimeZone();
  const today = localDay(new Date(), timeZone);
  const [lines, refunds, options] = await Promise.all([
    listSales(today),
    listPendingRefunds(),
    getBookingOptions(),
  ]);
  const total = lines.reduce((sum, line) => sum + line.amountCop, 0);

  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Ventas</h1>
      {params.error ? (
        <p role="alert" className="text-destructive">
          Revisa el monto y el método de pago.
        </p>
      ) : null}
      {params.ok ? (
        <p role="status" className="text-success">
          Venta registrada.
        </p>
      ) : null}

      <Card title="Venta sin cita">
        <form action={registrarVentaSinCita} className="mt-3 space-y-3">
          <Field label="Monto" name="monto" inputMode="numeric" required hint="Por ejemplo 15000" />
          <label className="block space-y-1">
            <span className="block font-medium">Método de pago</span>
            <select name="metodo" defaultValue="cash" className={select}>
              <option value="cash">Efectivo</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="block font-medium">Servicio (opcional)</span>
            <select name="servicio" defaultValue="" className={select}>
              <option value="">Sin servicio</option>
              {options.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="block font-medium">Barbero (opcional)</span>
            <select name="barbero" defaultValue="" className={select}>
              <option value="">Sin barbero</option>
              {options.barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Nota (opcional)" name="nota" />
          <Button type="submit">Registrar venta</Button>
        </form>
      </Card>

      <Card title="Reembolsos pendientes">
        {refunds.length === 0 ? (
          <p className="mt-2 text-fg-muted">No hay reembolsos pendientes.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {refunds.map((refund) => (
              <li key={refund.bookingId} className="space-y-1">
                <p className="font-medium">
                  {refund.customerName} · {refund.customerPhone} · {formatCop(refund.depositCop)}
                </p>
                <p className="text-sm text-fg-muted">
                  Cita del {formatDateTime(refund.startsAt, timeZone)}
                </p>
                <form action={marcarReembolsado}>
                  <input type="hidden" name="bookingId" value={refund.bookingId} />
                  <Button type="submit" variant="secondary">
                    Marcar como devuelto
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Ventas de hoy">
        {lines.length === 0 ? (
          <p className="mt-2 text-fg-muted">No hay ventas registradas hoy.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-2 py-2">
                <span>
                  {formatTime(line.occurredAt, timeZone)} · {KINDS[line.kind]} ·{" "}
                  {METHODS[line.method] ?? line.method}
                  {line.serviceName ? ` · ${line.serviceName}` : ""}
                </span>
                <span className={line.amountCop < 0 ? "text-destructive" : ""}>
                  {formatCop(line.amountCop)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 font-semibold">Total: {formatCop(total)}</p>
      </Card>
    </section>
  );
}
