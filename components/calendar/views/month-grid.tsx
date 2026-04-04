"use client";

import { useMemo, useState } from "react";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval,
  format,
  isSameMonth,
} from "date-fns";
import { 
  DndContext, 
  DragOverlay, 
  closestCenter, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  DragEndEvent, 
  DragStartEvent 
} from "@dnd-kit/core";
import { toast } from "sonner";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { updateDragDropDate } from "@/app/actions/calendar-mutations";
import { DroppableDay } from "./droppable-day";
import { DraggableEvent } from "./draggable-event";

interface MonthGridProps {
  currentDate: Date;
  events: UnifiedCalendarEvent[];
  mutate: () => void;
  onEventClick?: (event: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function MonthGrid({ currentDate, events, mutate, onEventClick, onDateClick }: MonthGridProps) {
  const [activeEvent, setActiveEvent] = useState<UnifiedCalendarEvent | null>(null);

  // Tạo mảng ngày 7 cột (Bao gồm đầu/cuối của tháng trước/sau nếu cần filler)
  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    // weekStartsOn: 1 (Monday)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Yêu cầu kéo giãn 5px mới tính là drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, 
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ev = events.find(e => e.id === active.id);
    if (ev) setActiveEvent(ev);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);
    if (!over) return;
    
    // active.id = eventId, over.id = dateIso (YYYY-MM-DD local)
    const eventId = String(active.id);
    const newDateIso = String(over.id);
    
    const ev = events.find(e => e.id === eventId);
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
        ev.start // Gửi kèm originalDate để tính toán Shift đối với Task
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
      <div className="w-full h-full flex flex-col bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        {/* Header Days */}
        <div className="grid grid-cols-7 border-b bg-slate-50 sticky top-0 z-10">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, i) => (
            <div 
              key={day} 
              className={`py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider
                ${i !== 6 ? "border-r border-slate-200" : ""}
              `}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid Body */}
        {/* repeat auto-fill để fit Grid chuẩn nhất cho các loại màn hình (minimum 120px 1 ô) */}
        <div className="flex-1 grid grid-cols-7 grid-rows-[repeat(auto-fill,minmax(120px,1fr))] auto-rows-[minmax(120px,1fr)]">
          {daysInGrid.map((date, idx) => {
            const dateIso = format(date, "yyyy-MM-dd");
            const isCurrentMonth = isSameMonth(date, currentDate);
            // So khớp với format YYYY-MM-DD bảo toàn Time
            const eventsForDay = events.filter(e => {
              const startIsoDate = e.start.split("T")[0];
              return startIsoDate === dateIso;
            });
            
            return (
              <DroppableDay 
                key={dateIso} 
                date={date} 
                dateIso={dateIso}
                isCurrentMonth={isCurrentMonth}
                events={eventsForDay}
                isFirstRow={idx < 7}
                isLastCol={(idx + 1) % 7 === 0}
                onEventClick={onEventClick}
                onDateClick={onDateClick}
              />
            );
          })}
        </div>
      </div>
      
      {/* Drag Overlay for smooth visual preview */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeEvent ? (
          <div className="opacity-90 pointer-events-none w-48">
            <DraggableEvent event={activeEvent} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
