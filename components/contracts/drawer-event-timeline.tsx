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
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateEventStatus } from "@/app/actions/contract-event-actions";
import { Button } from "@/components/ui/button";
import { contractKeys, markContractSelfMutation } from "@/lib/hooks/use-contract-queries";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { toast } from "sonner";
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
  start_time?: string | null;
  end_time?: string | null;
  deadline?: string | null;
  location: string | null;
  status: string;
  notes?: string | null;
  sort_order?: number;
}

interface DrawerEventTimelineProps {
  contractId?: string;
  events: ContractEvent[];
}

type DrawerExtraShape = Awaited<
  ReturnType<typeof import("@/lib/client-direct/contract-drawer").fetchContractDrawerExtraClient>
>["data"];

const NEXT_STATUS: Record<
  Exclude<TaskStatus, "da_huy">,
  Exclude<TaskStatus, "da_huy">
> = {
  chua_lam: "dang_lam",
  dang_lam: "hoan_thanh",
  hoan_thanh: "chua_lam",
};

// ─── STATUS ICON (uses TaskStatus from SSOT) ─────

function getStatusIcon(status: string) {
  const s = status as TaskStatus;
  if (s === "hoan_thanh") return <CheckCircle className="w-4 h-4 text-success" />;
  if (s === "dang_lam") return <Clock className="w-4 h-4 text-warning" />;
  return <Circle className="w-4 h-4 text-text-muted" />;
}

// ─── COMPONENT ───────────────────────────────────

export function DrawerEventTimeline({ contractId, events }: DrawerEventTimelineProps) {
  const queryClient = useQueryClient();

  const handleStatusChange = useCallback(async (event: ContractEvent) => {
    if (!contractId || event.status === "da_huy") return;

    const currentStatus = event.status as Exclude<TaskStatus, "da_huy">;
    const nextStatus = NEXT_STATUS[currentStatus];

    await runOptimisticMutation({
      apply: () => {
        markContractSelfMutation();
        queryClient.setQueryData(
          contractKeys.drawerExtra(contractId),
          (old: DrawerExtraShape | undefined) =>
            old
              ? {
                  ...old,
                  events: old.events.map((cachedEvent) =>
                    cachedEvent.id === event.id
                      ? { ...cachedEvent, status: nextStatus }
                      : cachedEvent,
                  ),
                }
              : old,
        );
      },
      rollback: () => {
        queryClient.setQueryData(
          contractKeys.drawerExtra(contractId),
          (old: DrawerExtraShape | undefined) =>
            old
              ? {
                  ...old,
                  events: old.events.map((cachedEvent) =>
                    cachedEvent.id === event.id
                      ? { ...cachedEvent, status: currentStatus }
                      : cachedEvent,
                  ),
                }
              : old,
        );
      },
      action: () => updateEventStatus(event.id, nextStatus),
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Lỗi cập nhật trạng thái sự kiện",
        );
      },
    });
  }, [contractId, queryClient]);
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

  // Persisted sort_order is the business sequence; event type is fallback for legacy rows.
  const sortedEvents = [...events].sort((a, b) => {
    if (a.sort_order !== undefined && b.sort_order !== undefined && a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
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
          const todayStr = new Date().toLocaleDateString("en-CA");
          const comparisonDate = (event.deadline ?? event.event_date ?? "").slice(0, 10);
          const isOverdue =
            event.status !== "hoan_thanh" &&
            event.status !== "da_huy" &&
            comparisonDate !== "" &&
            comparisonDate < todayStr;
          const statusControl = event.status === "da_huy" || !contractId ? (
            <span className="inline-flex items-center gap-1 text-tiny text-text-muted shrink-0">
              {getStatusIcon(event.status)}
              {statusLabel}
            </span>
          ) : (
            <Button
              unstyled
              type="button"
              onClick={() => void handleStatusChange(event)}
              className="inline-flex cursor-pointer items-center gap-1 text-tiny text-text-muted shrink-0 transition-transform active:scale-95"
            >
              {getStatusIcon(event.status)}
              {statusLabel}
            </Button>
          );

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
              {event.status === "hoan_thanh" ? (
                /* Compact: completed events → 1 dòng */
                <div className={`flex-1 ${isLast ? "" : "pb-2"}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm leading-none shrink-0">{config.icon}</span>
                    <span className="text-body-sm font-medium text-text-main truncate">
                      {config.label}
                    </span>
                    {event.event_date && (
                      <span className="text-tiny text-text-muted shrink-0">
                        · {formatDate(event.event_date)}
                      </span>
                    )}
                    {event.location && (
                      <span className="text-tiny text-text-muted truncate">
                        · {event.location}
                      </span>
                    )}
                    <span className="ml-auto">{statusControl}</span>
                  </div>
                </div>
              ) : (
                /* Full: pending/in-progress events → title + date + location */
                <div className={`flex-1 ${isLast ? "" : "pb-2"}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm leading-none">{config.icon}</span>
                    <span className="text-body-sm font-medium text-text-main">
                      {config.label}
                    </span>
                    <span className="ml-auto">{statusControl}</span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-text-muted" />
                      {event.event_date ? (
                        <span className={`text-tiny ${isOverdue ? "text-error" : "text-text-secondary"}`}>
                          {formatDate(event.event_date)}
                          {event.start_time && (
                            <>
                              {` · ${event.start_time.slice(0, 5)}`}
                              {event.end_time && `–${event.end_time.slice(0, 5)}`}
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-tiny text-text-muted italic">
                          Chưa xếp lịch
                        </span>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-text-muted" />
                        <span className="text-tiny text-text-secondary truncate max-w-45">
                          {event.location}
                        </span>
                      </div>
                    )}
                    {event.status !== "hoan_thanh" &&
                      event.status !== "da_huy" &&
                      event.deadline && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-text-muted" />
                          <span className={`text-tiny ${isOverdue ? "text-error" : "text-text-secondary"}`}>
                            Hạn: {formatDate(event.deadline)}
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
