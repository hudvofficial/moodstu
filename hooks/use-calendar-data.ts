import { useState, useMemo, useCallback } from "react";
import { useSWR, cacheKeys } from "@/lib/swr";
import { fetchCalendarEvents, fetchCalendarFilterEmployees, checkGoogleCalendarStatus } from "@/app/actions/calendar-queries";
import type { CalendarViewMode } from "@/types/calendar.types";

const CALENDAR_VIEW_MODES: CalendarViewMode[] = ["month", "week", "day"];

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

export function useCalendarData() {
  const [currentDate, setCurrentDateState] = useState(parseInitialDate);
  const [viewMode, setViewModeState] = useState<CalendarViewMode>(parseInitialViewMode);
  
  // Advanced Filter state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const { data, error, isLoading, mutate } = useSWR(
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

  const rawEvents = useMemo(() => data?.success ? data.data : [], [data]);
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
        return true;
      });
  }, [rawEvents, selectedEmployees, selectedStatuses, employeeNameById]);

  // §1.2 — O(1) lookup per cell: Map<YYYY-MM-DD, Event[]>
  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredEvents>();
    for (const ev of filteredEvents) {
      const key = ev.start.split("T")[0];
      const arr = map.get(key);
      if (arr) arr.push(ev);
      else map.set(key, [ev]);
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
    return Array.from(statusSet).map(s => ({
      label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " "),
      value: s
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
    error: error?.message || serverError,
    mutate,
    filters: {
      selectedEmployees,
      setSelectedEmployees,
      selectedStatuses,
      setSelectedStatuses,
      availableEmployees,
      availableStatuses: computedStatuses,
      isGoogleConnected: isGoogleConnected ?? false
    }
  };
}
