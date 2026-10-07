import { weekdayOf } from "./time.ts";

/**
 * Lays out consecutive calendar days in a Monday-first week grid: leading `null` cells push the
 * first day under its weekday column, and trailing ones complete the last week.
 */
export function calendarCells(days: string[]): (string | null)[] {
  if (days.length === 0) return [];
  const lead = (weekdayOf(days[0]) + 6) % 7;
  const cells: (string | null)[] = [...Array.from({ length: lead }, () => null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** "octubre de 2026" or "octubre – noviembre de 2026" for the months the days span. */
export function monthsLabel(days: string[]): string {
  if (days.length === 0) return "";
  const format = (day: string, withYear: boolean) => {
    const [y, m] = day.split("-").map(Number);
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: "UTC",
      month: "long",
      ...(withYear ? { year: "numeric" } : {}),
    }).format(new Date(Date.UTC(y, m - 1, 15)));
  };
  const first = days[0];
  const last = days[days.length - 1];
  if (first.slice(0, 7) === last.slice(0, 7)) return format(first, true);
  if (first.slice(0, 4) === last.slice(0, 4))
    return `${format(first, false)} – ${format(last, true)}`;
  return `${format(first, true)} – ${format(last, true)}`;
}

/** The part of the day a slot falls in, by local minutes since midnight. */
export function dayPart(minutes: number): "Mañana" | "Tarde" | "Noche" {
  if (minutes < 12 * 60) return "Mañana";
  if (minutes < 18 * 60) return "Tarde";
  return "Noche";
}
