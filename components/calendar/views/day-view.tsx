"use client";

import { useMemo } from "react";
import { format, isToday } from "date-fns";
import { vi } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { getLunarDate } from "@/lib/lunar-calendar";
import { CalendarEventCard } from "../calendar-event-card";

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

function eventHour(event: UnifiedCalendarEvent) {
  if (event.allDay || !event.start.includes("T")) return null;
  const parsed = new Date(event.start);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getHours();
}

export function DayView({ currentDate, eventsByDate, onEventClick, onCreateEvent }: DayViewProps) {
  const dateIso = format(currentDate, "yyyy-MM-dd");
  const allEvents = eventsByDate.get(dateIso) ?? EMPTY_EVENTS;
  const today = isToday(currentDate);
  const dayTitle = format(currentDate, "EEEE, dd/MM/yyyy", { locale: vi });
  const lunar = getLunarDate(currentDate.getDate(), currentDate.getMonth() + 1, currentDate.getFullYear());
  const lunarLabel = `${lunar.day}/${lunar.month} ÂL`;

  const sections: TimeSection[] = useMemo(() => {
    const allDay: UnifiedCalendarEvent[] = [];
    const morning: UnifiedCalendarEvent[] = [];
    const afternoon: UnifiedCalendarEvent[] = [];
    const evening: UnifiedCalendarEvent[] = [];

    for (const event of allEvents) {
      const hour = eventHour(event);
      if (hour === null) allDay.push(event);
      else if (hour < 12) morning.push(event);
      else if (hour < 18) afternoon.push(event);
      else evening.push(event);
    }

    return [
      { label: "Cả ngày", range: "", events: allDay },
      { label: "Sáng", range: "06:00 - 12:00", events: morning },
      { label: "Chiều", range: "12:00 - 18:00", events: afternoon },
      { label: "Tối", range: "18:00 - 22:00", events: evening },
    ].filter((section) => section.events.length > 0 || section.label === "Cả ngày");
  }, [allEvents]);

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
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-bg-input px-4 py-3">
        <div className="min-w-0">
          <h3 className={`truncate text-lg font-bold capitalize ${today ? "text-primary" : "text-text-primary"}`}>
            {dayTitle}
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            {lunarLabel} · {allEvents.length} sự kiện
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => onCreateEvent?.(currentDate)} className="shrink-0 gap-1.5">
          <Plus className="size-4" />
          Thêm lịch
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allEvents.length === 0 ? (
          <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 px-4 text-center text-text-muted">
            <p className="text-sm font-medium">Không có lịch trình trong ngày này.</p>
            <Button variant="primary" size="sm" onClick={() => onCreateEvent?.(currentDate)} className="gap-1.5">
              <Plus className="size-4" />
              Thêm lịch
            </Button>
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.label}>
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-bg-input/95 px-4 py-2 backdrop-blur">
                <span className="text-xs font-semibold uppercase text-text-primary">{section.label}</span>
                {section.range && <span className="text-xs text-text-muted">{section.range}</span>}
                {currentSection === section.label && currentTimeLabel && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-medium text-error">
                    <span className="size-1.5 rounded-full bg-error animate-pulse" />
                    {currentTimeLabel}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2 p-3">
                {section.events.length === 0 ? (
                  <p className="px-1 text-xs italic text-text-muted">Trống</p>
                ) : (
                  section.events.map((event) => (
                    <CalendarEventCard key={event.id} event={event} onClick={() => onEventClick?.(event)} />
                  ))
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
