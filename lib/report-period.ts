import type { ReportFiltersInput, ReportRange } from "@/types/reports";

const DAY_MS = 86400000;
const MAX_CUSTOM_RANGE_DAYS = 366;

interface MonthSlice {
  year: number;
  month: number;
  ratio: number;
}

function createUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function parseIsoDate(value: string) {
  const [yearText, monthText, dayText] = value.split("-");
  return createUtcDate(Number(yearText), Number(monthText), Number(dayText));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(value: string) {
  const date = parseIsoDate(value);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

function firstDayOfMonth(year: number, month: number) {
  return createUtcDate(year, month, 1);
}

function lastDayOfMonth(year: number, month: number) {
  return createUtcDate(year, month + 1, 0);
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function daysBetweenInclusive(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

function subtractMatchingDuration(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  const spanDays = daysBetweenInclusive(start, end);
  const previousEnd = addUtcDays(start, -1);
  const previousStart = addUtcDays(previousEnd, -(spanDays - 1));

  return {
    previousStartDate: formatIsoDate(previousStart),
    previousEndDate: formatIsoDate(previousEnd),
  };
}

export function getReportRange(filters: ReportFiltersInput): ReportRange {
  const year = filters.year;
  if (!Number.isInteger(year) || year < 2020 || year > 2035) {
    throw new Error("Nam bao cao khong hop le.");
  }

  if (filters.periodType === "month") {
    const month = filters.month || 1;
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Thang bao cao khong hop le.");
    }
    return {
      periodType: "month",
      year,
      month,
      label: `Tháng ${month}/${year}`,
      startDate: formatIsoDate(firstDayOfMonth(year, month)),
      endDate: formatIsoDate(lastDayOfMonth(year, month)),
    };
  }

  if (filters.periodType === "quarter") {
    const quarter = filters.quarter || 1;
    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      throw new Error("Quy bao cao khong hop le.");
    }
    const startMonth = (quarter - 1) * 3 + 1;
    return {
      periodType: "quarter",
      year,
      quarter,
      label: `Quý ${quarter}/${year}`,
      startDate: formatIsoDate(firstDayOfMonth(year, startMonth)),
      endDate: formatIsoDate(lastDayOfMonth(year, startMonth + 2)),
    };
  }

  if (filters.periodType === "year") {
    return {
      periodType: "year",
      year,
      label: `Năm ${year}`,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  if (!filters.startDate || !filters.endDate) {
    throw new Error("Khoảng ngày tùy chọn không hợp lệ.");
  }

  const customStart = parseIsoDate(filters.startDate);
  const customEnd = parseIsoDate(filters.endDate);
  if (!Number.isFinite(customStart.getTime()) || !Number.isFinite(customEnd.getTime()) || customStart > customEnd) {
    throw new Error("Khoang ngay tuy chon khong hop le.");
  }
  if (daysBetweenInclusive(customStart, customEnd) > MAX_CUSTOM_RANGE_DAYS) {
    throw new Error("Khoang ngay bao cao tuy chon khong duoc vuot qua 366 ngay.");
  }
  return {
    periodType: "custom",
    year,
    label: `${formatDisplayDate(filters.startDate)} - ${formatDisplayDate(filters.endDate)}`,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export function getPreviousReportRange(filters: ReportFiltersInput): ReportRange {
  const current = getReportRange(filters);
  const previousDates = subtractMatchingDuration(current.startDate, current.endDate);

  return {
    ...current,
    label: `${current.label} (trước đó)`,
    startDate: previousDates.previousStartDate,
    endDate: previousDates.previousEndDate,
  };
}

export function getReportPeriodKey(filters: ReportFiltersInput) {
  const range = getReportRange(filters);
  return [
    range.periodType,
    range.year,
    range.month || "all",
    range.quarter || "all",
    range.startDate,
    range.endDate,
  ].join(":");
}

export function enumerateMonthsInRange(startDate: string, endDate: string): MonthSlice[] {
  const rangeStart = parseIsoDate(startDate);
  const rangeEnd = parseIsoDate(endDate);
  const slices: MonthSlice[] = [];

  let cursor = firstDayOfMonth(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth() + 1);
  const lastMonth = firstDayOfMonth(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth() + 1);

  while (cursor <= lastMonth) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const monthStart = firstDayOfMonth(year, month);
    const monthEnd = lastDayOfMonth(year, month);
    const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
    const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;

    if (overlapStart <= overlapEnd) {
      slices.push({
        year,
        month,
        ratio: daysBetweenInclusive(overlapStart, overlapEnd) / daysBetweenInclusive(monthStart, monthEnd),
      });
    }

    cursor = firstDayOfMonth(year, month + 1);
  }

  return slices;
}
