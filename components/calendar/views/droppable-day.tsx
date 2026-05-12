import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { DraggableEvent } from "./draggable-event";
import {
  getLunarDate,
  formatLunarShort,
  isLunarNewMonth,
} from "@/lib/lunar-calendar";

interface DroppableDayProps {
  date: Date;
  dateIso: string;
  isCurrentMonth: boolean;
  events: UnifiedCalendarEvent[];
  maxVisible?: number;
  onEventClick?: (ev: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

function DroppableDayInner({
  date,
  dateIso,
  isCurrentMonth,
  events,
  maxVisible = 3,
  onEventClick,
  onDateClick,
}: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateIso,
  });

  const today = isToday(date);
  const visibleEvents = events.slice(0, maxVisible);
  const overflowCount = events.length - maxVisible;

  // Lunar calendar
  const lunar = getLunarDate(
    date.getDate(),
    date.getMonth() + 1,
    date.getFullYear(),
  );
  const lunarText = formatLunarShort(lunar);
  const isNewLunarMonth = isLunarNewMonth(lunar);

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDateClick?.(date)}
      className={`min-h-0 overflow-hidden border-r border-b border-border p-1.5 flex flex-col gap-1 transition-colors relative cursor-pointer hover:bg-bg-hover/50
        ${!isCurrentMonth ? "bg-bg-input/60 opacity-60" : ""}
        ${today ? "bg-primary/3" : ""}
        ${isOver ? "bg-primary/5 outline-2 outline-primary -outline-offset-2 z-10 rounded-sm" : ""}
      `}
    >
      <div className="flex items-center justify-center gap-1 w-full shrink-0">
        <span
          className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
          ${
            today
              ? "bg-primary text-white shadow-sm"
              : !isCurrentMonth
                ? "text-text-muted font-medium"
                : "text-text-main"
          }
        `}
          style={
            !today &&
            isCurrentMonth &&
            (date.getDay() === 0 || date.getDay() === 6)
              ? { color: "var(--color-text-weekend)" }
              : undefined
          }
        >
          {format(date, "d")}
        </span>
        <span
          className={`text-micro leading-none ${isNewLunarMonth ? "font-bold" : "text-text-muted"}`}
          style={
            isNewLunarMonth ? { color: "var(--color-text-weekend)" } : undefined
          }
        >
          {lunarText}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden pb-1">
        {visibleEvents.map((ev) => (
          <DraggableEvent
            key={ev.id}
            event={ev}
            onClick={() => onEventClick?.(ev)}
          />
        ))}
        {overflowCount > 0 && (
          <span
            className="text-xs font-medium text-primary hover:text-primary/80 cursor-pointer px-1 py-0.5 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDateClick?.(date);
            }}
          >
            +{overflowCount} thêm
          </span>
        )}
      </div>
    </div>
  );
}

export const DroppableDay = memo(DroppableDayInner);
