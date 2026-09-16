import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, subDays, parseISO } from 'date-fns';

/**
 * All record dates are anchored to US Pacific Time regardless of where the
 * device is. This keeps "today" consistent for the user and matches how the
 * `record_date` (a plain DATE column) is intended to be interpreted.
 */
export const APP_TIME_ZONE = 'America/Los_Angeles';

/** The wall-clock Date "now" as seen in Pacific Time. */
export function nowInAppTz() {
  return toZonedTime(new Date(), APP_TIME_ZONE);
}

/**
 * The calendar day in Pacific Time as a `yyyy-MM-dd` string.
 * This is the value to store in / query against `record_date`.
 */
export function todayKey() {
  return formatInTimeZone(new Date(), APP_TIME_ZONE, 'yyyy-MM-dd');
}

/** Convert an arbitrary Date to its Pacific-Time `yyyy-MM-dd` key. */
export function toDateKey(date) {
  return formatInTimeZone(date, APP_TIME_ZONE, 'yyyy-MM-dd');
}

/** `yyyy-MM-dd` for N days before today (Pacific Time). Used for the 30-day fetch window. */
export function dateKeyDaysAgo(days) {
  const zonedNow = nowInAppTz();
  return format(subDays(zonedNow, days), 'yyyy-MM-dd');
}

/**
 * Turn a stored `record_date` (yyyy-MM-dd) into a real UTC instant that
 * represents Pacific midnight of that day. Useful when you need an actual
 * timestamp (e.g. sorting alongside timestamptz data).
 */
export function dateKeyToUtcInstant(dateKey) {
  return fromZonedTime(`${dateKey}T00:00:00`, APP_TIME_ZONE);
}

/** Human-readable header date, localized. e.g. "Mon, Sep 15" */
export function formatHeaderDate(dateKey, locale) {
  // dateKey is a plain calendar day; render it as-is without TZ shifting.
  const d = parseISO(`${dateKey}T00:00:00`);
  const pattern = locale === 'ko' ? 'M월 d일 (EEE)' : 'EEE, MMM d';
  return format(d, pattern);
}
