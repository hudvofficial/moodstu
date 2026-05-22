import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { type UnifiedCalendarEvent } from "@/types/calendar.types";
import { DraggableEvent } from "./draggable-event";
import { type GridSlot } from "@/lib/utils/calendar-utils";
import {
  getLunarDate,
  formatLunarShort,
  isLunarNewMonth,
} from "@/lib/lunar-calendar";

const COMPACT_EVENT_ROW_HEIGHT = 22;
const COMPACT_EVENT_ROW_GAP = 2;
const DEFAULT_EVENT_ROW_HEIGHT = 26;
const DEFAULT_EVENT_ROW_GAP = 4;
const MORE_LINK_HEIGHT = 18;

interface DroppableDayProps {
  date: Date;
  dateIso: string;
  isCurrentMonth: boolean;
  slots: GridSlot[];
  maxVisible?: number;
  compactEvents?: boolean;
  renderEvents?: boolean;
  onEventClick?: (ev: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

function DroppableDayInner({
  date,
  dateIso,
  isCurrentMonth,
  slots,
  maxVisible,
  compactEvents = false,
  renderEvents = true,
  onEventClick,
  onDateClick,
}: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateIso,
  });

  const today = isToday(date);
  const eventAreaRef = useRef<HTMLDivElement | null>(null);
  const [eventAreaHeight, setEventAreaHeight] = useState(0);
  const rowHeight = compactEvents ? COMPACT_EVENT_ROW_HEIGHT : DEFAULT_EVENT_ROW_HEIGHT;
  const rowGap = compactEvents ? COMPACT_EVENT_ROW_GAP : DEFAULT_EVENT_ROW_GAP;
  const rowPitch = rowHeight + rowGap;

  useEffect(() => {
    const node = eventAreaRef.current;
    if (!node) return;

    const updateHeight = () => setEventAreaHeight(node.getBoundingClientRect().height);
    updateHeight();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setEventAreaHeight(entry.contentRect.height);
      }
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const visibleLimit = useMemo(() => {
    const explicitLimit = maxVisible ?? Number.POSITIVE_INFINITY;
    if (!eventAreaHeight) return Math.min(explicitLimit, 3);

    const rowsWithoutOverflow = Math.floor((eventAreaHeight + rowGap) / rowPitch);
    const cappedRows = Math.max(0, Math.min(explicitLimit, rowsWithoutOverflow));
    if (slots.length <= cappedRows) return cappedRows;

    const rowsWithMoreLink = Math.floor((eventAreaHeight - MORE_LINK_HEIGHT + rowGap) / rowPitch);
    return Math.max(0, Math.min(explicitLimit, rowsWithMoreLink));
  }, [eventAreaHeight, maxVisible, rowGap, rowPitch, slots.length]);

  const visibleSlots = slots.slice(0, visibleLimit);
  const overflowCount = slots.slice(visibleLimit).filter((slot) => slot.event !== null).length;
  const overflowTop = visibleLimit * rowPitch + (compactEvents ? 1 : 2);

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
      className={`min-h-0 border-r border-b border-border py-1.5 px-0 flex flex-col gap-1 transition-colors relative cursor-pointer hover:bg-bg-hover/50
        ${!isCurrentMonth ? "bg-bg-input/60 opacity-60" : ""}
        ${today ? "bg-primary/3" : ""}
        ${isOver ? "bg-primary/5 outline-2 outline-primary -outline-offset-2 z-10 rounded-sm" : ""}
      `}
    >
      <div className="flex h-6 items-center justify-center gap-1 w-full shrink-0 px-1.5">
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

      {renderEvents && <div ref={eventAreaRef} className="relative flex-1 min-h-0 pb-1">
        {visibleSlots.map((slot, idx) => {
          if (!slot.event) {
            return null;
          }

          if (slot.isAbsolute) {
            return (
              <div
                key={`${slot.event.id}-${idx}`}
                className="absolute left-0 z-10 w-full"
                style={{ top: idx * rowPitch, height: rowHeight }}
              >
                <div 
                  className={compactEvents ? "flex h-[22px]" : "flex h-[26px]"} 
                  style={{ width: `calc(${slot.spanDays!} * 100% + ${slot.spanDays! - 1}px)` }}
                >
                  <DraggableEvent
                    event={slot.event}
                    continuesPrior={slot.continuesPrior}
                    continuesNext={slot.continuesNext}
                    compact={compactEvents}
                    onClick={() => onEventClick?.(slot.event!)}
                  />
                </div>
              </div>
            );
          }

          return null;
        })}
        {overflowCount > 0 && (
          <span
            className="absolute left-1 text-xs font-medium text-primary hover:text-primary/80 cursor-pointer px-1 py-0.5 transition-colors"
            style={{ top: overflowTop }}
            onClick={(e) => {
              e.stopPropagation();
              onDateClick?.(date);
            }}
          >
            +{overflowCount} thêm
          </span>
        )}
      </div>}
    </div>
  );
}

export const DroppableDay = memo(DroppableDayInner);
