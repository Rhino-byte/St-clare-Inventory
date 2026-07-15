/** Business calendar timezone for St Clare (East Africa). */
export const APP_TIME_ZONE = "Africa/Nairobi";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Format a Date as YYYY-MM-DD in the app timezone. */
export function formatDateKeyInAppTz(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shift a YYYY-MM-DD key by whole calendar days (timezone-safe). */
export function addCalendarDays(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

/** Inclusive list of YYYY-MM-DD keys from → to. */
export function dateKeysInclusive(fromKey: string, toKey: string): string[] {
  if (!fromKey || !toKey || fromKey > toKey) return [];
  const keys: string[] = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    keys.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return keys;
}

/** Local (app) calendar day as YYYY-MM-DD. */
export function todayDateKey(now = new Date()): string {
  return formatDateKeyInAppTz(now);
}

/**
 * Map a transaction timestamp to the app-timezone calendar day.
 * ISO strings with Z are converted via Africa/Nairobi (not UTC slice).
 */
export function transactionDateKey(timestamp: string): string {
  const value = timestamp?.trim() ?? "";
  if (!value) return "";

  if (DATE_RE.test(value)) return value;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateKeyInAppTz(parsed);
  }

  return value.slice(0, 10);
}

/** Inclusive rolling window ending today: `days` calendar days (1 = today only). */
export function rollingDateRange(
  days: number,
  now = new Date()
): { from: string; to: string } {
  const to = todayDateKey(now);
  if (days <= 1) {
    return { from: to, to };
  }
  return { from: addCalendarDays(to, -(days - 1)), to };
}

export function isDateKeyInRange(
  dateKey: string,
  fromKey: string,
  toKey: string
): boolean {
  return !!dateKey && dateKey >= fromKey && dateKey <= toKey;
}
