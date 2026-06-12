import { useEffect, useMemo, useRef, useState } from "react";
import { format, isSameMonth } from "date-fns";
import { type UnifiedCalendarEvent } from "@/types/calendar.types";
import { buildWeekEventSegments, type WeekEventSegment } from "@/lib/utils/calendar-utils";
import { Button } from "@/components/ui/button";
import { DroppableDay } from "./droppable-day";
import { DraggableEvent } from "./draggable-event";

const DESKTOP_DAY_HEADER_OFFSET = 34;
const MOBILE_DAY_HEADER_OFFSET = 26;
const DESKTOP_EVENT_LAYER_BOTTOM = 2;
const MOBILE_EVENT_LAYER_BOTTOM = 1;
const DESKTOP_EVENT_ROW_HEIGHT = 22;
const MOBILE_EVENT_ROW_HEIGHT = 15;
const DESKTOP_EVENT_ROW_GAP = 2;
const MOBILE_EVENT_ROW_GAP = 1;
const DESKTOP_MORE_LINK_HEIGHT = 18;
const MOBILE_MORE_LINK_HEIGHT = 14;
const DENSE_ROW_WIDTH = 768;
const WEEK_COLUMNS = 7;

interface MonthWeekRowProps {
  days: Date[];
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  precomputedSegments?: WeekEventSegment[];
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function MonthWeekRow({
  days,
  currentDate,
  events,
  precomputedSegments,
  onEventClick,
  onDateClick,
}: MonthWeekRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [rowSize, setRowSize] = useState({ width: 0, height: 0 });
  const isDense = rowSize.width > 0 && rowSize.width < DENSE_ROW_WIDTH;
  const dayHeaderOffset = isDense ? MOBILE_DAY_HEADER_OFFSET : DESKTOP_DAY_HEADER_OFFSET;
  const eventLayerBottom = isDense ? MOBILE_EVENT_LAYER_BOTTOM : DESKTOP_EVENT_LAYER_BOTTOM;
  const eventRowHeight = isDense ? MOBILE_EVENT_ROW_HEIGHT : DESKTOP_EVENT_ROW_HEIGHT;
  const eventRowGap = isDense ? MOBILE_EVENT_ROW_GAP : DESKTOP_EVENT_ROW_GAP;
  const moreLinkHeight = isDense ? MOBILE_MORE_LINK_HEIGHT : DESKTOP_MORE_LINK_HEIGHT;
  const rowPitch = eventRowHeight + eventRowGap;

  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      setRowSize({ width: rect.width, height: rect.height });
    };
    updateSize();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setRowSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const segments = useMemo(() => {
    if (days.length === 0) return [];
    if (precomputedSegments) return precomputedSegments;
    return buildWeekEventSegments(events, days[0], days[days.length - 1]);
  }, [days, events, precomputedSegments]);

  const visibleLaneLimit = useMemo(() => {
    const eventAreaHeight = Math.max(0, rowSize.height - dayHeaderOffset - eventLayerBottom);
    if (!eventAreaHeight) return 3;

    const rowsWithoutOverflow = Math.floor((eventAreaHeight + eventRowGap) / rowPitch);
    const hasOverflow = segments.some((segment) => segment.lane >= rowsWithoutOverflow);
    if (!hasOverflow) return Math.max(0, rowsWithoutOverflow);

    const rowsWithMoreLink = Math.floor((eventAreaHeight - moreLinkHeight) / rowPitch);
    return Math.max(0, rowsWithMoreLink);
  }, [dayHeaderOffset, eventLayerBottom, eventRowGap, moreLinkHeight, rowPitch, rowSize.height, segments]);

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
        className="pointer-events-none absolute inset-x-0 z-20 grid grid-cols-7"
        style={{ top: dayHeaderOffset, bottom: eventLayerBottom }}
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
                height: eventRowHeight,
                transform: `translateY(${segment.lane * rowPitch}px)`,
              }}
            >
              <DraggableEvent
                event={segment.event}
                continuesPrior={segment.continuesPrior}
                continuesNext={segment.continuesNext}
                compact
                dense={isDense}
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
              className={`pointer-events-auto block overflow-hidden px-1 text-left font-medium text-primary hover:text-primary/80 ${isDense ? "text-micro" : "text-xs"}`}
              style={{
                gridColumn: `${col + 1} / span 1`,
                gridRow: 1,
                height: moreLinkHeight,
                lineHeight: `${moreLinkHeight}px`,
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
