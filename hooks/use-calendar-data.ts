import { useState, useMemo, useCallback } from "react";
import { useSWR, cacheKeys } from "@/lib/swr";
import {
  fetchCalendarEvents,
  fetchCalendarFilterEmployees,
  fetchCalendarGoogleEvents,
  checkGoogleCalendarStatus,
} from "@/app/actions/calendar-queries";
import { useRealtime } from "@/hooks/use-realtime";
import { CALENDAR_STATUS_ORDER, getCalendarStatusLabel } from "@/lib/utils/calendar-utils";
import type { CalendarViewMode } from "@/types/calendar.types";

const CALENDAR_VIEW_MODES: CalendarViewMode[] = ["month", "week", "day"];
const CALENDAR_SOURCE_OPTIONS = [
  { label: "Lịch nội bộ", value: "schedule" },
  { label: "Nhiệm vụ", value: "task" },
  { label: "Google", value: "google" },
];

function parseInitialDate() {
  if (typeof window === "undefined") return new Date();

  const dateParam = new URL(window.location.href).searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return new Date();

  const parsed = new Date(`${dateParam}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function parseInitialViewMode(): CalendarViewMode {
  if (typeof window === "undefined") return "month";

  const viewParam = new URL(window.location.href).searchParams.get("view");
  return CALENDAR_VIEW_MODES.includes(viewParam as CalendarViewMode)
    ? (viewParam as CalendarViewMode)
    : "month";
}

function syncCalendarUrl(date: Date, viewMode?: CalendarViewMode) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  url.searchParams.set("date", dateKey);
  if (viewMode) url.searchParams.set("view", viewMode);
  window.history.replaceState({}, "", url.toString());
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const datePart = value.split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [year, month, day] = datePart.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventDateKeys(startValue: string, endValue: string | null) {
  const startDate = parseDateKey(startValue);
  if (!startDate) return [];

  const endDate = endValue ? parseDateKey(endValue) : null;
  if (!endDate || endDate < startDate) return [toDateKey(startDate)];

  const inclusiveEnd = new Date(endDate);
  if (!endValue?.includes("T")) {
    inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
  }

  if (inclusiveEnd < startDate) return [toDateKey(startDate)];

  const keys: string[] = [];
  const cursor = new Date(startDate);
  while (cursor <= inclusiveEnd && keys.length < 366) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

export function useCalendarData() {
  const [currentDate, setCurrentDateState] = useState(parseInitialDate);
  const [viewMode, setViewModeState] = useState<CalendarViewMode>(parseInitialViewMode);
  
  // Advanced Filter state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    cacheKeys.calendar(month, year),
    () => fetchCalendarEvents(month, year)
  );

  const { data: employeesData } = useSWR(
    "calendar-filter-employees",
    async () => {
      const res = await fetchCalendarFilterEmployees();
      if (!res.success) return [];
      return res.data;
    }
  );

  const { data: isGoogleConnected } = useSWR(
    "calendar-google-connected",
    async () => {
      const res = await checkGoogleCalendarStatus();
      return res.success ? res.data : false;
    }
  );

  const { data: googleData, mutate: mutateGoogle } = useSWR(
    isGoogleConnected ? cacheKeys.calendarGoogle(month, year) : null,
    async () => {
      const res = await fetchCalendarGoogleEvents(month, year);
      return res.success ? res.data : [];
    },
  );

  useRealtime("schedules", {
    cacheKeys: [cacheKeys.calendar(month, year)],
    debounceMs: 750,
  });
  useRealtime("work_tasks", {
    cacheKeys: [cacheKeys.calendar(month, year)],
    debounceMs: 750,
  });

  const rawEvents = useMemo(() => {
    const internalEvents = data?.success ? data.data : [];
    return [...internalEvents, ...(googleData || [])];
  }, [data, googleData]);
  const serverError = data && !data.success ? data.error : null;
  const employeeNameById = useMemo(() => {
    return new Map((employeesData || []).map((e: { id: string; full_name: string }) => [e.id, e.full_name]));
  }, [employeesData]);

  // Filter client-side based on SSOT state
  const filteredEvents = useMemo(() => {
    return rawEvents
      .map(event => {
        // P3 Fix: Map employee name locally using the fetched employees list
        if (!event.employeeId) return event;
        const employeeName = employeeNameById.get(event.employeeId);
        if (employeeName && !event.employeeName) {
          return { ...event, employeeName };
        }
        return event;
      })
      .filter(event => {
        // Lọc nhân viên
        if (selectedEmployees.length > 0) {
          if (!event.employeeId || !selectedEmployees.includes(event.employeeId)) return false;
        }
        // Lọc trạng thái
        if (selectedStatuses.length > 0) {
          if (!event.status || !selectedStatuses.includes(event.status)) return false;
        }
        if (selectedSources.length > 0 && !selectedSources.includes(event.source)) {
          return false;
        }
        return true;
      });
  }, [rawEvents, selectedEmployees, selectedStatuses, selectedSources, employeeNameById]);

  // §1.2 — O(1) lookup per cell: Map<YYYY-MM-DD, Event[]>
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const ev of filteredEvents) {
      for (const key of getEventDateKeys(ev.start, ev.end)) {
        const arr = map.get(key);
        if (arr) arr.push(ev);
        else map.set(key, [ev]);
      }
    }
    return map;
  }, [filteredEvents]);

  // §1.1 — Group tasks by contract+date key
  const groupedByKey = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const ev of filteredEvents) {
      if (!ev.groupKey) continue;
      const arr = map.get(ev.groupKey);
      if (arr) arr.push(ev);
      else map.set(ev.groupKey, [ev]);
    }
    return map;
  }, [filteredEvents]);

  const computedStatuses = useMemo(() => {
    const statusSet = new Set<string>();
    rawEvents.forEach(e => {
      if (e.status) statusSet.add(e.status);
    });
    const orderedStatuses = [
      ...CALENDAR_STATUS_ORDER.filter((status) => statusSet.has(status)),
      ...Array.from(statusSet)
        .filter((status) => !CALENDAR_STATUS_ORDER.includes(status as (typeof CALENDAR_STATUS_ORDER)[number]))
        .sort((left, right) => getCalendarStatusLabel(left).localeCompare(getCalendarStatusLabel(right), "vi-VN")),
    ];

    return orderedStatuses.map(status => ({
      label: getCalendarStatusLabel(status),
      value: status,
    }));
  }, [rawEvents]);

  const handleSetCurrentDate = useCallback((date: Date) => {
    setCurrentDateState(date);
    syncCalendarUrl(date, viewMode);
  }, [viewMode]);

  const availableEmployees = useMemo(() => {
    return (employeesData || []).map((e: { id: string; full_name: string }) => ({
      label: e.full_name,
      value: e.id,
    }));
  }, [employeesData]);

  // §1.4 — URL sync for viewMode
  const handleSetViewMode = useCallback((mode: CalendarViewMode) => {
    setViewModeState(mode);
    syncCalendarUrl(currentDate, mode);
  }, [currentDate]);

  return {
    currentDate,
    setCurrentDate: handleSetCurrentDate,
    month,
    year,
    events: filteredEvents,
    rawEvents,
    eventsByDate,
    groupedByKey,
    viewMode,
    setViewMode: handleSetViewMode,
    isLoading,
    isInitialLoading: isLoading && !data,
    isRefreshing: isValidating && !!data,
    error: error?.message || serverError,
    mutate: async () => {
      await mutate();
      await mutateGoogle();
    },
    filters: {
      selectedEmployees,
      setSelectedEmployees,
      selectedStatuses,
      setSelectedStatuses,
      selectedSources,
      setSelectedSources,
      availableEmployees,
      availableStatuses: computedStatuses,
      availableSources: CALENDAR_SOURCE_OPTIONS,
      isGoogleConnected: isGoogleConnected ?? false
    }
  };
}
