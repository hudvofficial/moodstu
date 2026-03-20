"use client";

/**
 * 📅 DrawerEventTimeline — 4-stage vertical stepper for contract events
 *
 * Shows: NGÀY CHỤP → NGÀY TỔ CHỨC → HẬU KỲ → GIAO SẢN PHẨM
 * Each with date, location, and status badge.
 * Data: contract_events[] from getContractById() join.
 */

import { Calendar, MapPin, CheckCircle, Clock, Circle } from "lucide-react";
import { formatDate } from "@/lib/utils";

// ─── TYPES ───────────────────────────────────────

interface ContractEvent {
  id: string;
  event_type: string;
  title?: string;
  event_date: string | null;
  end_date?: string | null;
  location: string | null;
  status: string;
  notes?: string | null;
}

interface DrawerEventTimelineProps {
  events: ContractEvent[];
}

// ─── CONSTANTS ───────────────────────────────────

const EVENT_ORDER = [
  "NGÀY CHỤP",
  "NGÀY TỔ CHỨC",
  "HẬU KỲ",
  "GIAO SẢN PHẨM",
] as const;

const EVENT_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  "NGÀY CHỤP": { label: "Ngày Chụp", icon: "📸", color: "text-blue-600" },
  "NGÀY TỔ CHỨC": { label: "Ngày Tổ Chức", icon: "💒", color: "text-purple-600" },
  "HẬU KỲ": { label: "Hậu Kỳ", icon: "✏️", color: "text-amber-600" },
  "GIAO SẢN PHẨM": { label: "Giao Sản Phẩm", icon: "📦", color: "text-green-600" },
};

function getStatusIcon(status: string) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle className="w-4 h-4 text-success" />;
    case "IN_PROGRESS":
      return <Clock className="w-4 h-4 text-warning" />;
    default:
      return <Circle className="w-4 h-4 text-text-muted" />;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "Hoàn thành";
    case "IN_PROGRESS":
      return "Đang thực hiện";
    default:
      return "Chờ";
  }
}

// ─── COMPONENT ───────────────────────────────────

export function DrawerEventTimeline({ events }: DrawerEventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <section className="card-base p-4">
        <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
          Lịch sự kiện
        </h4>
        <p className="text-body-sm text-text-muted italic">
          Chưa có lịch sự kiện
        </p>
      </section>
    );
  }

  // Sort events by EVENT_ORDER
  const sortedEvents = [...events].sort((a, b) => {
    const idxA = EVENT_ORDER.indexOf(a.event_type as typeof EVENT_ORDER[number]);
    const idxB = EVENT_ORDER.indexOf(b.event_type as typeof EVENT_ORDER[number]);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return (
    <section className="card-base p-4">
      <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
        Lịch sự kiện
      </h4>

      <div className="flex flex-col">
        {sortedEvents.map((event, idx) => {
          const config = EVENT_CONFIG[event.event_type] || {
            label: event.title || event.event_type,
            icon: "📋",
            color: "text-text-secondary",
          };
          const isLast = idx === sortedEvents.length - 1;

          return (
            <div key={event.id} className="flex gap-3">
              {/* Stepper line + icon */}
              <div className="flex flex-col items-center">
                <div className="mt-0.5">{getStatusIcon(event.status)}</div>
                {!isLast && (
                  <div className="w-px flex-1 bg-border/50 my-1" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 ${isLast ? "" : "pb-4"}`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm leading-none">{config.icon}</span>
                  <span className="text-body-sm font-medium text-text-main">
                    {config.label}
                  </span>
                  <span className="text-tiny text-text-muted ml-auto">
                    {getStatusLabel(event.status)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {event.event_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-text-muted" />
                      <span className="text-tiny text-text-secondary">
                        {formatDate(event.event_date)}
                      </span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-text-muted" />
                      <span className="text-tiny text-text-secondary truncate max-w-[180px]">
                        {event.location}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
