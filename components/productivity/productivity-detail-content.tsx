"use client";

import { useMemo } from "react";

import { AlertTriangle, BriefcaseBusiness, Clock3, RefreshCcw, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailSkeleton, ProductivityOverdueSection } from "@/components/productivity/productivity-detail-helpers";
import {
  WORKLOAD_BADGE_VARIANTS,
  WORKLOAD_LABELS,
} from "@/types/productivity-constants";
import type { EmployeeJobGroup, EmployeeProductivity } from "@/types/productivity";
import {
  formatEventDate,
  formatHours,
  formatMoney,
  getTaskStatusLabel,
  getTaskStatusVariant,
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


export function ProductivityDetailContent({
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
          <p className="font-semibold text-dark">Không tải được chi tiết</p>
          <p className="text-sm text-text-secondary">{errorMessage}</p>
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
      <div className="card-base p-6 text-center text-sm text-text-secondary">
        Chọn một nhân sự để xem chi tiết công việc.
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="card-base p-6 text-center">
        <p className="font-semibold text-dark">{emptyTitle}</p>
        <p className="mt-2 text-sm text-text-secondary">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card-base p-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <BriefcaseBusiness className="h-4 w-4" />
            <span>Tổng job</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-dark">{groups.length}</p>
        </div>

        <div className="card-base p-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Clock3 className="h-4 w-4" />
            <span>On-set</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-dark">
            {formatHours(employee.onsite_hours)}
          </p>
        </div>

        <div className="card-base p-4">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Wallet className="h-4 w-4" />
            <span>{canViewCost ? "Chi phí" : "Tải công việc"}</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-dark">
            {canViewCost
              ? formatMoney(totalCost)
              : `${Math.round(employee.workload_ratio * 100)}%`}
          </p>
        </div>
      </div>

      <ProductivityOverdueSection entries={overdueEntries} />

      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.contract_id} className="card-base p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-dark">
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
                <p className="text-sm text-text-secondary">
                  {group.client_name} · {group.service_type || "Chưa phân loại"}
                </p>
                <p className="text-sm text-text-muted">
                  {formatEventDate(group.event_date)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="info">Đang làm {group.active}</Badge>
                <Badge variant="success">Hoàn thành {group.completed}</Badge>
                {group.overdue > 0 && (
                  <Badge variant="error">Quá hạn {group.overdue}</Badge>
                )}
                {canViewCost && group.total_cost !== null && (
                  <Badge variant="primary">{formatMoney(group.total_cost)}</Badge>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {group.tasks.map((task) => (
                <div
                  key={`${group.contract_id}-${task.work_type}-${task.deadline}-${task.status}`}
                  className="rounded-xl bg-bg-base/50 px-3 py-3 shadow-xs"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-dark">{task.work_type}</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                        <Badge variant={getTaskStatusVariant(task.status)}>
                          {getTaskStatusLabel(task.status)}
                        </Badge>
                        <span>
                          Deadline:{" "}
                          {task.deadline ? formatEventDate(task.deadline) : "—"}
                        </span>
                      </div>
                    </div>

                    {canViewCost && task.cost !== null && (
                      <p className="text-sm font-semibold text-text-main">
                        {formatMoney(task.cost)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
