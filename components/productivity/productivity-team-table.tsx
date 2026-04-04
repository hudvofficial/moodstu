"use client";

import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getInitials } from "@/lib/utils";
import {
  WORKLOAD_BADGE_VARIANTS,
  WORKLOAD_LABELS,
} from "@/types/productivity-constants";
import type {
  EmployeeProductivity,
  ProductivitySortDirection,
  ProductivitySortKey,
} from "@/types/productivity";
import { formatHours, formatMoney, formatRole } from "./utils";

interface ProductivityTeamTableProps {
  employees: EmployeeProductivity[];
  canViewCost: boolean;
  sortKey: ProductivitySortKey;
  sortDirection: ProductivitySortDirection;
  onSortChange: (
    key: Extract<
      ProductivitySortKey,
      "active_tasks" | "completed_tasks" | "overdue_tasks" | "total_cost"
    >,
  ) => void;
  onSelectEmployee: (employee: EmployeeProductivity) => void;
}

const PROGRESS_FILL_CLASS: Record<EmployeeProductivity["workload_level"], string> = {
  overloaded: "progress-fill-error",
  high: "progress-fill-warning",
  medium: "progress-fill-info",
  low: "progress-fill",
};

function SortHeader({
  label,
  isActive,
  direction,
  onClick,
}: {
  label: string;
  isActive: boolean;
  direction: ProductivitySortDirection;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-auto px-0 py-0 text-overline uppercase text-text-secondary hover:bg-transparent hover:text-text-main"
    >
      <span>{label}</span>
      {isActive ? (
        direction === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  );
}

export function ProductivityTeamTable({
  employees,
  canViewCost,
  sortKey,
  sortDirection,
  onSortChange,
  onSelectEmployee,
}: ProductivityTeamTableProps) {
  return (
    <TableWrapper>
      <THead>
        <TR className="h-auto hover:bg-transparent">
          <TH>Nhân sự</TH>
          <TH>Vai trò</TH>
          <TH>On-set</TH>
          <TH>
            <SortHeader
              label="Đang làm"
              isActive={sortKey === "active_tasks"}
              direction={sortDirection}
              onClick={() => onSortChange("active_tasks")}
            />
          </TH>
          <TH>
            <SortHeader
              label="Hoàn thành"
              isActive={sortKey === "completed_tasks"}
              direction={sortDirection}
              onClick={() => onSortChange("completed_tasks")}
            />
          </TH>
          <TH>
            <SortHeader
              label="Quá hạn"
              isActive={sortKey === "overdue_tasks"}
              direction={sortDirection}
              onClick={() => onSortChange("overdue_tasks")}
            />
          </TH>
          <TH>Tải công việc</TH>
          {canViewCost && (
            <TH>
              <SortHeader
                label="Chi phí"
                isActive={sortKey === "total_cost"}
                direction={sortDirection}
                onClick={() => onSortChange("total_cost")}
              />
            </TH>
          )}
        </TR>
      </THead>

      <TBody>
        {employees.map((employee) => (
          <TR
            key={employee.employee_id}
            onClick={() => onSelectEmployee(employee)}
            className="h-auto"
          >
            <TD className="py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-hover text-body-sm font-bold text-text-secondary">
                  {getInitials(employee.full_name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-main">
                    {employee.full_name}
                  </p>
                  <p className="text-caption text-text-muted">
                    {employee.post_production_active} task hậu kỳ
                  </p>
                </div>
              </div>
            </TD>
            <TD className="py-3">
              <Badge variant="neutral">{formatRole(employee.role)}</Badge>
            </TD>
            <TD className="py-3 text-body-sm font-medium text-text-secondary">
              {formatHours(employee.onsite_hours)}
            </TD>
            <TD className="py-3 font-semibold text-text-main">
              {employee.active_tasks}
            </TD>
            <TD className={`py-3 font-semibold ${employee.completed_tasks > 0 ? "text-success" : "text-text-secondary"}`}>
              {employee.completed_tasks}
            </TD>
            <TD className="py-3">
              <span
                className={
                  employee.overdue_tasks > 0
                    ? "font-semibold text-error"
                    : "text-text-secondary"
                }
              >
                {employee.overdue_tasks}
              </span>
            </TD>
            <TD className="py-3">
              <div className="min-w-40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={WORKLOAD_BADGE_VARIANTS[employee.workload_level]}
                  >
                    {WORKLOAD_LABELS[employee.workload_level]}
                  </Badge>
                  <span className="text-caption font-semibold text-text-muted">
                    {Math.round(employee.workload_ratio * 100)}%
                  </span>
                </div>
                <div className="progress-track h-2">
                  <div
                    className={PROGRESS_FILL_CLASS[employee.workload_level]}
                    style={{ width: `${Math.min(100, Math.round(employee.workload_ratio * 100))}%` }}
                  />
                </div>
              </div>
            </TD>
            {canViewCost && (
              <TD className="py-3 font-semibold text-text-main">
                {employee.total_cost !== null
                  ? formatMoney(employee.total_cost)
                  : "—"}
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </TableWrapper>
  );
}
