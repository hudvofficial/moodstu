import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { UnifiedCalendarEvent } from "@/types/calendar.types";
import { getCalendarStatusLabel } from "@/lib/utils/calendar-utils";

interface DraggableEventProps {
  event: UnifiedCalendarEvent;
  isOverlay?: boolean;
  onClick?: () => void;
}

const SOURCE_LABELS: Record<UnifiedCalendarEvent["source"], string> = {
  schedule: "Lịch",
  task: "Việc",
  google: "Google",
};

function formatTime(value: string) {
  if (!value.includes("T")) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.split("T")[1]?.slice(0, 5) || null;
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function DraggableEvent({ event, isOverlay, onClick }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
    disabled: !event.draggable,
  });

  const isGoogleEvent = event.source === "google" || !!event.googleEventId;
  const startTime = formatTime(event.start);
  const style = {
    ...(transform && !isOverlay ? { opacity: isDragging ? 0.4 : 1 } : {}),
    ...(isGoogleEvent ? {
      backgroundColor: event.backgroundColor || "#039be5",
      color: "#fff",
    } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={`${SOURCE_LABELS[event.source]} · ${event.title} · ${getCalendarStatusLabel(event.status)}`}
      className={`group relative flex min-h-9 shrink-0 cursor-pointer select-none flex-col rounded-md px-2 py-1 text-xs transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
        ${!isGoogleEvent ? `${event.colorToken} border-l-2` : "border-0 shadow-sm"}
        ${isOverlay ? "z-50 scale-105 shadow-xl ring-2 ring-primary/50" : "hover:shadow-sm"}
        ${!event.draggable ? "cursor-default opacity-85" : ""}
      `}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onClick?.();
      }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {event.draggable && (
          <div
            className="shrink-0 touch-none cursor-move opacity-0 transition-opacity group-hover:opacity-70"
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-3" />
          </div>
        )}
        <span className="min-w-0 flex-1 truncate font-semibold leading-tight">{event.title}</span>
        <span className={`shrink-0 rounded px-1 py-0.5 text-micro font-bold leading-none ${isGoogleEvent ? "bg-white/20 text-white" : "bg-bg-card/80 text-text-muted"}`}>
          {SOURCE_LABELS[event.source]}
        </span>
      </div>

      <div className={`mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs leading-tight opacity-85 ${event.draggable ? "pl-4" : ""}`}>
        {startTime && <span className="shrink-0">{startTime}</span>}
        {!isGoogleEvent && (event.employeeName || event.groupLabel) && (
          <span className="truncate">{event.employeeName || event.groupLabel}</span>
        )}
      </div>
    </div>
  );
}
