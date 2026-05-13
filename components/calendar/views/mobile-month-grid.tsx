"use client";

import { useMemo } from "react";
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
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

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

            const eventsForDay = events.filter(
              (e) => e.start.split("T")[0] === dateIso,
            );

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
                  {eventsForDay.slice(0, 2).map((e) => {
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
                        key={e.id}
                        style={googleStyle}
                        className={`text-micro font-medium px-1 py-0.5 rounded truncate border-l-2 shadow-sm leading-tight shrink-0
                          ${!isGoogleColored ? e.colorToken : ""}
                        `}
                      >
                        {e.source === "google" && (
                          <span className="text-micro bg-white/20 text-white px-0.5 rounded mr-0.5 font-bold leading-none">
                            G
                          </span>
                        )}
                        <span className="truncate">{e.title}</span>
                      </div>
                    );
                  })}
                </div>

                {eventsForDay.length > 2 && (
                  <div className="text-micro text-text-secondary font-medium w-full text-center pb-0.5 shrink-0">
                    +{eventsForDay.length - 2}
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
