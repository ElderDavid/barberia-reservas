import { addDays, hhmmOf, localDay, minutesOf, wallTimeToInstant } from "../../lib/time.ts";

export type Window = { start: string; end: string }; // "HH:MM" wall clock, already filtered to the day's weekday
export type Busy = { from: Date; until: Date }; // half-open [from, until)
export type SlotInput = {
  timeZone: string;
  day: string; // "YYYY-MM-DD" in timeZone
  windows: Window[];
  busy: Busy[]; // bookings (blocked_from..blocked_until) and time off
  durationMinutes: number;
  bufferAfterMinutes: number;
  intervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  now: Date;
};

const MINUTE_MS = 60_000;

/** Bookable start instants for one barber on one day, ascending. Pure: `now` is an input. */
export function generateSlots(input: SlotInput): Date[] {
  if (input.day > addDays(localDay(input.now, input.timeZone), input.maxAdvanceDays)) return [];

  const earliest = input.now.getTime() + input.minNoticeMinutes * MINUTE_MS;
  const blockMs = (input.durationMinutes + input.bufferAfterMinutes) * MINUTE_MS;
  const found = new Set<number>();

  for (const window of input.windows) {
    const end = minutesOf(window.end);
    for (
      let start = minutesOf(window.start);
      start + input.durationMinutes <= end;
      start += input.intervalMinutes
    ) {
      const instant = wallTimeToInstant(input.day, hhmmOf(start), input.timeZone);
      if (!instant) continue;
      const from = instant.getTime();
      if (from < earliest) continue;
      const until = from + blockMs;
      const overlaps = input.busy.some(
        (busy) => from < busy.until.getTime() && busy.from.getTime() < until,
      );
      if (!overlaps) found.add(from);
    }
  }

  return [...found].sort((a, b) => a - b).map((ms) => new Date(ms));
}
