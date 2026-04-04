import type { BadgeVariant } from "@/components/ui/badge";
import { CURRENCY_SYMBOL, formatCurrency, formatDate } from "@/lib/utils";
import { getRoleLabel } from "@/types/employee-constants";
import type { EmployeeRole } from "@/types/employee";
import type {
  EmployeeProductivity,
  ProductivitySortDirection,
  ProductivitySortKey,
} from "@/types/productivity";
import {
  PRODUCTIVITY_TASK_LABELS,
  PRODUCTIVITY_TASK_VARIANTS,
} from "@/types/productivity-constants";
export { getServiceLabel, getWorkTypeLabel } from "@/types/contract-constants";



export function formatHours(value: number): string {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}h`;
}

export function formatMoney(value: number): string {
  return `${formatCurrency(value)} ${CURRENCY_SYMBOL}`;
}

export function formatRole(role: EmployeeRole): string {
  return getRoleLabel(role);
}

export function getTaskStatusLabel(status: string): string {
  return PRODUCTIVITY_TASK_LABELS[status] || status;
}

export function getTaskStatusVariant(status: string): BadgeVariant {
  return PRODUCTIVITY_TASK_VARIANTS[status] || "neutral";
}

export function formatEventDate(value: string | null): string {
  return value ? formatDate(value) : "Chưa có lịch";
}

export function sortEmployees(
  employees: EmployeeProductivity[],
  sortKey: ProductivitySortKey,
  sortDirection: ProductivitySortDirection,
) {
  if (sortKey === "default") return employees;

  const factor = sortDirection === "asc" ? 1 : -1;
  return [...employees].sort((left, right) => {
    let diff = 0;

    switch (sortKey) {
      case "active_tasks":
        diff = left.active_tasks - right.active_tasks;
        break;
      case "completed_tasks":
        diff = left.completed_tasks - right.completed_tasks;
        break;
      case "overdue_tasks":
        diff = left.overdue_tasks - right.overdue_tasks;
        break;
      case "total_cost": {
        const leftValue = left.total_cost ?? Number.POSITIVE_INFINITY;
        const rightValue = right.total_cost ?? Number.POSITIVE_INFINITY;
        diff = leftValue - rightValue;
        break;
      }
      default:
        diff = 0;
    }

    diff *= factor;
    if (diff !== 0) return diff;
    return left.full_name.localeCompare(right.full_name, "vi-VN");
  });
}
