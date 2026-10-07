/**
 * Time-zone helpers built on Intl only. Opening hours are wall-clock times in the shop's zone;
 * every conversion between a wall clock and an instant goes through this file.
 */

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
}

type WallParts = { year: number; month: number; day: number; hour: number; minute: number };

function wallParts(instant: Date, timeZone: string): WallParts & { second: number } {
  const values: Record<string, number> = {};
  for (const part of partsFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Offset of `timeZone` from UTC at `instant`, in minutes (Bogotá → -300). */
export function offsetMinutes(instant: Date, timeZone: string): number {
  const p = wallParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / MINUTE_MS);
}

/**
 * The instant at which the wall clock in `timeZone` reads `day` `hhmm`. Returns null for a time
 * skipped by a DST jump; for a repeated time returns the first occurrence.
 */
export function wallTimeToInstant(day: string, hhmm: string, timeZone: string): Date | null {
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  const candidates = [
    guess - offsetMinutes(new Date(guess - DAY_MS), timeZone) * MINUTE_MS,
    guess - offsetMinutes(new Date(guess + DAY_MS), timeZone) * MINUTE_MS,
  ];
  const matches = candidates.filter((ms) => {
    const p = wallParts(new Date(ms), timeZone);
    return p.year === y && p.month === m && p.day === d && p.hour === h && p.minute === min;
  });
  if (matches.length === 0) return null;
  return new Date(Math.min(...matches));
}

/** Calendar day (`YYYY-MM-DD`) of `instant` in `timeZone`. */
export function localDay(instant: Date, timeZone: string): string {
  const p = wallParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Day of the week of a calendar day: 0 = domingo … 6 = sábado. */
export function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Calendar arithmetic on `YYYY-MM-DD`, independent of any time zone. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + n));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** `"HH:MM"` (or `"HH:MM:SS"`) → minutes since midnight. */
export function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight → `"HH:MM"`. */
export function hhmmOf(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** e.g. "lunes, 5 de octubre de 2026, 9:00 a. m." */
export function formatDateTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(instant);
}

/** e.g. "9:00 a. m." */
export function formatTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", { timeZone, timeStyle: "short" }).format(instant);
}

/** Minutes since local midnight of `instant` in `timeZone` (9:30 a. m. → 570). */
export function localMinutes(instant: Date, timeZone: string): number {
  const p = wallParts(instant, timeZone);
  return p.hour * 60 + p.minute;
}
