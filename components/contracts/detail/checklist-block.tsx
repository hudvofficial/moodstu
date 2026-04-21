"use client";

import { useState } from "react";
import { CheckSquare, Circle, CheckCircle2, Clock } from "lucide-react";
import type { WorkTask } from "@/types/contract";
import { getWorkTypeLabel } from "@/types/contract-constants";
import { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════
// ChecklistBlock — Work tasks as checklist
// Phase 04f: work_tasks grouped by status
// ═══════════════════════════════════════════

const STATUS_ICON_CONFIG: Record<string, { icon: typeof Circle; color: string }> = {
  chua_lam: { icon: Circle, color: "text-text-muted" },
  dang_lam: { icon: Clock, color: "text-amber-500" },
  hoan_thanh: { icon: CheckCircle2, color: "text-emerald-500" },
  da_huy: { icon: Circle, color: "text-red-400" },
};

type TabKey = "all" | "pending" | "done";

interface Props {
  tasks: WorkTask[];
}

export default function ChecklistBlock({ tasks }: Props) {
  const [tab, setTab] = useState<TabKey>("all");

  const filtered = tasks.filter((t) => {
    if (tab === "pending") return t.status === "chua_lam" || t.status === "dang_lam";
    if (tab === "done") return t.status === "hoan_thanh";
    return true;
  });

  const doneCount = tasks.filter((t) => t.status === "hoan_thanh").length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="card-base p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Checklist
          </h3>
        </div>
        <span className="text-caption text-text-muted">
          {doneCount}/{tasks.length}
        </span>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-bg-hover overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {([
          { key: "all" as TabKey, label: "Tất cả" },
          { key: "pending" as TabKey, label: "Cần làm" },
          { key: "done" as TabKey, label: "Xong" },
        ]).map((t) => (
          <Button unstyled
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tab-pill py-1 px-3 text-caption ${tab === t.key ? "tab-pill-active" : "tab-pill-inactive"}`}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="py-6 text-center">
          <CheckSquare size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">
            Chưa có công việc
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-caption text-text-muted text-center py-4">
          Không có mục nào
        </p>
      ) : (
        <div className="space-y-1">
          {filtered.map((task) => {
            const iconCfg = STATUS_ICON_CONFIG[task.status] || STATUS_ICON_CONFIG.chua_lam;
            const StatusIcon = iconCfg.icon;

            return (
              <div
                key={task.id}
                className={`flex items-center gap-2.5 p-2 rounded-md
                  ${task.status === "hoan_thanh" ? "opacity-60" : ""}
                  hover:bg-bg-hover transition-colors`}
              >
                <StatusIcon size={16} className={`shrink-0 ${iconCfg.color}`} />
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-body-sm text-text-primary truncate
                      ${task.status === "hoan_thanh" ? "line-through" : ""}`}
                  >
                    {getWorkTypeLabel(task.work_type as import("@/types/contract").WorkType)}
                  </p>
                  {task.employees?.full_name && (
                    <p className="text-caption text-text-muted">
                      {task.employees.full_name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
