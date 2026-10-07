/**
 * The customer's bookings, remembered only on their own phone (localStorage): there are no
 * customer accounts, so the private `/cita/<token>` link is what identifies a booking.
 */
export type SavedBooking = { path: string; title: string; when: string };

const KEY = "barberia:citas";
const MAX = 10;

/** Newest first, without duplicates by path, capped at `MAX`. */
export function mergeSaved(list: SavedBooking[], booking: SavedBooking): SavedBooking[] {
  return [booking, ...list.filter((item) => item.path !== booking.path)].slice(0, MAX);
}

function isSaved(value: unknown): value is SavedBooking {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.path === "string" &&
    item.path.startsWith("/cita/") &&
    typeof item.title === "string" &&
    typeof item.when === "string"
  );
}

/** Parses what was stored, dropping anything malformed. */
export function parseSaved(raw: string | null): SavedBooking[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isSaved).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function readSaved(): SavedBooking[] {
  try {
    return parseSaved(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function rememberBooking(booking: SavedBooking): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(mergeSaved(readSaved(), booking)));
  } catch {
    // Private mode or storage blocked: the booking page still works, it just is not listed.
  }
}

export function forgetBooking(path: string): SavedBooking[] {
  const next = readSaved().filter((item) => item.path !== path);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Nothing to do: the list simply stays as it was.
  }
  return next;
}
