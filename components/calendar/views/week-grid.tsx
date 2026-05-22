"use client";

import { useMemo, useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
} from "date-fns";
import { getLunarDate, formatLunarShort, isLunarNewMonth } from "@/lib/lunar-calendar";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { updateDragDropDate } from "@/app/actions/calendar-mutations";
import { DroppableDay } from "./droppable-day";
import { DraggableEvent } from "./draggable-event";
import { parseISO, subDays, format as formatFns } from "date-fns";
import { buildGridSlots } from "@/lib/utils/calendar-utils";

interface WeekGridProps {
  currentDate: Date;
  eventsByDate: Map<string, UnifiedCalendarEvent[]>;
  mutate: () => void;
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function WeekGrid({ currentDate, eventsByDate, mutate, onEventClick, onDateClick }: WeekGridProps) {
  const [activeEvent, setActiveEvent] = useState<UnifiedCalendarEvent | null>(null);
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null);

  const daysInWeek = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const allEvents = useMemo(() => {
    return Array.from(new Map(Array.from(eventsByDate.values()).flat().map(e => [e.id, e])).values());
  }, [eventsByDate]);

  const gridSlots = useMemo(() => {
    if (daysInWeek.length === 0) return {};
    return buildGridSlots(allEvents, daysInWeek[0], daysInWeek[daysInWeek.length - 1]);
  }, [allEvents, daysInWeek]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ev = Array.from(eventsByDate.values()).flat().find(e => e.id === active.id);
    if (ev) {
      setActiveEvent(ev);
      if (active.rect.current.initial) {
        setActiveRect({
          width: active.rect.current.initial.width,
          height: active.rect.current.initial.height,
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);
    setActiveRect(null);
    if (!over) return;
    
    const eventId = String(active.id);
    const newDateIso = String(over.id);
    const allEvents = Array.from(eventsByDate.values()).flat();
    const ev = allEvents.find(e => e.id === eventId);
    if (!ev) return;
    
    const oldDateStr = ev.start.split("T")[0];
    if (oldDateStr === newDateIso) return;
    
    let finalNewStart = newDateIso;
    if (ev.start.includes("T")) {
      const timePart = ev.start.split("T")[1];
      finalNewStart = `${newDateIso}T${timePart}`;
    }
    
    try {
      const res = await updateDragDropDate(eventId, ev.source, finalNewStart, ev.start);
      if (!res.success) {
        toast.error((res as { error?: string }).error || "Lỗi cập nhật lịch");
        return;
      }
      toast.success("Đã thay đổi lịch trình!");
      mutate();
    } catch {
      toast.error("Lỗi kết nối");
    }
  };

  const weekHeader = `${format(daysInWeek[0], "dd/MM")} – ${format(daysInWeek[6], "dd/MM")}`;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Week Range Header */}
        <div className="px-3 py-2 text-sm font-medium text-text-muted bg-bg-input">
          {weekHeader}
        </div>
        
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-bg-input">
          {daysInWeek.map((day, i) => {
            const isCurrentDay = isSameDay(day, new Date());
            const lunar = getLunarDate(day.getDate(), day.getMonth() + 1, day.getFullYear());
            const lunarStr = formatLunarShort(lunar);
            const isNewLunar = isLunarNewMonth(lunar);
            return (
              <div 
                key={i} 
                className={`py-2 text-center text-xs font-semibold uppercase tracking-wider
                  ${i !== 6 ? "" : ""}
                  ${isCurrentDay ? "text-primary" : "text-text-muted"}
                `}
              >
                <div>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]}</div>
                <div className={`text-sm mt-0.5 ${isCurrentDay ? "bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}>
                  {format(day, "d")}
                </div>
                <div
                  className={`text-micro mt-0.5 ${isNewLunar ? "font-bold" : "text-text-muted"}`}
                  style={isNewLunar ? { color: "var(--color-text-weekend)" } : undefined}
                >
                  {lunarStr}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Grid Body — taller cells than MonthGrid */}
        <div className="flex-1 grid grid-cols-7">
          {daysInWeek.map((date) => {
            const dateIso = format(date, "yyyy-MM-dd");
            const slotsForDay = gridSlots[dateIso] || [];
            
            return (
              <DroppableDay
                key={dateIso}
                date={date}
                dateIso={dateIso}
                isCurrentMonth={true}
                slots={slotsForDay}
                maxVisible={5}
                onEventClick={onEventClick}
                onDateClick={onDateClick}
              />
            );
          })}
        </div>
      </div>
      
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeEvent ? (
          <div 
            className="opacity-90 pointer-events-none"
            style={{ width: activeRect?.width || 192, height: activeRect?.height || 26 }}
          >
            <DraggableEvent event={activeEvent} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
