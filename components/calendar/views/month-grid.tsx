"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from "date-fns";
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
import { DraggableEvent } from "./draggable-event";
import { MonthWeekRow } from "./month-week-row";
import { buildWeekEventSegments } from "@/lib/utils/calendar-utils";

interface MonthGridProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  mutate: () => void;
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function MonthGrid({
  currentDate,
  events,
  mutate,
  onEventClick,
  onDateClick,
}: MonthGridProps) {
  const [activeEvent, setActiveEvent] = useState<UnifiedCalendarEvent | null>(
    null,
  );
  const [activeRect, setActiveRect] = useState<{ width: number; height: number } | null>(null);

  // Tạo mảng ngày 7 cột (Bao gồm đầu/cuối của tháng trước/sau nếu cần filler)
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    // weekStartsOn: 1 (Monday)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const weeksInGrid = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < daysInGrid.length; i += 7) {
      weeks.push(daysInGrid.slice(i, i + 7));
    }
    return weeks;
  }, [daysInGrid]);

  // Mảng segments cache lại cho toàn bộ grid, tránh tính lại n lần trong mỗi hàng.
  const weekSegments = useMemo(() => {
    return new Map(
      weeksInGrid.map((week) => [
        format(week[0], "yyyy-MM-dd"),
        buildWeekEventSegments(events, week[0], week[week.length - 1]),
      ]),
    );
  }, [events, weeksInGrid]);

  // Yêu cầu kéo giãn 5px mới tính là drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ev = events.find((e) => e.id === active.id);
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

    // active.id = eventId, over.id = dateIso (YYYY-MM-DD local)
    const eventId = String(active.id);
    const newDateIso = String(over.id);

    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;

    // Tách lấy phần YYYY-MM-DD cũ
    const oldDateStr = ev.start.split("T")[0];
    if (oldDateStr === newDateIso) return; // Không đổi ngày

    // Nếu old start có giờ, bảo toàn giờ khi chuyển sang ngày mới
    let finalNewStart = newDateIso;
    if (ev.start.includes("T")) {
      const timePart = ev.start.split("T")[1];
      finalNewStart = `${newDateIso}T${timePart}`;
    }

    try {
      const res = await updateDragDropDate(
        eventId,
        ev.source,
        finalNewStart,
        ev.start, // Gửi kèm originalDate để tính toán Shift đối với Task
      );

      if (!res.success) {
        // Handle Action Result
        const rawRes = res as { success: false; error?: string };
        const errMsg = rawRes.error || "Lỗi cập nhật lịch";
        toast.error(errMsg);
        return;
      }

      // Mutate SWR sau khi backend đã gật đầu
      toast.success("Đã thay đổi lịch trình!");
      mutate();
    } catch (err) {
      console.error("[MonthGrid] Error catching updateDragDropDate:", err);
      toast.error("Lỗi kết nối");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full flex-1 min-h-0 flex flex-col relative overflow-hidden">
        {/* Header Days */}
        <div className="grid grid-cols-7 bg-bg-input border-b border-border sticky top-0 z-10 shrink-0">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, i) => (
            <div
              key={day}
              className={`py-2 text-center text-xs font-semibold uppercase tracking-wider
                ${i >= 5 ? "font-bold" : "text-text-muted"}
              `}
              style={
                i >= 5 ? { color: "var(--color-text-weekend)" } : undefined
              }
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid Body */}
        {/* Absolute Container để chống phình To Height do tính chất min-content của Flexbox */}
        <div className="flex-1 relative min-h-0">
          <div
            className="absolute inset-0 flex flex-col overflow-y-auto overflow-x-hidden"
          >
            {weeksInGrid.map((week) => {
              const weekKey = format(week[0], "yyyy-MM-dd");
              return (
              <MonthWeekRow
                key={weekKey}
                days={week}
                currentDate={currentDate}
                events={events}
                precomputedSegments={weekSegments.get(weekKey)}
                onEventClick={onEventClick}
                onDateClick={onDateClick}
              />
            );})}
          </div>
        </div>
      </div>

      {/* Drag Overlay for smooth visual preview */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeEvent ? (
          <div 
            className="opacity-90 pointer-events-none"
            style={{ width: activeRect?.width || 192, height: activeRect?.height || 26 }}
          >
            <DraggableEvent event={activeEvent} isOverlay compact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
