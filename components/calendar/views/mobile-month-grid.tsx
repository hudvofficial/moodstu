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
  isSameDay
} from "date-fns";
import { UnifiedCalendarEvent } from "@/types/calendar.types";

interface MobileMonthGridProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onDateSelect: (date: Date) => void;
}

export function MobileMonthGrid({ currentDate, events, onDateSelect }: MobileMonthGridProps) {
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const today = new Date();

  return (
    <div className="flex w-full flex-col bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mb-8">
      {/* Header Days */}
      <div className="grid grid-cols-7 border-b bg-slate-50/80">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, i) => (
          <div 
            key={day} 
            className={`py-2 text-center text-tiny font-bold text-slate-500 uppercase tracking-wider
              ${i < 6 ? "border-r border-slate-200/50" : ""}
            `}
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Body */}
      <div className="grid grid-cols-7 auto-rows-[minmax(60px,1fr)] sm:auto-rows-[minmax(80px,1fr)]">
        {daysInGrid.map((date, idx) => {
          const dateIso = format(date, "yyyy-MM-dd");
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isToday = isSameDay(date, today);
          
          const eventsForDay = events.filter(e => e.start.split("T")[0] === dateIso);
          const hasEvents = eventsForDay.length > 0;
          
          return (
            <div 
               key={dateIso}
               onClick={() => onDateSelect(date)}
               className={`
                 relative flex flex-col items-center justify-start pt-2 border-b border-r border-slate-100 cursor-pointer 
                 transition hover:bg-slate-50 active:bg-slate-100
                 ${!isCurrentMonth ? "bg-slate-50/50 opacity-60" : "bg-white"}
                 ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}
               `}
            >
              <div className={`
                flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                ${isToday ? "bg-blue-600 text-white font-bold shadow-sm" : "text-slate-700"}
              `}>
                {format(date, "d")}
              </div>
              
              {/* Event Indicators (Dots) */}
              {hasEvents && (
                <div className="absolute flex flex-wrap gap-[3px] justify-center px-1 bottom-1.5 w-full">
                  {eventsForDay.slice(0, 3).map((e, i) => {
                    // Trích xuất màu chuẩn như SSOT colorTokens
                    const bgClass = e.colorToken.includes("rose") || e.colorToken.includes("pink") ? "bg-rose-400" : 
                                    e.colorToken.includes("amber") || e.colorToken.includes("yellow") ? "bg-amber-400" : 
                                    e.colorToken.includes("emerald") || e.colorToken.includes("green") ? "bg-emerald-400" : 
                                    e.colorToken.includes("violet") || e.colorToken.includes("indigo") || e.colorToken.includes("purple") ? "bg-violet-400" : 
                                    e.colorToken.includes("slate") || e.colorToken.includes("gray") ? "bg-slate-400" : 
                                    e.colorToken.includes("sky") || e.colorToken.includes("blue") ? "bg-sky-400" :
                                    "bg-blue-400";
                    return <div key={`${e.id}-${i}`} className={`w-1.5 h-1.5 rounded-full ${bgClass}`} />;
                  })}
                  {eventsForDay.length > 3 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
