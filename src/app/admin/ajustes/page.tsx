import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { formatDateTime } from "@/lib/time";
import { getSettingsData } from "@/server/admin/settings";
import {
  agregarDiaLibre,
  guardarBarberia,
  guardarBarbero,
  guardarDatosLegales,
  guardarServicio,
  quitarDiaLibre,
} from "./actions";
import { LoyaltySettings } from "./loyalty-settings";
import { WeeklyHours } from "./weekly-hours";

export const dynamic = "force-dynamic";

const control = "min-h-11 w-full rounded-control border border-border bg-surface px-3";

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const data = await getSettingsData(new Date());
  const shop = data.shop;
  const tz = shop?.timezone ?? "America/Bogota";

  return (
    <section className="space-y-4">
      <h1 className="font-display text-4xl tracking-tight">Ajustes</h1>
      {params.error ? (
        <p role="alert" className="text-destructive">
          Revisa los datos: algún valor está vacío o fuera del rango permitido.
        </p>
      ) : null}
      {params.ok ? (
        <p role="status" className="text-success">
          Cambios guardados.
        </p>
      ) : null}

      <Card title="Barbería">
        <form action={guardarBarberia} className="mt-3 space-y-3">
          <Field label="Nombre" name="nombre" defaultValue={shop?.name} required />
          <Field
            label="WhatsApp"
            name="whatsapp"
            inputMode="numeric"
            defaultValue={shop?.whatsappPhone.replace(/^57/, "")}
            required
          />
          <Field label="Dirección" name="direccion" defaultValue={shop?.address} />
          <Field
            label="Porcentaje de anticipo por transferencia"
            name="anticipo"
            type="number"
            min={10}
            max={100}
            defaultValue={shop?.depositPercent ?? 100}
          />
          <label className="block space-y-1">
            <span className="block font-medium">
              Horas mínimas para que el cliente cancele o cambie
            </span>
            <select
              name="plazo"
              defaultValue={shop?.selfServiceCutoffHours ?? 4}
              className={control}
            >
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </label>
          <Field
            label="Minutos para pagar una reserva por transferencia"
            name="minutosPago"
            type="number"
            min={10}
            max={30}
            defaultValue={shop?.holdMinutes ?? 15}
          />
          <Button type="submit">Guardar</Button>
        </form>
      </Card>

      <Card title="Datos legales">
        <p className="mt-1 text-sm text-fg-muted">
          Aparecen en la{" "}
          <a href="/privacidad" className="underline">
            política de datos
          </a>{" "}
          y en los{" "}
          <a href="/terminos" className="underline">
            términos
          </a>
          . Primero guarda los datos de la barbería.
        </p>
        <form action={guardarDatosLegales} className="mt-3 space-y-3">
          <Field
            label="Nombre del responsable o razón social"
            name="responsable"
            autoComplete="name"
            defaultValue={shop?.legalName}
            required
          />
          <label className="block space-y-1">
            <span className="block font-medium">Tipo de documento</span>
            <select
              name="tipoDocumento"
              defaultValue={shop?.legalIdType || "CC"}
              className={control}
            >
              <option value="CC">Cédula de ciudadanía</option>
              <option value="NIT">NIT</option>
            </select>
          </label>
          <Field
            label="Número de documento"
            name="numeroDocumento"
            inputMode="numeric"
            defaultValue={shop?.legalIdNumber}
            required
          />
          <Field
            label="Correo para temas de datos personales"
            name="correoDatos"
            type="email"
            autoComplete="email"
            defaultValue={shop?.privacyEmail}
            required
          />
          <Button type="submit">Guardar datos legales</Button>
        </form>
      </Card>

      <LoyaltySettings
        goal={shop?.loyaltyGoal ?? 10}
        reward={shop?.loyaltyReward ?? "Un corte gratis"}
      />

      <Card title="Servicios y precios">
        {[...data.services, null].map((service) => (
          <form
            key={service?.id ?? "nuevo"}
            action={guardarServicio}
            className="mt-3 grid grid-cols-2 items-end gap-2 border-t border-border pt-3 sm:grid-cols-3"
          >
            <input type="hidden" name="id" value={service?.id ?? ""} />
            <Field
              label={service ? "Nombre" : "Nuevo servicio"}
              name="nombre"
              defaultValue={service?.name}
            />
            <Field
              label="Precio"
              name="precio"
              inputMode="numeric"
              defaultValue={service?.priceCop}
            />
            <Field
              label="Minutos"
              name="duracion"
              type="number"
              defaultValue={service?.durationMinutes ?? 30}
            />
            <Field
              label="Búfer después"
              name="bufer"
              type="number"
              defaultValue={service?.bufferAfterMinutes ?? 0}
            />
            <Field
              label="Orden"
              name="orden"
              type="number"
              defaultValue={service?.sortOrder ?? 0}
            />
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                name="activo"
                value="si"
                defaultChecked={service?.active ?? true}
              />
              Activo
            </label>
            <Button type="submit" variant="secondary">
              {service ? "Guardar" : "Agregar"}
            </Button>
          </form>
        ))}
      </Card>

      <Card title="Barberos">
        {[...data.barbers, null].map((barber) => (
          <form
            key={barber?.id ?? "nuevo"}
            action={guardarBarbero}
            className="mt-3 grid grid-cols-2 items-end gap-2 border-t border-border pt-3 sm:grid-cols-4"
          >
            <input type="hidden" name="id" value={barber?.id ?? ""} />
            <Field
              label={barber ? "Nombre" : "Nuevo barbero"}
              name="nombre"
              defaultValue={barber?.name}
            />
            <Field label="Orden" name="orden" type="number" defaultValue={barber?.sortOrder ?? 0} />
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                name="activo"
                value="si"
                defaultChecked={barber?.active ?? true}
              />
              Activo
            </label>
            <Button type="submit" variant="secondary">
              {barber ? "Guardar" : "Agregar"}
            </Button>
          </form>
        ))}
      </Card>

      {data.barbers
        .filter((barber) => barber.active)
        .map((barber) => (
          <WeeklyHours
            key={barber.id}
            barberId={barber.id}
            barberName={barber.name}
            hours={data.hours.filter((h) => h.barberId === barber.id)}
          />
        ))}

      <Card title="Días libres">
        {data.timeOff.length === 0 ? (
          <p className="mt-2 text-fg-muted">No hay días libres programados.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.timeOff.map((off) => (
              <li key={off.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {data.barbers.find((b) => b.id === off.barberId)?.name ?? "Toda la barbería"} ·{" "}
                  {formatDateTime(off.startsAt, tz)} → {formatDateTime(off.endsAt, tz)}
                  {off.reason ? ` · ${off.reason}` : ""}
                </span>
                <form action={quitarDiaLibre}>
                  <input type="hidden" name="id" value={off.id} />
                  <Button type="submit" variant="danger">
                    Quitar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={agregarDiaLibre} className="mt-4 grid grid-cols-2 items-end gap-2">
          <label className="col-span-2 block space-y-1">
            <span className="block font-medium">Quién descansa</span>
            <select name="barbero" defaultValue="" className={control}>
              <option value="">Toda la barbería</option>
              {data.barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </label>
          <Field label="Desde" name="desde" type="date" required />
          <Field label="Hasta" name="hasta" type="date" />
          <div className="col-span-2">
            <Field label="Motivo" name="motivo" />
          </div>
          <Button type="submit" variant="secondary">
            Agregar día libre
          </Button>
        </form>
      </Card>
    </section>
  );
}
