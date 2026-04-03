"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEventDate } from "./utils";

// ── Skeleton for detail loading state ──
export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((index) => (
          <div key={index} className="card-base p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-24" />
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
        <AlertTriangle className="h-4 w-4" />
        <p className="font-semibold">Task quá hạn</p>
      </div>
      <div className="mt-3 space-y-2">
        {entries.map((task) => (
          <div
            key={`${task.contract_code}-${task.work_type}-${task.deadline}`}
            className="rounded-lg bg-bg-card px-3 py-3 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-dark">
                  {task.contract_code} · {task.client_name}
                </p>
                <p className="text-sm text-text-secondary">
                  {task.work_type}
                </p>
              </div>
              <Badge variant="error">
                Hạn {task.deadline ? formatEventDate(task.deadline) : "—"}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
