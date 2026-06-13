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

  const isExternalGoogleEvent = event.source === "google";
  const isSyncedToGoogle = !!event.googleEventId;
  const googleStyle = isExternalGoogleEvent
    ? {
        backgroundColor: event.backgroundColor || "#039be5",
        color: "#fff",
      }
    : undefined;

  let marginClasses = "mx-1";
  let radiusClasses = "rounded-md";
  let borderClasses = !isExternalGoogleEvent ? `${event.colorToken} border-l-2 lg:border-l-[3px]` : "border-0";

  if (continuesPrior && continuesNext) {
    marginClasses = "mx-0";
    radiusClasses = "rounded-none";
    borderClasses = !isExternalGoogleEvent ? `${event.colorToken} border-l-0` : "border-0";
  } else if (continuesPrior) {
    marginClasses = "ml-0 mr-1";
    radiusClasses = "rounded-l-none rounded-r-md";
    borderClasses = !isExternalGoogleEvent ? `${event.colorToken} border-l-0` : "border-0";
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
  const titlePaddingClasses = isExternalGoogleEvent && !continuesNext ? (dense ? "pr-2.5" : "pr-4") : "";

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
        ${!event.draggable && !isExternalGoogleEvent ? "opacity-75 cursor-default" : ""}
        ${!event.draggable && isExternalGoogleEvent ? "cursor-default" : ""}
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
        {isExternalGoogleEvent && !continuesPrior && (
          <span className={`shrink-0 rounded-sm bg-white/20 font-bold leading-none text-white ${dense ? "px-[3px] py-px text-micro" : "px-1 text-tiny"}`}>
            G
          </span>
        )}
        {isSyncedToGoogle && !isExternalGoogleEvent && !continuesPrior && (
          <span className="shrink-0 text-micro font-bold opacity-60 leading-none" title="Đã đồng bộ lên Google Calendar">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          </span>
        )}
        <span className={`truncate flex-1 min-w-0 ${titlePaddingClasses}`} title={event.title}>
          {event.title}
        </span>
      </div>

      {/* Employee/Group Area */}
      {!compact && !isExternalGoogleEvent && (event.employeeName || event.groupLabel) && (
        <span className="truncate mt-0.5 opacity-80" title={event.employeeName ? `${event.employeeName}` : (event.groupLabel || undefined)}>
          {event.employeeName ? `${event.employeeName}` : event.groupLabel}
        </span>
      )}

      {/* Visual Indicator of Original Bounds */}
      {isExternalGoogleEvent && !continuesNext && (
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
