"use client";

/**
 * 👥 DrawerAssignments — Work task assignments summary
 *
 * Shows who is assigned to what work type, grouped by event.
 * Data: work_tasks[] from getContractById() join (includes employees).
 *
 * SSOT: All display labels from types/contract-constants.ts
 */

import { UserCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { WORK_TYPE_MAP, TASK_STATUS_MAP } from "@/types/contract-constants";
import type { WorkType, TaskStatus } from "@/types/contract";

// ─── TYPES ───────────────────────────────────────

interface WorkTask {
  id: string;
  work_type: string;
  assigned_to: string | null;
  status: string;
  deadline: string | null;
  start_date?: string | null;
  completion_date?: string | null;
  cost: number;
  notes: string | null;
  employees?: { id: string; full_name: string } | null;
}

interface DrawerAssignmentsProps {
  tasks: WorkTask[];
}

// ─── STATUS BADGE STYLES ─────────────────────────

const VARIANT_STYLES: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  muted: "bg-text-muted/10 text-text-muted",
};

function getStatusStyle(status: string): string {
  const info = TASK_STATUS_MAP[status as TaskStatus];
  return VARIANT_STYLES[info?.variant || "muted"] || VARIANT_STYLES.muted;
}

function getStatusText(status: string): string {
  return TASK_STATUS_MAP[status as TaskStatus]?.label || "Chờ";
}

function getWorkLabel(workType: string): string {
  return WORK_TYPE_MAP[workType as WorkType] || workType;
}

// ─── COMPONENT ───────────────────────────────────

const MAX_VISIBLE = 5;

export function DrawerAssignments({ tasks }: DrawerAssignmentsProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <section className="card-base p-4">
        <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
          Phân công
        </h4>
        <p className="text-body-sm text-text-muted italic">
          Chưa có phân công
        </p>
      </section>
    );
  }

  const visibleTasks = tasks.slice(0, MAX_VISIBLE);
  const hiddenCount = tasks.length - MAX_VISIBLE;

  return (
    <section className="card-base p-4">
      <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
        Phân công ({tasks.length})
      </h4>

      <div className="flex flex-col gap-2">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-hover/50 transition-colors"
          >
            {/* Avatar placeholder */}
            <UserCircle className="w-5 h-5 text-text-muted shrink-0" />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-body-sm font-medium text-text-main truncate">
                  {task.employees?.full_name || "Chưa gán"}
                </span>
                <span
                  className={`text-tiny px-1.5 py-0.5 rounded-full font-medium ${getStatusStyle(task.status)}`}
                >
                  {getStatusText(task.status)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-tiny text-text-muted">
                  {getWorkLabel(task.work_type)}
                </span>
                {task.deadline && (
                  <span className="flex items-center gap-0.5 text-tiny text-text-muted">
                    <Clock className="w-3 h-3" />
                    {formatDate(task.deadline)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {hiddenCount > 0 && (
          <p className="text-tiny text-text-muted text-center py-1">
            + {hiddenCount} phân công khác
          </p>
        )}
      </div>
    </section>
  );
}
