"use client";

/**
 * 📊 ProgressBadge — Work progress bar + fraction indicator
 *
 * Port from V1 NextActionBadge.tsx → V2 (Lucide icons, earth-tone)
 *
 * Shows:
 * - Progress bar with color: green(100%), red(overdue), blue(>50%), orange(<50%)
 * - Fraction "3/8" count
 * - Next task label or "Hoàn tất"
 * - Overdue warning icon
 * - Hover tooltip: grouped by Tiền kỳ / Sản xuất / Hậu kỳ
 */

import { useRef, useState, useEffect } from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isDone, IN_PROGRESS_STATUS, CANCELLED_STATUS } from "@/constants/work-statuses";
import { getWorkTypeLabel, getTaskStatusLabel } from "@/types/contract-constants";
import type { WorkType, TaskStatus } from "@/types/contract";
// V2 DB uses work_tasks table — define inline for backward compat
interface WorkProgressTask {
  id: string;
  contract_id?: string;
  work_type: string;
  assigned_to?: string | null;
  deadline: string | null;
  status: string;
  cost?: number;
  notes?: string | null;
  employees?: { id: string; full_name: string } | null;
}

// ─── CONSTANTS (V2 snake_case enums) ────────────────────

const PRE_PRODUCTION = ["concept", "kich_ban"];
const ON_SET = ["chup_anh", "quay_phim", "makeup", "tro_ly", "cameraman"];
const POST_PRODUCTION = ["hau_ky_anh", "dung_phim", "retouch", "premiere", "bien_tap"];



// ─── PROGRESS CALC ──────────────────────────────────────

export interface ProgressInfo {
  completed: number;
  total: number;
  pct: number;
  nextTask: WorkProgressTask | null;
  isOverdue: boolean;
}

export function getProgressInfo(tasks: WorkProgressTask[]): ProgressInfo | null {
  if (!tasks.length) return null;
  const active = tasks.filter((t) => t.status !== CANCELLED_STATUS);
  if (!active.length) return null;

  const completed = active.filter((t) => isDone(t.status)).length;
  const now = new Date();
  const pending = active
    .filter((t) => !isDone(t.status) && t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  const nextTask = pending[0] || null;
  const isOverdue = pending.some((t) => {
    const d = new Date(t.deadline!);
    return d < now && d.toDateString() !== now.toDateString();
  });

  return { completed, total: active.length, pct: Math.round((completed / active.length) * 100), nextTask, isOverdue };
}

// ─── COMPONENT ──────────────────────────────────────────

export default function ProgressBadge({ tasks = [] }: { tasks: WorkProgressTask[] }) {
  const progress = getProgressInfo(tasks);

  const groups = {
    "Tiền kỳ": tasks.filter((t) => PRE_PRODUCTION.includes(t.work_type)),
    "Sản xuất": tasks.filter((t) => ON_SET.includes(t.work_type)),
    "Hậu kỳ": tasks.filter((t) => POST_PRODUCTION.includes(t.work_type)),
  };

  // Color logic
  const barColor = progress
    ? progress.pct === 100
      ? "bg-success"
      : progress.isOverdue
        ? "bg-error"
        : progress.pct > 50
          ? "bg-info"
          : "bg-warning"
    : "";

  const textColor = progress
    ? progress.pct === 100
      ? "text-success"
      : progress.isOverdue
        ? "text-error"
        : progress.pct > 50
          ? "text-info"
          : "text-warning"
    : "";

  // Auto-flip tooltip: show above if near bottom of viewport
  const badgeRef = useRef<HTMLDivElement>(null);
  const [flipUp, setFlipUp] = useState(false);

  useEffect(() => {
    const el = badgeRef.current;
    if (!el) return;
    const handleMouseEnter = () => {
      const rect = el.getBoundingClientRect();
      setFlipUp(rect.bottom + 280 > window.innerHeight);
    };
    el.addEventListener("mouseenter", handleMouseEnter);
    return () => el.removeEventListener("mouseenter", handleMouseEnter);
  }, []);

  // No tasks
  if (!progress) {
    return (
      <div className="flex items-center justify-center px-3 py-2 rounded-md min-w-30 text-center shadow-xs bg-bg-hover opacity-50">
        <span className="text-tiny font-medium text-text-muted italic">Chưa có task</span>
      </div>
    );
  }

  return (
    <div ref={badgeRef} className="relative group/tooltip inline-block w-full">
      {/* Main Badge */}
      <div
        className={`flex flex-col gap-1 px-2 py-1.5 rounded-md min-w-30 cursor-help transition-all ${
          progress.pct === 100
            ? "bg-success/10"
            : progress.isOverdue
              ? "bg-error/10"
              : "bg-bg-hover shadow-xs"
        }`}
      >
        {/* Row 1: Progress bar + Counter */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-border/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <span className={`text-xs font-bold shrink-0 ${textColor}`}>
            {progress.completed}/{progress.total}
          </span>
        </div>

        {/* Row 2: Status label */}
        <div className="flex items-center justify-between">
          {progress.pct === 100 ? (
            <span className="text-tiny font-bold text-success flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Hoàn tất
            </span>
          ) : progress.nextTask ? (
            <span className={`text-tiny font-medium truncate max-w-24 ${textColor}`}>
              → {getWorkTypeLabel(progress.nextTask.work_type as WorkType)}
            </span>
          ) : (
            <span className="text-tiny text-text-muted">Chờ phân công</span>
          )}
          {progress.isOverdue && (
            <AlertTriangle className="w-3.5 h-3.5 text-error animate-pulse shrink-0" />
          )}
        </div>
      </div>

      {/* Hover Tooltip — auto-flip */}
      {/* PHẢI ẩn bằng `hidden` (display:none), KHÔNG dùng invisible/opacity-0: tooltip ẩn
          kiểu invisible vẫn nằm trong layout → tooltip của các dòng cuối thò xuống dưới đáy
          <table>, cộng ~120px vào scrollHeight của vùng cuộn → bảng cuộn tới đáy còn hở
          một khoảng trắng. Đổi lại là mất fade 200ms (tooltip hiện tức thì). */}
      <div className={`absolute left-1/2 -translate-x-1/2 w-56 bg-bg-card rounded-lg shadow-xl hidden group-hover/tooltip:block z-50 p-3 text-left ${
        flipUp ? "bottom-full mb-2" : "top-full mt-2"
      }`}>
        <div className="space-y-3">
          {Object.entries(groups).map(
            ([groupName, groupTasks]) =>
              groupTasks.length > 0 && (
                <div key={groupName}>
                  <div className="text-overline text-primary/60 mb-1.5 flex items-center gap-2">
                    <span>{groupName}</span>
                    <span className="h-px flex-1 bg-primary/10" />
                  </div>
                  <ul className="space-y-1.5">
                    {groupTasks.map((t) => {
                      const taskDone = isDone(t.status);
                      const isOverdue = t.deadline && new Date(t.deadline) < new Date() && !taskDone;
                      return (
                        <li key={t.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                taskDone ? "bg-success" : isOverdue ? "bg-error animate-pulse" : "bg-info"
                              }`}
                            />
                            <span className={`truncate ${taskDone ? "text-text-muted line-through" : "text-text-main"}`}>
                              {getWorkTypeLabel(t.work_type as WorkType)}
                            </span>
                          </div>
                          <Badge
                            variant={
                              taskDone
                                ? "success"
                                : t.status === IN_PROGRESS_STATUS
                                  ? "info"
                                  : "warning"
                            }
                          >
                            {getTaskStatusLabel(t.status as TaskStatus)}
                          </Badge>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
          )}

          {tasks.length === 0 && (
            <p className="text-center py-3 text-xs text-text-muted italic">
              Chưa có kế hoạch làm việc
            </p>
          )}
        </div>
        <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-bg-card rotate-45 shadow-tooltip-arrow ${
          flipUp ? "-bottom-1.5" : "-top-1.5"
        }`} />
      </div>
    </div>
  );
}
