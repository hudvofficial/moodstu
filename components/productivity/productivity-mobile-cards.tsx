"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import {
  WORKLOAD_BADGE_VARIANTS,
  WORKLOAD_LABELS,
} from "@/types/productivity-constants";
import type { EmployeeProductivity } from "@/types/productivity";
import { formatHours, formatMoney, formatRole } from "./utils";

interface ProductivityMobileCardsProps {
  employees: EmployeeProductivity[];
  canViewCost: boolean;
  onSelectEmployee: (employee: EmployeeProductivity) => void;
}

export function ProductivityMobileCards({
  employees,
  canViewCost,
  onSelectEmployee,
}: ProductivityMobileCardsProps) {
  return (
    <div className="space-y-3">
      {employees.map((employee) => (
        <Button
          key={employee.employee_id}
          type="button"
          onClick={() => onSelectEmployee(employee)}
          variant="ghost"
          className="card-interactive h-auto w-full justify-start px-4 py-4 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-hover text-sm font-bold text-text-secondary">
                {getInitials(employee.full_name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-dark">
                  {employee.full_name}
                </p>
                <p className="text-xs text-text-muted">
                  {formatRole(employee.role)}
                </p>
              </div>
            </div>

            <Badge variant={WORKLOAD_BADGE_VARIANTS[employee.workload_level]}>
              {WORKLOAD_LABELS[employee.workload_level]}
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-overline text-text-muted">
                On-set
              </p>
              <p className="mt-1 font-semibold text-text-main">
                {formatHours(employee.onsite_hours)}
              </p>
            </div>
            <div>
              <p className="text-overline text-text-muted">
                Đang làm
              </p>
              <p className="mt-1 font-semibold text-text-main">
                {employee.active_tasks}
              </p>
            </div>
            <div>
              <p className="text-overline text-text-muted">
                Hoàn thành
              </p>
              <p className={`mt-1 font-semibold ${employee.completed_tasks > 0 ? "text-success" : "text-text-secondary"}`}>
                {employee.completed_tasks}
              </p>
            </div>
            <div>
              <p className="text-overline text-text-muted">
                Quá hạn
              </p>
              <p className="mt-1 font-semibold text-error">
                {employee.overdue_tasks}
              </p>
            </div>
          {canViewCost && employee.total_cost !== null && employee.total_cost > 0 && (
            <div className="col-span-2 mt-1 border-t border-dashed border-text-muted/20 pt-3">
              <p className="text-overline text-text-muted">Chi phí</p>
              <p className="mt-1 font-semibold text-text-main">
                {formatMoney(employee.total_cost)}
              </p>
            </div>
          )}
          </div>
        </Button>
      ))}
    </div>
  );
}
