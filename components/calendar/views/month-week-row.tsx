import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameMonth } from "date-fns";
import { type UnifiedCalendarEvent } from "@/types/calendar.types";
import { buildWeekEventSegments } from "@/lib/utils/calendar-utils";
import { Button } from "@/components/ui/button";
import { DroppableDay } from "./droppable-day";
import { DraggableEvent } from "./draggable-event";

const DAY_HEADER_OFFSET = 34;
const EVENT_LAYER_BOTTOM = 2;
const EVENT_ROW_HEIGHT = 22;
const EVENT_ROW_GAP = 2;
const MORE_LINK_HEIGHT = 18;
const WEEK_COLUMNS = 7;

interface MonthWeekRowProps {
  days: Date[];
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function MonthWeekRow({
  days,
  currentDate,
  events,
  onEventClick,
  onDateClick,
}: MonthWeekRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const rowPitch = EVENT_ROW_HEIGHT + EVENT_ROW_GAP;

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;

    const updateHeight = () => setRowHeight(node.getBoundingClientRect().height);
    updateHeight();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setRowHeight(entry.contentRect.height);
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const segments = useMemo(() => {
    if (days.length === 0) return [];
    return buildWeekEventSegments(events, days[0], days[days.length - 1]);
  }, [days, events]);

  const visibleLaneLimit = useMemo(() => {
    const eventAreaHeight = Math.max(0, rowHeight - DAY_HEADER_OFFSET - EVENT_LAYER_BOTTOM);
    if (!eventAreaHeight) return 3;

    const rowsWithoutOverflow = Math.floor((eventAreaHeight + EVENT_ROW_GAP) / rowPitch);
    const hasOverflow = segments.some((segment) => segment.lane >= rowsWithoutOverflow);
    if (!hasOverflow) return Math.max(0, rowsWithoutOverflow);

    const rowsWithMoreLink = Math.floor((eventAreaHeight - MORE_LINK_HEIGHT) / rowPitch);
    return Math.max(0, rowsWithMoreLink);
  }, [rowHeight, rowPitch, segments]);

  const hiddenCounts = useMemo(() => {
    const counts = Array(WEEK_COLUMNS).fill(0) as number[];

    for (const segment of segments) {
      if (segment.lane < visibleLaneLimit) continue;

      for (let col = segment.startCol; col <= segment.endCol; col++) {
        counts[col] += 1;
      }
    }

    return counts;
  }, [segments, visibleLaneLimit]);

  return (
    <div ref={rowRef} className="relative grid flex-1 grid-cols-7 overflow-hidden" style={{ minHeight: 110 }}>
      {days.map((date) => {
        const dateIso = format(date, "yyyy-MM-dd");

        return (
          <DroppableDay
            key={dateIso}
            date={date}
            dateIso={dateIso}
            isCurrentMonth={isSameMonth(date, currentDate)}
            slots={[]}
            renderEvents={false}
            onDateClick={onDateClick}
          />
        );
      })}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-1 z-20 grid grid-cols-7"
        style={{ top: DAY_HEADER_OFFSET }}
      >
        {segments
          .filter((segment) => segment.lane < visibleLaneLimit)
          .map((segment) => (
            <div
              key={`${segment.event.id}-${segment.startCol}-${segment.lane}`}
              className="pointer-events-auto min-w-0"
              style={{
                gridColumn: `${segment.startCol + 1} / span ${segment.spanDays}`,
                gridRow: 1,
                height: EVENT_ROW_HEIGHT,
                transform: `translateY(${segment.lane * rowPitch}px)`,
              }}
            >
              <DraggableEvent
                event={segment.event}
                continuesPrior={segment.continuesPrior}
                continuesNext={segment.continuesNext}
                compact
                onClick={() => onEventClick?.(segment.event)}
              />
            </div>
          ))}

        {hiddenCounts.map((count, col) => {
          if (count <= 0) return null;

          return (
            <Button
              key={`more-${col}`}
              unstyled
              type="button"
              className="pointer-events-auto block overflow-hidden px-1 text-left text-xs font-medium text-primary hover:text-primary/80"
              style={{
                gridColumn: `${col + 1} / span 1`,
                gridRow: 1,
                height: MORE_LINK_HEIGHT,
                lineHeight: `${MORE_LINK_HEIGHT}px`,
                transform: `translateY(${visibleLaneLimit * rowPitch}px)`,
              }}
              onClick={(event) => {
                event.stopPropagation();
                onDateClick?.(days[col]);
              }}
            >
              +{count} thêm
            </Button>
          );
        })}
      </div>
    </div>
  );
}
