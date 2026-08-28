import type { Weekday } from "@/lib/types";
import { WEEKDAYS } from "@/lib/types";

/** Business calendar timezone for St Clare (East Africa). */
export const APP_TIME_ZONE = "Africa/Nairobi";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_NAME_TO_KEY: Record<string, Weekday> = {
  monday: "monday",
  tuesday: "tuesday",
  wednesday: "wednesday",
  thursday: "thursday",
  friday: "friday",
  saturday: "saturday",
  sunday: "sunday",
};

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

/** Previous calendar day in app timezone. */
export function yesterdayDateKey(now = new Date()): string {
  return addCalendarDays(todayDateKey(now), -1);
}

/** Weekday key (monday–sunday) for a YYYY-MM-DD date in Africa/Nairobi. */
export function weekdayFromDateKey(dateKey: string): Weekday {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekdayName = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
  })
    .format(utcNoon)
    .toLowerCase();

  return WEEKDAY_NAME_TO_KEY[weekdayName] ?? "monday";
}

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
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

/**
 * Equal-length window ending the day before the current rolling `from`.
 * Example: current last 7 days → previous 7 days immediately before that.
 */
export function previousRollingDateRange(
  days: number,
  now = new Date()
): { from: string; to: string } {
  const span = days <= 1 ? 1 : days;
  const { from } = rollingDateRange(span, now);
  return {
    from: addCalendarDays(from, -span),
    to: addCalendarDays(from, -1),
  };
}

export function isDateKeyInRange(
  dateKey: string,
  fromKey: string,
  toKey: string
): boolean {
  return !!dateKey && dateKey >= fromKey && dateKey <= toKey;
}
