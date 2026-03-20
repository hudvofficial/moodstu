"use client";

/**
 * 👥 DrawerAssignments — Work task assignments summary
 *
 * Shows who is assigned to what work type, grouped by event.
 * Data: work_tasks[] from getContractById() join (includes employees).
 */

import { UserCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

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

// ─── CONSTANTS ───────────────────────────────────

const WORK_TYPE_LABELS: Record<string, string> = {
  PHOTO: "Chụp ảnh",
  VIDEO: "Quay phim",
  MAKEUP: "Trang điểm",
  ASSISTANT: "Trợ lý",
  CAMERAMAN: "Quay phim",
  POST_PHOTO: "Hậu kỳ Ảnh",
  POST_VIDEO: "Dựng phim",
  RETOUCH: "Retouch",
  PREMIERE: "Premiere",
  EDITOR: "Biên tập",
  PRE_CONCEPT: "Concept",
  PRE_SCRIPT: "Kịch bản",
  OTHER: "Khác",
};

function getWorkLabel(workType: string): string {
  return WORK_TYPE_LABELS[workType] || workType;
}

const STATUS_STYLES: Record<string, string> = {
  hoan_thanh: "bg-success/10 text-success",
  dang_lam: "bg-warning/10 text-warning",
  chua_lam: "bg-text-muted/10 text-text-muted",
  da_huy: "bg-error/10 text-error",
};

function getStatusStyle(status: string): string {
  return STATUS_STYLES[status] || STATUS_STYLES.chua_lam;
}

function getStatusText(status: string): string {
  switch (status) {
    case "hoan_thanh": return "Xong";
    case "dang_lam": return "Đang làm";
    case "da_huy": return "Hủy";
    default: return "Chờ";
  }
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
