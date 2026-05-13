"use client";

import { useMemo } from "react";
import { format, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { getLunarDate } from "@/lib/lunar-calendar";
import { CalendarEventCard } from "../calendar-event-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface DayViewProps {
  currentDate: Date;
  eventsByDate: Map<string, UnifiedCalendarEvent[]>;
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onCreateEvent?: (date: Date) => void;
}

interface TimeSection {
  label: string;
  range: string;
  events: UnifiedCalendarEvent[];
}

const EMPTY_EVENTS: UnifiedCalendarEvent[] = [];

export function DayView({
  currentDate,
  eventsByDate,
  onEventClick,
  onCreateEvent,
}: DayViewProps) {
  const dateIso = format(currentDate, "yyyy-MM-dd");
  const allEvents = eventsByDate.get(dateIso) ?? EMPTY_EVENTS;
  const today = isToday(currentDate);
  const dayTitle = format(currentDate, "EEEE, dd/MM/yyyy", { locale: vi });
  const lunar = getLunarDate(
    currentDate.getDate(),
    currentDate.getMonth() + 1,
    currentDate.getFullYear(),
  );
  const lunarLabel = `${lunar.day}/${lunar.month} ÂL`;

  // Partition into sections by time
  const sections: TimeSection[] = useMemo(() => {
    const allDay: UnifiedCalendarEvent[] = [];
    const am: UnifiedCalendarEvent[] = [];
    const pm: UnifiedCalendarEvent[] = [];
    const evening: UnifiedCalendarEvent[] = [];

    for (const ev of allEvents) {
      if (ev.allDay || !ev.start.includes("T")) {
        allDay.push(ev);
        continue;
      }
      const hour = new Date(ev.start).getHours();
      if (hour < 12) am.push(ev);
      else if (hour < 18) pm.push(ev);
      else evening.push(ev);
    }

    return [
      { label: "Cả ngày", range: "", events: allDay },
      { label: "Sáng", range: "06:00 – 12:00", events: am },
      { label: "Chiều", range: "12:00 – 18:00", events: pm },
      { label: "Tối", range: "18:00 – 22:00", events: evening },
    ].filter((s) => s.events.length > 0 || s.label === "Cả ngày");
  }, [allEvents]);

  // Current time indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentTimeLabel = today ? format(now, "HH:mm") : null;
  const currentSection = today
    ? currentHour < 12
      ? "Sáng"
      : currentHour < 18
        ? "Chiều"
        : "Tối"
    : null;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Day Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-input">
        <div>
          <h3
            className={`text-lg font-bold capitalize ${today ? "text-primary" : "text-text-main"}`}
          >
            {dayTitle}
          </h3>
          <p className="text-xs text-text-muted">
            {lunarLabel} • {allEvents.length} sự kiện
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onCreateEvent?.(currentDate)}
          className="flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Thêm lịch
        </Button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        {allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
            <p className="text-sm">Không có lịch trình ngày này</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onCreateEvent?.(currentDate)}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Thêm lịch
            </Button>
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.label} className="">
              <div className="flex items-center gap-2 px-4 py-2 bg-bg-input/50">
                <span className="text-xs font-semibold text-text-main uppercase">
                  {section.label}
                </span>
                {section.range && (
                  <span className="text-xs text-text-muted">
                    {section.range}
                  </span>
                )}
                {/* Live time indicator */}
                {currentSection === section.label && currentTimeLabel && (
                  <span className="ml-auto text-xs font-medium text-red-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    {currentTimeLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 p-3">
                {section.events.length === 0 ? (
                  <p className="text-xs text-text-muted italic pl-1">Trống</p>
                ) : (
                  section.events.map((ev) => (
                    <CalendarEventCard
                      key={ev.id}
                      event={ev}
                      onClick={() => onEventClick?.(ev)}
                    />
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
