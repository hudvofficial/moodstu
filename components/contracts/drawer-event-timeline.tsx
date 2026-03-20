"use client";

/**
 * 📅 DrawerEventTimeline — 4-stage vertical stepper for contract events
 *
 * Shows: ngay_chup → ngay_to_chuc → hau_ky → giao_san_pham
 * Each with date, location, and status badge.
 * Data: contract_events[] from getContractById() join.
 *
 * SSOT: All display labels from types/contract-constants.ts
 */

import { Calendar, MapPin, CheckCircle, Clock, Circle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPE_MAP, TASK_STATUS_MAP } from "@/types/contract-constants";
import type { EventType, TaskStatus } from "@/types/contract";

// ─── TYPES ───────────────────────────────────────

interface ContractEvent {
  id: string;
  event_type: string;
  title: string | null;
  event_date: string | null;
  end_date?: string | null;
  location: string | null;
  status: string;
  notes?: string | null;
}

interface DrawerEventTimelineProps {
  events: ContractEvent[];
}

// ─── STATUS ICON (uses TaskStatus from SSOT) ─────

function getStatusIcon(status: string) {
  const s = status as TaskStatus;
  if (s === "hoan_thanh") return <CheckCircle className="w-4 h-4 text-success" />;
  if (s === "dang_lam") return <Clock className="w-4 h-4 text-warning" />;
  return <Circle className="w-4 h-4 text-text-muted" />;
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

  // Sort events by order from SSOT constants
  const sortedEvents = [...events].sort((a, b) => {
    const orderA = EVENT_TYPE_MAP[a.event_type as EventType]?.order ?? 99;
    const orderB = EVENT_TYPE_MAP[b.event_type as EventType]?.order ?? 99;
    return orderA - orderB;
  });

  return (
    <section className="card-base p-4">
      <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
        Lịch sự kiện
      </h4>

      <div className="flex flex-col">
        {sortedEvents.map((event, idx) => {
          const config = EVENT_TYPE_MAP[event.event_type as EventType] || {
            label: event.title || event.event_type,
            icon: "📋",
            color: "text-text-secondary",
            order: 99,
          };
          const statusInfo = TASK_STATUS_MAP[event.status as TaskStatus];
          const statusLabel = statusInfo?.label || "Chờ";
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
                    {statusLabel}
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

