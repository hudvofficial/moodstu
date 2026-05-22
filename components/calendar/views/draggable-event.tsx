import { useDraggable } from "@dnd-kit/core";
import { type UnifiedCalendarEvent } from "@/types/calendar.types";
import { GripVertical } from "lucide-react";

interface DraggableEventProps {
  event: UnifiedCalendarEvent;
  isOverlay?: boolean;
  continuesPrior?: boolean;
  continuesNext?: boolean;
  compact?: boolean;
  dense?: boolean;
  onClick?: () => void;
}

export function DraggableEvent({
  event,
  isOverlay,
  continuesPrior,
  continuesNext,
  compact = false,
  dense = false,
  onClick,
}: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: event.id,
      data: { event },
      disabled: !event.draggable,
    });

  // Khi đang drag thực sự, làm mờ đi item gốc để nhìn thấy Overlay rõ nhất
  const style =
    transform && !isOverlay
      ? {
          opacity: isDragging ? 0.4 : 1,
        }
      : {};

  const isGoogleEvent = event.source === "google" || !!event.googleEventId;
  const googleStyle = isGoogleEvent
    ? {
        backgroundColor: event.backgroundColor || "#039be5",
        color: "#fff",
      }
    : undefined;

  let marginClasses = "mx-1";
  let radiusClasses = "rounded-md";
  let borderClasses = !isGoogleEvent ? `${event.colorToken} border-l-2 lg:border-l-[3px]` : "border-0";

  if (continuesPrior && continuesNext) {
    marginClasses = "mx-0";
    radiusClasses = "rounded-none";
    borderClasses = !isGoogleEvent ? `${event.colorToken} border-l-0` : "border-0";
  } else if (continuesPrior) {
    marginClasses = "ml-0 mr-1";
    radiusClasses = "rounded-l-none rounded-r-md";
    borderClasses = !isGoogleEvent ? `${event.colorToken} border-l-0` : "border-0";
  } else if (continuesNext) {
    marginClasses = "ml-1 mr-0";
    radiusClasses = "rounded-l-md rounded-r-none";
  }

  const layoutClasses = compact
    ? dense
      ? "flex items-center px-1 py-0 h-[15px] min-h-[15px] max-h-[15px]"
      : "flex items-center px-2 py-0.5 h-[22px] min-h-[22px] max-h-[22px]"
    : "flex flex-col px-2 py-1 h-[26px] min-h-[26px] max-h-[26px]";
  const textSizeClasses = dense ? "text-micro leading-none" : "text-xs";
  const titlePaddingClasses = isGoogleEvent && !continuesNext ? (dense ? "pr-2.5" : "pr-4") : "";

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, ...googleStyle }}
      className={`relative group min-w-0 flex-1 cursor-pointer select-none shrink-0 transition-all hover:brightness-95 overflow-hidden
        ${textSizeClasses}
        ${layoutClasses}
        ${borderClasses}
        ${radiusClasses}
        ${marginClasses}
        ${isOverlay ? "shadow-2xl z-50 ring-1 ring-black/10" : "hover:shadow-md"}
        ${!event.draggable && !isGoogleEvent ? "opacity-75 cursor-default" : ""}
        ${!event.draggable && isGoogleEvent ? "cursor-default" : ""}
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
      <div className={`flex items-center gap-1 w-full overflow-hidden`}>
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
        <span className={`truncate flex-1 min-w-0 ${titlePaddingClasses}`} title={event.title}>
          {event.title}
        </span>
      </div>

      {/* Employee/Group Area */}
      {!compact && !isGoogleEvent && (event.employeeName || event.groupLabel) && (
        <span className="truncate mt-0.5 opacity-80" title={event.employeeName ? `${event.employeeName}` : (event.groupLabel || undefined)}>
          {event.employeeName ? `${event.employeeName}` : event.groupLabel}
        </span>
      )}

      {/* Visual Indicator of Original Bounds */}
      {isGoogleEvent && !continuesNext && (
        <span
          className={`absolute right-0.5 font-bold leading-none bg-white/20 text-white ${dense ? "top-1/2 -translate-y-1/2 rounded-sm px-0.5 py-0 text-micro" : `text-micro px-1 py-0.5 rounded ${compact ? "top-1/2 -translate-y-1/2" : "top-[3px]"}`}`}
          title="Google Sync"
        >
          G
        </span>
      )}
    </div>
  );
}
