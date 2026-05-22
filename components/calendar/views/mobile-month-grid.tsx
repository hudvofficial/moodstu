"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import {
  getLunarDate,
  formatLunarShort,
  isLunarNewMonth,
} from "@/lib/lunar-calendar";
import { buildGridSlots } from "@/lib/utils/calendar-utils";

const MAX_VISIBLE_EVENTS = 5;
const DAY_HEADER_HEIGHT = 30;
const EVENT_ROW_HEIGHT = 12;
const EVENT_ROW_GAP = 2;
const MORE_LINK_HEIGHT = 12;
const CELL_BOTTOM_PADDING = 2;

interface MobileMonthGridProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onDateSelect: (date: Date) => void;
}

export function MobileMonthGrid({
  currentDate,
  events,
  onDateSelect,
}: MobileMonthGridProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [bodyHeight, setBodyHeight] = useState(0);

  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;

    const updateHeight = () => setBodyHeight(node.getBoundingClientRect().height);
    updateHeight();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setBodyHeight(entry.contentRect.height);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const eventsByDate = useMemo(() => {
    if (daysInGrid.length === 0) return {};

    return buildGridSlots(
      events,
      daysInGrid[0],
      daysInGrid[daysInGrid.length - 1],
    );
  }, [daysInGrid, events]);

  const rowCount = Math.max(1, daysInGrid.length / 7);
  const cellHeight = bodyHeight > 0 ? bodyHeight / rowCount : 110;
  const eventAreaHeight = Math.max(
    0,
    cellHeight - DAY_HEADER_HEIGHT - CELL_BOTTOM_PADDING,
  );
  const eventPitch = EVENT_ROW_HEIGHT + EVENT_ROW_GAP;
  const maxEventsWithoutMore = Math.min(
    MAX_VISIBLE_EVENTS,
    Math.max(0, Math.floor((eventAreaHeight + EVENT_ROW_GAP) / eventPitch)),
  );
  const maxEventsWithMore = Math.min(
    MAX_VISIBLE_EVENTS,
    Math.max(
      0,
      Math.floor((eventAreaHeight - MORE_LINK_HEIGHT + EVENT_ROW_GAP) / eventPitch),
    ),
  );

  const today = new Date();

  return (
    <div className="flex w-full h-full flex-col overflow-hidden">
      {/* Header Days */}
      <div className="grid grid-cols-7 bg-bg-input shrink-0 border-b border-border">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, i) => (
          <div
            key={day}
            className={`py-2 text-center text-tiny uppercase tracking-wider
              ${i >= 5 ? "font-bold" : "font-semibold text-text-muted"}
            `}
            style={i >= 5 ? { color: "var(--color-text-weekend)" } : undefined}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 relative min-h-0 h-full w-full">
        <div
          ref={bodyRef}
          className={`absolute inset-0 overflow-hidden grid grid-cols-7 ${
            daysInGrid.length === 28
              ? "grid-rows-[repeat(4,25%)]"
              : daysInGrid.length === 42
                ? "grid-rows-[repeat(6,16.666667%)]"
                : "grid-rows-[repeat(5,20%)]"
          }`}
        >
          {daysInGrid.map((date) => {
            const dateIso = format(date, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isToday = isSameDay(date, today);

            // Lunar calendar
            const lunar = getLunarDate(
              date.getDate(),
              date.getMonth() + 1,
              date.getFullYear(),
            );
            const lunarText = formatLunarShort(lunar);
            const isNewLunarMonth = isLunarNewMonth(lunar);

            const eventsForDay = (eventsByDate[dateIso] ?? [])
              .filter((slot) => slot.event)
              .map((slot) => slot.event!);
            const visibleLimit =
              eventsForDay.length <= maxEventsWithoutMore
                ? eventsForDay.length
                : maxEventsWithMore;
            const visibleEvents = eventsForDay.slice(0, visibleLimit);
            const hiddenCount = eventsForDay.length - visibleEvents.length;

            return (
              <div
                key={dateIso}
                onClick={() => onDateSelect(date)}
                className={`
                   relative flex flex-col items-center justify-start pt-1 cursor-pointer 
                   transition-colors hover:bg-bg-hover active:bg-bg-hover
                   border-r border-b border-border min-h-0 overflow-hidden h-full w-full
                   ${!isCurrentMonth ? "bg-bg-input/60 opacity-60" : ""}
                   ${isToday ? "bg-primary/5" : ""}
                 `}
              >
                <div className="flex items-center justify-center gap-1 w-full mb-0.5 shrink-0">
                  <div
                    className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                    ${
                      isToday
                        ? "bg-primary text-white font-bold shadow-sm"
                        : !isCurrentMonth
                          ? "text-text-muted"
                          : "text-text-main"
                    }
                  `}
                    style={
                      !isToday &&
                      isCurrentMonth &&
                      (date.getDay() === 0 || date.getDay() === 6)
                        ? { color: "var(--color-text-weekend)" }
                        : undefined
                    }
                  >
                    {format(date, "d")}
                  </div>
                  <span
                    className={`text-micro leading-none ${isNewLunarMonth ? "font-bold text-text-main" : "text-text-muted"} ${!isCurrentMonth ? "opacity-60" : ""}`}
                    style={
                      isNewLunarMonth && isCurrentMonth && !isToday
                        ? { color: "var(--color-text-weekend)" }
                        : undefined
                    }
                  >
                    {lunarText}
                  </span>
                </div>

                {/* Event Cards (V1 Style Parity) */}
                <div className="flex-1 min-h-0 overflow-hidden px-0.5 flex flex-col gap-0.5 w-full">
                  {visibleEvents.map((e, index) => {
                    const isGoogleColored =
                      e.source === "google" && e.backgroundColor;
                    const googleStyle = isGoogleColored
                      ? {
                          backgroundColor: e.backgroundColor!,
                          color: "#fff",
                          borderLeftColor: "rgba(0,0,0,0.2)",
                        }
                      : undefined;

                    return (
                      <div
                        key={`${e.id}-${index}`}
                        style={googleStyle}
                        className={`flex h-3 min-h-3 shrink-0 items-center gap-0.5 overflow-hidden rounded-sm border-l-2 px-0.5 text-micro font-medium leading-none shadow-sm
                          ${!isGoogleColored ? e.colorToken : ""}
                        `}
                      >
                        {e.source === "google" && (
                          <span className="shrink-0 rounded-sm bg-white/20 px-0.5 text-micro font-bold leading-none text-white">
                            G
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      </div>
                    );
                  })}
                </div>

                {hiddenCount > 0 && (
                  <div className="h-3 shrink-0 pb-0.5 text-center text-micro font-medium leading-none text-text-secondary w-full">
                    +{hiddenCount}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
