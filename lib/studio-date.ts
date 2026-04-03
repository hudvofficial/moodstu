import type { ProductivityPeriod } from "@/types/productivity";

export const DEFAULT_STUDIO_TIMEZONE = "Asia/Ho_Chi_Minh";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function getFormatter(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getCalendarParts(date: Date, timezone: string) {
  const formatter = getFormatter(timezone);
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function calendarDateToUtcDate(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatCalendarDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseCalendarDate(
  value: string | null | undefined,
): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return calendarDateToUtcDate(year, month, day);
}

export function getTodayInTimeZone(
  timezone = DEFAULT_STUDIO_TIMEZONE,
): string {
  const parts = getCalendarParts(new Date(), timezone);
  return formatCalendarDate(
    calendarDateToUtcDate(parts.year, parts.month, parts.day),
  );
}

export function getProductivityDateRange(
  period: ProductivityPeriod,
  timezone = DEFAULT_STUDIO_TIMEZONE,
): { start: string; end: string; dayCount: number } {
  const todayParts = getCalendarParts(new Date(), timezone);
  const endDate = calendarDateToUtcDate(
    todayParts.year,
    todayParts.month,
    todayParts.day,
  );
  const startDate = new Date(endDate);

  switch (period) {
    case "week": {
      const weekday = startDate.getUTCDay();
      const diff = weekday === 0 ? 6 : weekday - 1;
      startDate.setUTCDate(startDate.getUTCDate() - diff);
      break;
    }
    case "month": {
      startDate.setUTCDate(1);
      break;
    }
    case "quarter": {
      const quarterMonth = Math.floor(startDate.getUTCMonth() / 3) * 3;
      startDate.setUTCMonth(quarterMonth, 1);
      break;
    }
  }

  const dayCount =
    Math.floor((endDate.getTime() - startDate.getTime()) / DAY_IN_MS) + 1;

  return {
    start: formatCalendarDate(startDate),
    end: formatCalendarDate(endDate),
    dayCount,
  };
}

export function getRangeWeekCount(dayCount: number): number {
  return Math.max(1, Math.ceil(dayCount / 7));
}
