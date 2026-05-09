import { addDays, addMinutes, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const DEFAULT_LOG_TIMEZONE = "America/Bogota";
export const LOG_WINDOW_MINUTES = 30;

export type LogWindow = {
  contextStartUtc: Date;
  previousWindowStartUtc: Date;
  windowStartUtc: Date;
  windowEndUtc: Date;
  timezone: string;
};

export function getLogWindow(
  scheduledAt: Date,
  timezone = DEFAULT_LOG_TIMEZONE,
): LogWindow {
  const zoned = toZonedTime(scheduledAt, timezone);
  const flooredMinutes =
    Math.floor(zoned.getMinutes() / LOG_WINDOW_MINUTES) * LOG_WINDOW_MINUTES;
  zoned.setMinutes(flooredMinutes, 0, 0);

  const windowEndUtc = fromZonedTime(zoned, timezone);
  const windowStartUtc = addMinutes(windowEndUtc, -LOG_WINDOW_MINUTES);
  const previousWindowStartUtc = addMinutes(
    windowStartUtc,
    -LOG_WINDOW_MINUTES,
  );

  return {
    contextStartUtc: previousWindowStartUtc,
    previousWindowStartUtc,
    windowStartUtc,
    windowEndUtc,
    timezone,
  };
}

export function isDateSlug(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function getLocalDateRangeUtc(
  date: string,
  timezone = DEFAULT_LOG_TIMEZONE,
) {
  const startUtc = fromZonedTime(`${date}T00:00:00`, timezone);
  const startLocal = toZonedTime(startUtc, timezone);
  const endUtc = fromZonedTime(addDays(startLocal, 1), timezone);

  return { startUtc, endUtc };
}

export function formatLocalDate(date: Date, timezone = DEFAULT_LOG_TIMEZONE) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function formatLocalDateTime(
  date: Date,
  timezone = DEFAULT_LOG_TIMEZONE,
) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd HH:mm");
}

export function getWeekDays(date: string, timezone = DEFAULT_LOG_TIMEZONE) {
  const dayStart = toZonedTime(
    fromZonedTime(`${date}T00:00:00`, timezone),
    timezone,
  );
  const weekStart = startOfWeek(dayStart, { weekStartsOn: 1 });

  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const slug = formatLocalDate(fromZonedTime(day, timezone), timezone);

    return {
      slug,
      label: formatInTimeZone(fromZonedTime(day, timezone), timezone, "EEE d"),
    };
  });
}

export function shiftLocalDate(
  date: string,
  days: number,
  timezone = DEFAULT_LOG_TIMEZONE,
) {
  const zoned = toZonedTime(
    fromZonedTime(`${date}T00:00:00`, timezone),
    timezone,
  );
  return formatLocalDate(
    fromZonedTime(addDays(zoned, days), timezone),
    timezone,
  );
}
