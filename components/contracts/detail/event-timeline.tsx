import { CalendarDays, MapPin, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getEventTypeLabel } from "@/types/contract-constants";
import type { ContractEvent, WorkTask, TaskStatus, EventType } from "@/types/contract";

// ═══════════════════════════════════════════
// EventTimeline — Event cards with task count
// SSOT: Display labels from types/contract-constants.ts
// ═══════════════════════════════════════════

interface Props {
  events: ContractEvent[];
  tasks: WorkTask[];
}

// ─── Status config ────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; variant: "warning" | "info" | "success" | "error" }> = {
  chua_lam: {
    icon: <Clock size={14} />,
    variant: "warning",
  },
  dang_lam: {
    icon: <Clock size={14} />,
    variant: "info",
  },
  hoan_thanh: {
    icon: <CheckCircle2 size={14} />,
    variant: "success",
  },
  da_huy: {
    icon: <XCircle size={14} />,
    variant: "error",
  },
};

export default function EventTimeline({ events, tasks }: Props) {
  // Sort events by date ascending
  const sorted = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="card-base p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Lịch trình sự kiện
          </h3>
        </div>
        <div className="py-6 text-center">
          <CalendarDays size={28} className="mx-auto text-text-muted mb-2" />
          <p className="text-body-sm text-text-muted">Chưa có sự kiện nào</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Lịch trình sự kiện
          </h3>
        </div>
        <Badge variant="neutral">{sorted.length} sự kiện</Badge>
      </div>

      {/* Event Cards */}
      <div className="space-y-3">
        {sorted.map((event) => {
          // Count tasks for this event
          const eventTasks = tasks.filter((t) => t.event_id === event.id);
          const doneTasks = eventTasks.filter(
            (t) => t.status === "hoan_thanh"
          ).length;
          const statusInfo = STATUS_CONFIG[event.status] || STATUS_CONFIG.chua_lam;

          return (
            <div
              key={event.id}
              className="p-3 rounded-xl bg-bg-hover/40 hover:bg-bg-hover transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-text-primary truncate">
                    {event.title ||
                      getEventTypeLabel(event.event_type as EventType) ||
                      event.event_type}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-caption flex items-center gap-1">
                      <CalendarDays size={12} />
                      {formatDate(event.event_date)}
                    </span>
                    {event.location && (
                      <span className="text-caption flex items-center gap-1 truncate">
                        <MapPin size={12} />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <Badge variant={statusInfo.variant}>
                  {statusInfo.icon}
                </Badge>
              </div>

              {/* Task count */}
              {eventTasks.length > 0 && (
                <div className="mt-2 pt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${eventTasks.length > 0 ? (doneTasks / eventTasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-caption font-bold shrink-0">
                    {doneTasks}/{eventTasks.length}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
