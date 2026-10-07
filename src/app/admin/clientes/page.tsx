import Link from "next/link";
import { Stars } from "@/components/site/reviews/stars";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/time";
import { getShopTimeZone } from "@/server/admin/agenda";
import { listClients } from "@/server/admin/clients";

export const dynamic = "force-dynamic";

function visitsLine(visits: number): string {
  return visits === 1 ? "1 visita" : `${visits} visitas`;
}

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 60) : "";
  const [clients, timeZone] = await Promise.all([listClients(query), getShopTimeZone()]);

  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Clientes</h1>
      <search>
        <form className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <label htmlFor="q" className="block font-medium">
              Buscar por nombre o celular
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={60}
              className="min-h-11 w-full rounded-control border border-border bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </div>
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </form>
      </search>
      {clients.length === 0 ? (
        <p className="text-fg-muted">
          {query ? `No hay clientes que coincidan con “${query}”.` : "Aún no hay clientes."}
        </p>
      ) : (
        <ul className="divide-y divide-hairline rounded-card border border-hairline bg-surface">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/admin/clientes/${client.id}`}
                className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{client.name}</span>
                    {client.userId ? (
                      <span className="rounded-control border border-border px-2 py-0.5 text-xs">
                        Con cuenta
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm text-fg-muted">
                    {visitsLine(client.visits)}
                    {client.lastVisit
                      ? `, la última el ${formatDate(client.lastVisit, timeZone)}`
                      : ""}
                    {client.stamps !== null ? `. Sellos: ${client.stamps}` : ""}
                  </span>
                  {client.averageGiven !== null ? (
                    <span className="flex items-center gap-2 text-sm text-fg-muted">
                      Califica en promedio
                      <Stars rating={client.averageGiven} size="sm" />
                    </span>
                  ) : null}
                </span>
                <Icon name="chevron" className="size-5 shrink-0 text-fg-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
