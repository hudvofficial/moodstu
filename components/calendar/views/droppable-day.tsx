import { useDroppable } from "@dnd-kit/core";
import { format, isToday } from "date-fns";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { DraggableEvent } from "./draggable-event";

interface DroppableDayProps {
  date: Date;
  dateIso: string;
  isCurrentMonth: boolean;
  events: UnifiedCalendarEvent[];
  isFirstRow: boolean;
  isLastCol: boolean;
  onEventClick?: (ev: UnifiedCalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export function DroppableDay({ 
  date, 
  dateIso, 
  isCurrentMonth, 
  events, 
  isFirstRow, 
  isLastCol, 
  onEventClick,
  onDateClick
}: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dateIso
  });

  const today = isToday(date);

  return (
    <div 
      ref={setNodeRef}
      onClick={() => onDateClick?.(date)}
      className={`min-h-[120px] p-1.5 flex flex-col gap-1.5 transition-colors relative cursor-pointer hover:shadow-inner
        ${!isFirstRow ? "border-t border-slate-200" : ""} 
        ${!isLastCol ? "border-r border-slate-200" : ""}
        ${!isCurrentMonth ? "bg-slate-50 opacity-60" : "bg-white"}
        ${isOver ? "bg-blue-50/70 outline-2 outline-blue-400 -outline-offset-2 z-10 rounded-sm" : ""}
      `}
    >
      <div className="flex items-center justify-between px-1">
        <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
          ${today ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1" : 
            !isCurrentMonth ? "text-slate-400 font-medium" : "text-slate-700"}
        `}>
          {format(date, "d")}
        </span>
      </div>
      
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-1">
        {events.map((ev) => (
           <DraggableEvent key={ev.id} event={ev} onClick={() => onEventClick?.(ev)} />
        ))}
      </div>
    </div>
  );
}
