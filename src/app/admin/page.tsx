import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { legalGaps } from "@/lib/legal";
import { formatCop } from "@/lib/money";
import { addDays, formatDateTime, formatTime, localDay } from "@/lib/time";
import { type AgendaItem, getAgenda, getShopTimeZone } from "@/server/admin/agenda";
import { getLegalInfo } from "@/server/shop";
import { cancelarComoDueno, cobrar, marcarNoVino, reprogramarComoDueno } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<AgendaItem["status"], string> = {
  held: "Pendiente de pago",
  confirmed: "Confirmada",
  completed: "Atendida",
  no_show: "No vino",
};

const ERRORS: Record<string, string> = {
  invalid_input: "Revisa los datos del formulario.",
  slot_taken: "Ese horario se cruza con otra cita.",
  invalid_state: "Esa cita ya no se puede cambiar.",
  not_found: "No encontramos esa cita.",
};

const navLink =
  "inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const input = "min-h-11 w-full rounded-control border border-border bg-surface px-3";

function amountDue(item: AgendaItem): number {
  return item.depositStatus === "paid" ? item.priceCop - item.depositCop : item.priceCop;
}

function wallClock(instant: Date, timeZone: string): string {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
  return `${localDay(instant, timeZone)}T${time}`;
}

function whatsappUrl(item: AgendaItem, timeZone: string): string {
  const text = `Hola ${item.customerName}, te escribimos de la barbería sobre tu cita del ${formatDateTime(item.startsAt, timeZone)}.`;
  return `https://wa.me/${item.customerPhone}?text=${encodeURIComponent(text)}`;
}

export default async function AdminAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; error?: string }>;
}) {
  const params = await searchParams;
  const timeZone = await getShopTimeZone();
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? "")
    ? (params.dia as string)
    : localDay(new Date(), timeZone);
  const agenda = await getAgenda(day);
  const error = params.error ? (ERRORS[params.error] ?? "No se pudo completar la acción.") : null;
  const empty = agenda.groups.every((group) => group.items.length === 0);
  const gaps = legalGaps(await getLegalInfo());

  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Agenda</h1>
      {gaps.length > 0 ? (
        <p role="status" className="rounded-card border border-border bg-surface p-4">
          Faltan datos en la política de datos y los términos: {gaps.join(", ")}.{" "}
          <Link href="/admin/ajustes" className="underline">
            Complétalos en Ajustes
          </Link>
          .
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin?dia=${addDays(day, -1)}`} className={navLink}>
          Anterior
        </Link>
        <form className="flex items-center gap-2">
          <label htmlFor="dia" className="sr-only">
            Día
          </label>
          <input id="dia" name="dia" type="date" defaultValue={day} className={input} />
          <Button type="submit" variant="secondary">
            Ver
          </Button>
        </form>
        <Link href={`/admin?dia=${addDays(day, 1)}`} className={navLink}>
          Siguiente
        </Link>
      </div>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      {empty ? <p className="text-fg-muted">No hay citas para este día.</p> : null}

      {agenda.groups
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <div key={group.barberId} className="space-y-2">
            <h2 className="font-display text-2xl tracking-tight">{group.barberName}</h2>
            {group.items.map((item) => (
              <Card key={item.id}>
                <p className="font-medium">
                  {formatTime(item.startsAt, timeZone)} · {item.customerName}
                </p>
                <p className="text-fg-muted">
                  {item.serviceName} · {formatCop(item.priceCop)} · {STATUS[item.status]}
                </p>
                <a href={whatsappUrl(item, timeZone)} className="mt-1 inline-block underline">
                  WhatsApp
                </a>
                {item.status === "confirmed" ? (
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <form action={cobrar} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="dia" value={day} />
                      <input type="hidden" name="bookingId" value={item.id} />
                      <label className="space-y-1">
                        <span className="block">Cobrar {formatCop(amountDue(item))} con</span>
                        <select name="metodo" defaultValue="cash" className={input}>
                          <option value="cash">Efectivo</option>
                          <option value="nequi">Nequi</option>
                          <option value="daviplata">Daviplata</option>
                          <option value="card">Tarjeta</option>
                          <option value="transfer">Transferencia</option>
                        </select>
                      </label>
                      <Button type="submit">Cobrar</Button>
                    </form>
                    <form action={marcarNoVino}>
                      <input type="hidden" name="dia" value={day} />
                      <input type="hidden" name="bookingId" value={item.id} />
                      <Button type="submit" variant="secondary">
                        No vino
                      </Button>
                    </form>
                  </div>
                ) : null}
                {item.status === "confirmed" ? (
                  <details className="mt-3">
                    <summary className="min-h-11 cursor-pointer py-2 font-medium">
                      Reprogramar o cancelar
                    </summary>
                    <form action={reprogramarComoDueno} className="mt-2 space-y-2">
                      <input type="hidden" name="dia" value={day} />
                      <input type="hidden" name="bookingId" value={item.id} />
                      <label className="block space-y-1">
                        <span className="block">Nueva fecha y hora</span>
                        <input
                          name="fechaHora"
                          type="datetime-local"
                          required
                          defaultValue={wallClock(item.startsAt, timeZone)}
                          className={input}
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="block">Barbero</span>
                        <select name="barberId" defaultValue={group.barberId} className={input}>
                          {agenda.groups.map((option) => (
                            <option key={option.barberId} value={option.barberId}>
                              {option.barberName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button type="submit" variant="secondary">
                        Reprogramar
                      </Button>
                    </form>
                    <form action={cancelarComoDueno} className="mt-4 space-y-2">
                      <input type="hidden" name="dia" value={day} />
                      <input type="hidden" name="bookingId" value={item.id} />
                      {item.depositStatus === "paid" ? (
                        <fieldset className="space-y-1">
                          <legend>Anticipo de {formatCop(item.depositCop)}</legend>
                          <label className="flex min-h-11 items-center gap-2">
                            <input type="radio" name="anticipo" value="refund" defaultChecked />
                            Devolver al cliente
                          </label>
                          <label className="flex min-h-11 items-center gap-2">
                            <input type="radio" name="anticipo" value="forfeit" />
                            Se queda en la barbería
                          </label>
                        </fieldset>
                      ) : null}
                      <Button type="submit" variant="danger">
                        Cancelar cita
                      </Button>
                    </form>
                  </details>
                ) : null}
              </Card>
            ))}
          </div>
        ))}
    </section>
  );
}
