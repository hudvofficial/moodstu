"use client";

import { useEffect, useCallback } from "react";
import { CalendarViewMode } from "@/types/calendar.types";
import { addMonths, addWeeks, addDays } from "date-fns";

interface UseCalendarKeyboardOptions {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onCreateEvent?: () => void;
}

/**
 * Google Calendar-style keyboard shortcuts
 * T = Today, ←/→ = Navigate, M/W/D = View mode, C = Create
 * Skips when focus is on input/textarea/modal
 */
export function useCalendarKeyboard({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onCreateEvent,
}: UseCalendarKeyboardOptions) {
  const navigate = useCallback((direction: 1 | -1) => {
    switch (viewMode) {
      case "month": onDateChange(addMonths(currentDate, direction)); break;
      case "week":  onDateChange(addWeeks(currentDate, direction));  break;
      case "day":   onDateChange(addDays(currentDate, direction));   break;
    }
  }, [currentDate, viewMode, onDateChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs or when modals/drawers are open
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (document.querySelector("[data-state='open']")) return;

      switch (e.key) {
        case "t": case "T": onDateChange(new Date()); break;
        case "m": case "M": onViewModeChange("month"); break;
        case "w": case "W": onViewModeChange("week"); break;
        case "d": case "D": onViewModeChange("day"); break;
        case "c": case "C": onCreateEvent?.(); break;
        case "ArrowLeft":  navigate(-1); break;
        case "ArrowRight": navigate(1);  break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, onDateChange, onViewModeChange, onCreateEvent]);
}
