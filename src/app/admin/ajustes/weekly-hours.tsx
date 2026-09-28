import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { guardarHorario } from "./actions";

const DAYS = [
  { weekday: 1, label: "Lunes" },
  { weekday: 2, label: "Martes" },
  { weekday: 3, label: "Miércoles" },
  { weekday: 4, label: "Jueves" },
  { weekday: 5, label: "Viernes" },
  { weekday: 6, label: "Sábado" },
  { weekday: 0, label: "Domingo" },
];

const time = "min-h-11 rounded-control border border-border bg-surface px-2";

export type WeeklyHoursProps = {
  barberId: string;
  barberName: string;
  hours: { weekday: number; startTime: string; endTime: string }[];
};

/** One barber's week: per day either "Cerrado" or a start and end time. */
export function WeeklyHours({ barberId, barberName, hours }: WeeklyHoursProps) {
  return (
    <Card title={`Horario semanal · ${barberName}`}>
      <form action={guardarHorario} className="mt-3 space-y-2">
        <input type="hidden" name="barberId" value={barberId} />
        {DAYS.map((day) => {
          const range = hours.find((h) => h.weekday === day.weekday);
          return (
            <fieldset key={day.weekday} className="flex flex-wrap items-center gap-2">
              <legend className="w-24 font-medium">{day.label}</legend>
              <label className="flex min-h-11 items-center gap-1">
                <input
                  type="checkbox"
                  name={`cerrado_${day.weekday}`}
                  value="si"
                  defaultChecked={!range}
                />
                Cerrado
              </label>
              <label className="flex items-center gap-1">
                <span className="sr-only">{day.label}: inicio</span>
                <input
                  type="time"
                  name={`inicio_${day.weekday}`}
                  defaultValue={range?.startTime.slice(0, 5) ?? "09:00"}
                  className={time}
                />
              </label>
              <span aria-hidden="true">a</span>
              <label className="flex items-center gap-1">
                <span className="sr-only">{day.label}: fin</span>
                <input
                  type="time"
                  name={`fin_${day.weekday}`}
                  defaultValue={range?.endTime.slice(0, 5) ?? "19:00"}
                  className={time}
                />
              </label>
            </fieldset>
          );
        })}
        <Button type="submit" variant="secondary">
          Guardar horario
        </Button>
      </form>
    </Card>
  );
}
