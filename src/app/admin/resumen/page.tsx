import Link from "next/link";
import { BarList } from "@/components/charts/bar-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCop } from "@/lib/money";
import { addDays, localDay, weekdayOf } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { getMetrics } from "@/server/admin/metrics";

export const dynamic = "force-dynamic";

const METHODS: Record<string, string> = {
  cash: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  card: "Tarjeta",
  transfer: "Transferencia",
  wompi: "Wompi",
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const shortcut =
  "inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-4";
const control = "min-h-11 w-full rounded-control border border-border bg-surface px-3";

function monthEnd(day: string): string {
  const [y, m] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1));
  const first = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return addDays(first, -1);
}

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const params = await searchParams;
  const today = localDay(new Date(), await getShopTimeZone());
  const monthStart = `${today.slice(0, 7)}-01`;
  const weekStart = addDays(today, -((weekdayOf(today) + 6) % 7)); // lunes
  const from = DAY.test(params.desde ?? "") ? (params.desde as string) : monthStart;
  const to = DAY.test(params.hasta ?? "") ? (params.hasta as string) : monthEnd(today);
  const m = await getMetrics({ from, to });

  const tiles = [
    { label: "Clientes atendidos", value: String(m.customersServed) },
    { label: "Recaudado", value: formatCop(m.collectedCop) },
    { label: "Gastado", value: formatCop(m.spentCop) },
    { label: "Ganancia", value: formatCop(m.profitCop), negative: m.profitCop < 0 },
    { label: "No vinieron", value: String(m.noShows) },
  ];

  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Resumen</h1>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/resumen?desde=${today}&hasta=${today}`} className={shortcut}>
          Hoy
        </Link>
        <Link
          href={`/admin/resumen?desde=${weekStart}&hasta=${addDays(weekStart, 6)}`}
          className={shortcut}
        >
          Esta semana
        </Link>
        <Link href="/admin/resumen" className={shortcut}>
          Este mes
        </Link>
      </div>
      <form className="grid grid-cols-2 items-end gap-2 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="block">Desde</span>
          <input name="desde" type="date" defaultValue={from} className={control} />
        </label>
        <label className="space-y-1">
          <span className="block">Hasta</span>
          <input name="hasta" type="date" defaultValue={to} className={control} />
        </label>
        <Button type="submit" variant="secondary">
          Ver
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <p className="text-sm text-fg-muted">{tile.label}</p>
            <p className={`text-xl font-semibold ${tile.negative ? "text-destructive" : ""}`}>
              {tile.value}
            </p>
          </Card>
        ))}
      </div>

      <Card title="Ingresos por medio de pago">
        <div className="mt-3">
          <BarList
            items={m.byMethod.map((r) => ({
              label: METHODS[r.method] ?? r.method,
              value: r.totalCop,
            }))}
            format={formatCop}
          />
        </div>
      </Card>
      <Card title="Gastos por categoría">
        <div className="mt-3">
          <BarList
            items={m.expensesByCategory.map((r) => ({ label: r.category, value: r.totalCop }))}
            format={formatCop}
          />
        </div>
      </Card>
      <Card title="Recaudado por día">
        <div className="mt-3">
          <BarList
            items={m.byDay.map((r) => ({ label: r.day, value: r.totalCop }))}
            format={formatCop}
          />
        </div>
      </Card>
      <Card title="Recaudado por barbero">
        <div className="mt-3">
          <BarList
            items={m.byBarber.map((r) => ({ label: r.barber, value: r.totalCop }))}
            format={formatCop}
          />
        </div>
      </Card>
      <Link href="/admin/ventas" className="inline-block underline">
        Reembolsos pendientes
      </Link>
    </section>
  );
}
