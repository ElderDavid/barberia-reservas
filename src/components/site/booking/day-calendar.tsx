import Link from "next/link";
import { calendarCells, monthsLabel } from "@/lib/calendar";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const WEEKDAY_NAMES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/** "lunes 5 de octubre" for a calendar day (formatted at UTC noon, so no zone can shift it). */
function dayName(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** The bookable days as a month calendar; empty cells keep each day under its weekday. */
export function DayCalendar({
  days,
  today,
  hrefFor,
}: {
  days: string[];
  today: string;
  hrefFor: (day: string) => string;
}) {
  const cells = calendarCells(days);
  return (
    <div className="mt-4">
      <p className="mb-3 font-medium first-letter:uppercase">{monthsLabel(days)}</p>
      <div aria-hidden="true" className="grid grid-cols-7 text-center text-xs text-fg-muted">
        {WEEKDAYS.map((label, i) => (
          <span key={WEEKDAY_NAMES[i]} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <ul className="grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day ? (
            <li key={day}>
              <Link
                href={hrefFor(day)}
                aria-label={dayName(day) + (day === today ? " (hoy)" : "")}
                className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-full border text-sm hover:border-fg hover:bg-primary hover:text-primary-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out active:scale-90 ${
                  day === today ? "border-primary font-semibold" : "border-transparent"
                }`}
              >
                {Number(day.slice(8))}
              </Link>
            </li>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: padding cells have no identity
            <li key={`vacio-${i}`} aria-hidden="true" />
          ),
        )}
      </ul>
    </div>
  );
}
