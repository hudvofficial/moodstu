"use client";

import { useMemo, memo } from "react";

import { AlertTriangle, BriefcaseBusiness, Clock3, RefreshCcw, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailSkeleton, ProductivityOverdueSection } from "@/components/productivity/productivity-detail-helpers";
import {
  WORKLOAD_BADGE_VARIANTS,
  WORKLOAD_LABELS,
} from "@/types/productivity-constants";
import type { EmployeeJobGroup, EmployeeProductivity } from "@/types/productivity";
import type { ServiceType, WorkType } from "@/types/contract";
import {
  formatEventDate,
  formatHours,
  formatMoney,
  getServiceLabel,
  getTaskStatusLabel,
  getTaskStatusVariant,
  getWorkTypeLabel,
} from "./utils";

interface ProductivityDetailContentProps {
  employee: EmployeeProductivity | null;
  groups: EmployeeJobGroup[];
  canViewCost: boolean;
  today: string;
  isLoading: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const ProductivityDetailContent = memo(function ProductivityDetailContent({
  employee,
  groups,
  canViewCost,
  today,
  isLoading,
  errorMessage,
  onRetry,
  emptyTitle = "Chưa có công việc trong kỳ",
  emptyDescription = "Không có job nào phù hợp với khoảng thời gian đang xem.",
}: ProductivityDetailContentProps) {
  // Hooks must be called unconditionally (before early returns)
  const totalCost = useMemo(
    () => groups.reduce((sum, group) => sum + (group.total_cost ?? 0), 0),
    [groups],
  );
  const overdueEntries = useMemo(
    () =>
      groups.flatMap((group) =>
        group.tasks
          .filter(
            (task) =>
              (task.status === "chua_lam" || task.status === "dang_lam") &&
              task.deadline &&
              task.deadline < today,
          )
          .map((task) => ({
            ...task,
            contract_code: group.contract_code,
            client_name: group.client_name,
          })),
      ),
    [groups, today],
  );

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (errorMessage) {
    return (
      <div className="card-base flex flex-col items-center gap-3 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-error" />
        <div className="space-y-1">
          <p className="font-semibold text-text-main">Không tải được chi tiết</p>
          <p className="text-body-sm text-text-secondary">{errorMessage}</p>
        </div>
        {onRetry && (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="card-base p-6 text-center text-body-sm text-text-secondary">
        Chọn một nhân sự để xem chi tiết công việc.
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="card-base p-6 text-center">
        <p className="font-semibold text-text-main">{emptyTitle}</p>
        <p className="mt-2 text-body-sm text-text-secondary">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex flex-col gap-1 min-w-30 rounded-xl bg-bg-card shadow-sm p-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            <span>Tổng job</span>
          </div>
          <p className="text-base font-bold text-text-main">{groups.length}</p>
        </div>

        <div className="flex flex-col gap-1 min-w-30 rounded-xl bg-bg-card shadow-sm p-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock3 className="h-3.5 w-3.5" />
            <span>On-set</span>
          </div>
          <p className="text-base font-bold text-text-main">
            {formatHours(employee.onsite_hours)}
          </p>
        </div>

        <div className="flex flex-col gap-1 min-w-30 rounded-xl bg-bg-card shadow-sm p-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Wallet className="h-3.5 w-3.5" />
            <span>{canViewCost ? "Chi phí" : "Tải công việc"}</span>
          </div>
          <p className="text-base font-bold text-text-main">
            {canViewCost
              ? formatMoney(totalCost)
              : `${Math.round(employee.workload_ratio * 100)}%`}
          </p>
        </div>
      </section>

      <ProductivityOverdueSection entries={overdueEntries} />

      <section className="space-y-3">
        {groups.map((group) => (
          <div key={group.contract_id} className="card-base p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-text-main">
                    {group.contract_code}
                  </p>
                  <Badge
                    variant={
                      WORKLOAD_BADGE_VARIANTS[
                        group.overdue > 0
                          ? "overloaded"
                          : employee.workload_level
                      ]
                    }
                  >
                    {group.overdue > 0
                      ? "Có task trễ"
                      : WORKLOAD_LABELS[employee.workload_level]}
                  </Badge>
                </div>
                <p className="text-body-sm text-text-secondary">
                  {group.client_name} · {getServiceLabel(group.service_type as ServiceType) || "Chưa phân loại"}
                </p>
                <p className="text-body-sm text-text-muted">
                  {formatEventDate(group.event_date)}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:justify-end mt-2 sm:mt-0">
                <Badge variant="info" className="text-tiny">Đang làm {group.active}</Badge>
                <Badge variant="success" className="text-tiny">Xong {group.completed}</Badge>
                {group.overdue > 0 && (
                  <Badge variant="error" className="text-tiny">Trễ {group.overdue}</Badge>
                )}
                {canViewCost && group.total_cost !== null && (
                  <Badge variant="primary" className="text-tiny">{formatMoney(group.total_cost)}</Badge>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {group.tasks.map((task) => (
                <div
                  key={`${group.contract_id}-${task.work_type}-${task.deadline}-${task.status}`}
                  className="rounded-lg bg-bg-main shadow-xs px-3 py-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-text-main truncate">{getWorkTypeLabel(task.work_type as WorkType)}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary mt-0.5">
                        <Badge variant={getTaskStatusVariant(task.status)} className="shrink-0 text-tiny">
                          {getTaskStatusLabel(task.status)}
                        </Badge>
                        <span className="truncate">
                          Deadline:{" "}
                          {task.deadline ? formatEventDate(task.deadline) : "—"}
                        </span>
                      </div>
                    </div>

                    {canViewCost && task.cost !== null && (
                      <p className="text-sm font-semibold text-text-main shrink-0">
                        {formatMoney(task.cost)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
});
