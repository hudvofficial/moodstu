"use client";

import { memo } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  WORKLOAD_BADGE_VARIANTS,
  WORKLOAD_LABELS,
} from "@/types/productivity-constants";
import type { EmployeeProductivity } from "@/types/productivity";
import { formatHours, formatMoney, formatRole } from "./utils";

// ── Types ──

interface ProductivityMobileCardsProps {
  employees: EmployeeProductivity[];
  canViewCost: boolean;
  onSelectEmployee: (employee: EmployeeProductivity) => void;
}

// ── Workload progress bar ──

const PROGRESS_FILL_CLASS: Record<EmployeeProductivity["workload_level"], string> = {
  overloaded: "bg-error",
  high: "bg-warning",
  medium: "bg-info",
  low: "bg-primary",
};

function WorkloadBar({ ratio, level }: { ratio: number; level: EmployeeProductivity["workload_level"] }) {
  const pct = Math.min(100, Math.round(ratio * 100));
  return (
    <div className="h-1 rounded-full bg-border/30 flex-1 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${PROGRESS_FILL_CLASS[level]}`}
           style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Single card ──

const EmployeeCard = memo(function EmployeeCard({
  employee,
  canViewCost,
  index,
  onSelect,
}: {
  employee: EmployeeProductivity;
  canViewCost: boolean;
  index: number;
  onSelect: () => void;
}) {
  const hasCost =
    canViewCost && employee.total_cost !== null && employee.total_cost > 0;
  const hasOverdue = employee.overdue_tasks > 0;
  const entranceClass =
    index < 5 ? `entrance entrance-${index + 1}` : "";

  return (
    // eslint-disable-next-line react/forbid-elements -- card-as-button pattern (matches gold standard contracts-table.tsx)
    <button
      type="button"
      onClick={onSelect}
      className={`card-base p-4 text-left transition-all active:scale-[0.99] ${entranceClass}`}
    >
      {/* Row 1: Role + Workload Badge — matches Contract Row 1 (code + status) */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted">
          {formatRole(employee.role)}
        </span>
        <Badge variant={WORKLOAD_BADGE_VARIANTS[employee.workload_level]} className="text-tiny">
          {WORKLOAD_LABELS[employee.workload_level]}
        </Badge>
      </div>

      {/* Row 2: Full Name — matches Contract Row 2 (customer name) */}
      <h3 className="text-sm font-bold text-text-main mb-1.5 truncate">
        {employee.full_name}
      </h3>

      {/* Row 3: Inline stats — compact 1 line */}
      <p className="text-xs text-text-secondary mb-3">
        {formatHours(employee.onsite_hours)} on-set
        {" \xB7 "}
        {employee.active_tasks} việc
        {" \xB7 "}
        <span
          className={
            employee.completed_tasks > 0
              ? "text-success font-medium"
              : ""
          }
        >
          {employee.completed_tasks} xong
        </span>
      </p>

      {/* Row 4: Alert + Cost (conditional) */}
      {(hasOverdue || hasCost) && (
        <div className="flex items-baseline justify-between mb-2">
          {hasOverdue ? (
            <span className="flex items-center gap-1 text-tiny text-error font-medium md:text-sm">
              <AlertTriangle className="h-3 w-3" />
              {employee.overdue_tasks} quá hạn
            </span>
          ) : (
            <span />
          )}
          {hasCost && (
            <span className="text-sm font-semibold text-text-main">
              {formatMoney(employee.total_cost!)}
            </span>
          )}
        </div>
      )}

      {/* Row 5: Workload bar + Chevron */}
      <div className="flex items-center gap-3">
        <WorkloadBar ratio={employee.workload_ratio} level={employee.workload_level} />
        <span className="text-tiny text-text-muted">
          {Math.round(employee.workload_ratio * 100)}%
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
      </div>
    </button>
  );
});

// ── Main export ──

export const ProductivityMobileCards = memo(function ProductivityMobileCards({
  employees,
  canViewCost,
  onSelectEmployee,
}: ProductivityMobileCardsProps) {
  return (
    <div className="flex flex-col gap-3">
      {employees.map((employee, i) => (
        <EmployeeCard
          key={employee.employee_id}
          employee={employee}
          canViewCost={canViewCost}
          index={i}
          onSelect={() => onSelectEmployee(employee)}
        />
      ))}
    </div>
  );
});
