import { memo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { DraggableEvent } from "./draggable-event";
import { formatLunarShort, getLunarDate, isLunarNewMonth } from "@/lib/lunar-calendar";
import { Button } from "@/components/ui/button";

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
  const { setNodeRef, isOver } = useDroppable({ id: dateIso });
  const today = isToday(date);
  const visibleEvents = events.slice(0, maxVisible);
  const overflowCount = Math.max(0, events.length - maxVisible);
  const lunar = getLunarDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const isNewLunarMonth = isLunarNewMonth(lunar);

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDateClick?.(date)}
      className={`relative flex min-h-0 cursor-pointer flex-col gap-1 overflow-hidden border-b border-r border-border p-1.5 transition-colors hover:bg-bg-hover/50
        ${!isCurrentMonth ? "bg-bg-input/60 opacity-60" : "bg-bg-card"}
        ${today ? "bg-primary/4" : ""}
        ${isOver ? "z-10 rounded-sm bg-primary/8 outline outline-2 -outline-offset-2 outline-primary" : ""}
      `}
      aria-label={`${format(date, "dd/MM/yyyy")}, ${events.length} sự kiện`}
    >
      <div className="flex w-full shrink-0 items-center justify-between gap-1">
        <span
          className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
            today
              ? "bg-primary text-white shadow-sm"
              : !isCurrentMonth
                ? "text-text-muted"
                : "text-text-primary"
          }`}
          style={!today && isCurrentMonth && (date.getDay() === 0 || date.getDay() === 6) ? { color: "var(--color-text-weekend)" } : undefined}
        >
          {format(date, "d")}
        </span>
        <span
          className={`truncate text-micro leading-none ${isNewLunarMonth ? "font-bold" : "text-text-muted"}`}
          style={isNewLunarMonth ? { color: "var(--color-text-weekend)" } : undefined}
        >
          {formatLunarShort(lunar)}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden pb-1">
        {visibleEvents.map((ev) => (
          <DraggableEvent key={ev.id} event={ev} onClick={() => onEventClick?.(ev)} />
        ))}
        {overflowCount > 0 && (
          <Button
            unstyled
            type="button"
            className="truncate px-1 py-0.5 text-left text-xs font-medium text-primary transition-colors hover:text-primary/80"
            onClick={(e) => {
              e.stopPropagation();
              onDateClick?.(date);
            }}
          >
            +{overflowCount} thêm
          </Button>
        )}
      </div>
    </div>
  );
}

export const DroppableDay = memo(DroppableDayInner);
