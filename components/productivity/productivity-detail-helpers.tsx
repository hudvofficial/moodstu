"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEventDate, getWorkTypeLabel } from "./utils";

// ── Skeleton for detail loading state ──
export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {[1, 2, 3].map((index) => (
          <div key={index} className="flex flex-col gap-1.5 min-w-30 rounded-xl bg-bg-card shadow-sm p-3 shrink-0">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>

      <div className="card-base p-4">
        <Skeleton className="h-5 w-36" />
        <div className="mt-4 space-y-3">
          {[1, 2].map((index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Overdue tasks alert section ──
interface OverdueEntry {
  contract_code: string;
  client_name: string;
  work_type: string;
  deadline: string | null;
}

interface ProductivityOverdueSectionProps {
  entries: OverdueEntry[];
}

export function ProductivityOverdueSection({ entries }: ProductivityOverdueSectionProps) {
  if (entries.length === 0) return null;

  return (
    <div className="card-base bg-error/5 p-4 shadow-xs">
      <div className="flex items-center gap-2 text-error">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="font-semibold text-sm">Task quá hạn</p>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {entries.map((task) => (
          <div
            key={`${task.contract_code}-${task.work_type}-${task.deadline}`}
            className="rounded-lg bg-bg-main shadow-xs px-3 py-2.5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-sm text-text-main truncate">
                  {task.contract_code} · {task.client_name}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {getWorkTypeLabel(task.work_type as import("@/types/contract").WorkType)}
                </p>
              </div>
              <Badge variant="error" className="shrink-0 text-tiny w-max">
                Hạn {task.deadline ? formatEventDate(task.deadline) : "—"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
