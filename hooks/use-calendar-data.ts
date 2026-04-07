import { useState, useMemo, useCallback } from "react";
import { useSWR, cacheKeys } from "@/lib/swr";
import { fetchCalendarEvents, fetchCalendarFilterEmployees, checkGoogleCalendarStatus } from "@/app/actions/calendar-queries";
import type { CalendarViewMode } from "@/types/calendar.types";

export function useCalendarData() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  
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

  // Filter client-side based on SSOT state
  const filteredEvents = useMemo(() => {
    return rawEvents
      .map(event => {
        // P3 Fix: Map employee name locally using the fetched employees list
        if (!event.employeeId || !employeesData) return event;
        const emp = employeesData.find((e: { id: string; full_name: string }) => e.id === event.employeeId);
        if (emp && !event.employeeName) {
          return { ...event, employeeName: emp.full_name };
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
  }, [rawEvents, selectedEmployees, selectedStatuses, employeesData]);

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

  // §1.4 — URL sync for viewMode
  const handleSetViewMode = useCallback((mode: CalendarViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("view", mode);
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return {
    currentDate,
    setCurrentDate,
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
      availableEmployees: (employeesData || []).map((e: { id: string; full_name: string }) => ({
        label: e.full_name,
        value: e.id,
      })),
      availableStatuses: computedStatuses,
      isGoogleConnected: isGoogleConnected ?? false
    }
  };
}
