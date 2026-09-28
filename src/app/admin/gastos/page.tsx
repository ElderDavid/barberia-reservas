import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { formatCop } from "@/lib/money";
import { addDays, localDay } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { listCategories, listExpenses } from "@/server/admin/expenses";
import { borrarGasto, cambiarEstadoCategoria, crearCategoria, registrarGasto } from "./actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid_input: "Revisa la categoría, el monto y la fecha.",
  duplicate: "Ya existe una categoría con ese nombre.",
};

const METHODS: Record<string, string> = {
  cash: "Efectivo",
  nequi: "Nequi",
  daviplata: "Daviplata",
  card: "Tarjeta",
  transfer: "Transferencia",
};

const control = "min-h-11 w-full rounded-control border border-border bg-surface px-3";
const navLink =
  "inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-4";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 15)));
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; error?: string }>;
}) {
  const params = await searchParams;
  const today = localDay(new Date(), await getShopTimeZone());
  const month = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? (params.mes as string) : today.slice(0, 7);
  const from = `${month}-01`;
  const to = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const [lines, active, all] = await Promise.all([
    listExpenses({ from, to }),
    listCategories({ activeOnly: true }),
    listCategories({ activeOnly: false }),
  ]);
  const total = lines.reduce((sum, line) => sum + line.amountCop, 0);
  const error = params.error ? ERRORS[params.error] : undefined;

  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Gastos</h1>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}

      <Card title="Registrar gasto">
        <form action={registrarGasto} className="mt-3 space-y-3">
          <input type="hidden" name="mes" value={month} />
          <label className="block space-y-1">
            <span className="block font-medium">Categoría</span>
            <select name="categoria" required className={control}>
              {active.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Monto" name="monto" inputMode="numeric" required />
          <Field label="Fecha" name="fecha" type="date" defaultValue={today} required />
          <label className="block space-y-1">
            <span className="block font-medium">Método de pago</span>
            <select name="metodo" defaultValue="cash" className={control}>
              {Object.entries(METHODS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Field label="Descripción" name="descripcion" />
          <Button type="submit">Registrar gasto</Button>
        </form>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/gastos?mes=${shiftMonth(month, -1)}`} className={navLink}>
          Mes anterior
        </Link>
        <span className="font-medium first-letter:uppercase">{monthLabel(month)}</span>
        <Link href={`/admin/gastos?mes=${shiftMonth(month, 1)}`} className={navLink}>
          Mes siguiente
        </Link>
      </div>

      <Card title={`Total del mes: ${formatCop(total)}`}>
        {lines.length === 0 ? (
          <p className="mt-2 text-fg-muted">No hay gastos en este mes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {lines.map((line) => (
              <li key={line.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {line.spentOn} · {line.categoryName} · {METHODS[line.method] ?? line.method}
                  {line.description ? ` · ${line.description}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {formatCop(line.amountCop)}
                  <form action={borrarGasto}>
                    <input type="hidden" name="mes" value={month} />
                    <input type="hidden" name="id" value={line.id} />
                    <Button type="submit" variant="danger">
                      Borrar
                    </Button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Categorías">
        <ul className="mt-3 space-y-2">
          {all.map((category) => (
            <li key={category.id} className="flex items-center justify-between gap-2">
              <span className={category.active ? "" : "text-fg-muted"}>
                {category.name}
                {category.active ? "" : " (inactiva)"}
              </span>
              <form action={cambiarEstadoCategoria}>
                <input type="hidden" name="mes" value={month} />
                <input type="hidden" name="id" value={category.id} />
                <input type="hidden" name="activa" value={category.active ? "no" : "si"} />
                <Button type="submit" variant="secondary">
                  {category.active ? "Desactivar" : "Reactivar"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
        <form action={crearCategoria} className="mt-4 space-y-2">
          <input type="hidden" name="mes" value={month} />
          <Field label="Nueva categoría" name="nombre" required />
          <Button type="submit" variant="secondary">
            Crear categoría
          </Button>
        </form>
      </Card>
    </section>
  );
}
