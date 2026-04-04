import { useDraggable } from "@dnd-kit/core";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { GripVertical } from "lucide-react";

interface DraggableEventProps {
  event: UnifiedCalendarEvent;
  isOverlay?: boolean;
  onClick?: () => void;
}

export function DraggableEvent({ event, isOverlay, onClick }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: !event.draggable // Ngăn kéo đối tượng nếu policy backend báo không cho phép
  });

  // Khi đang drag thực sự, làm mờ đi item gốc để nhìn thấy Overlay rõ nhất
  const style = transform && !isOverlay ? {
    opacity: isDragging ? 0.4 : 1,
  } : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group flex flex-col px-2 py-1 rounded-md text-xs border cursor-pointer select-none shrink-0 transition-all hover:brightness-95
        ${event.colorToken}
        ${isOverlay ? "shadow-xl scale-105 z-50 ring-2 ring-blue-500/50" : "shadow-sm hover:shadow-md"}
        ${!event.draggable ? "opacity-75 cursor-default" : ""}
      `}
      onClick={(e) => {
        // Chống click lan khi đang kéo hoặc click lan ra ngoài cell day
        e.stopPropagation();
        if (isDragging) {
          return;
        }
        onClick?.();
      }}
    >
      <div className="flex items-center gap-1 w-full overflow-hidden">
        {event.draggable && (
           <div 
             className="cursor-move opacity-0 group-hover:opacity-75 hover:opacity-100 shrink-0 touch-none"
             {...listeners} 
             {...attributes}
             onClick={(e) => e.stopPropagation()} // Grab handler chống onClick
           >
             <GripVertical className="w-3 h-3" />
           </div>
        )}
        <span className="font-semibold truncate flex-1 leading-tight">{event.title}</span>
      </div>
      {(event.employeeName || event.groupLabel) && (
        <span className={`truncate text-xs opacity-90 leading-tight mt-0.5 ${event.draggable ? "pl-4" : ""}`}>
          {event.employeeName ? `${event.employeeName}` : event.groupLabel}
        </span>
      )}
      
      {/* Visual Indicator of Original Bounds */}
      {event.source === "google" && (
         <div className="absolute right-1 top-1 w-1.5 h-1.5 rounded-full bg-red-400" title="Google Sync" />
      )}
    </div>
  );
}
