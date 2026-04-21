"use client";

/**
 * 👥 DrawerAssignments — Work task assignments summary
 *
 * Shows who is assigned to what work type, grouped by event.
 * Data: work_tasks[] from getContractById() join (includes employees).
 *
 * SSOT: All display labels from types/contract-constants.ts
 */

import { useState } from "react";
import { UserCircle } from "lucide-react";
import { WORK_TYPE_MAP, TASK_STATUS_MAP } from "@/types/contract-constants";
import type { WorkType, TaskStatus } from "@/types/contract";
import { Button } from "@/components/ui/button";

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

const MAX_ASSIGNED = 4;

export function DrawerAssignments({ tasks }: DrawerAssignmentsProps) {
  const [expanded, setExpanded] = useState(false);

  if (!tasks || tasks.length === 0) {
    return (
      <section className="card-base p-4">
        <h4 className="text-caption font-semibold text-text-secondary mb-3 uppercase tracking-wide">
          Nhân sự
        </h4>
        <p className="text-body-sm text-text-muted italic">
          Chưa có phân công
        </p>
      </section>
    );
  }

  const assigned = tasks.filter((t) => t.employees?.full_name);
  const unassigned = tasks.filter((t) => !t.employees?.full_name);
  const visibleAssigned = expanded ? assigned : assigned.slice(0, MAX_ASSIGNED);
  const hiddenAssignedCount = Math.max(0, assigned.length - MAX_ASSIGNED);
  const progressPercent = (assigned.length / tasks.length) * 100;

  return (
    <section className="card-base p-4">
      {/* Header summary */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
          Nhân sự
        </h4>
        <span className="text-tiny text-text-muted">
          {assigned.length}/{tasks.length} gán
        </span>
      </div>

      {/* Thin progress bar */}
      <div className="h-1 bg-border/30 rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Warning block: unassigned tasks */}
      {unassigned.length > 0 && (
        <div className="bg-warning/5 rounded-md px-3 py-2 mb-2">
          <p className="text-tiny font-medium text-warning">
            ⚠️ {unassigned.length} chưa gán
          </p>
          <p className="text-tiny text-text-muted mt-0.5 line-clamp-2">
            {unassigned
              .slice(0, 5)
              .map((t) => getWorkLabel(t.work_type))
              .join(" · ")}
            {unassigned.length > 5 && ` · +${unassigned.length - 5}`}
          </p>
        </div>
      )}

      {/* Assigned list (compact) */}
      {visibleAssigned.length > 0 && (
        <div className="flex flex-col gap-1">
          {visibleAssigned.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-hover/50 transition-colors"
            >
              <UserCircle className="w-4 h-4 text-text-muted shrink-0" />
              <span className="text-body-sm font-medium text-text-main truncate flex-1">
                {task.employees!.full_name}
              </span>
              <span className="text-tiny text-text-muted shrink-0">
                {getWorkLabel(task.work_type)}
              </span>
              <span
                className={`text-tiny px-1.5 py-0.5 rounded-full font-medium shrink-0 ${getStatusStyle(task.status)}`}
              >
                {getStatusText(task.status)}
              </span>
            </div>
          ))}
          {hiddenAssignedCount > 0 && (
            <Button unstyled
              onClick={() => setExpanded(!expanded)}
              className="text-tiny text-primary hover:text-primary/80 text-center py-0.5 w-full transition-colors"
            >
              {expanded
                ? "Thu gọn"
                : `+${hiddenAssignedCount} nhân sự khác`}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
