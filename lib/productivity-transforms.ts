// ═══════════════════════════════════════════
// productivity-transforms.ts — Pure data transforms + sorting
// Extracted from productivity-actions.ts (C1 Audit Fix)
// ═══════════════════════════════════════════

import type { Database } from "@/types/database.types";
import type { EmployeeRole } from "@/types/employee";
import type {
  EmployeeJobGroup,
  EmployeeJobTask,
  EmployeeProductivity,
  ProductivitySummary,
  WorkloadLevel,
} from "@/types/productivity";
import {
  MAX_HOURS_PER_WEEK,
  MAX_TASKS_PER_WEEK,
  WORKLOAD_THRESHOLDS,
} from "@/types/productivity-constants";
import { getRangeWeekCount } from "@/lib/studio-date";

export type RpcEmployeeRow =
  Database["public"]["Functions"]["get_employee_productivity"]["Returns"][number];
export type RpcJobRow =
  Database["public"]["Functions"]["get_employee_job_details"]["Returns"][number];

// ── Helpers ──

export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function isCompletedStatus(status: string): boolean {
  return status === "hoan_thanh";
}

export function isActiveStatus(status: string): boolean {
  return status === "chua_lam" || status === "dang_lam";
}

export function getWorkloadMetrics(
  activeTasks: number,
  onsiteHours: number,
  dayCount: number,
): { ratio: number; level: WorkloadLevel } {
  const rangeWeekCount = getRangeWeekCount(dayCount);
  const taskRatio = activeTasks / (MAX_TASKS_PER_WEEK * rangeWeekCount);
  const hourRatio = onsiteHours / (MAX_HOURS_PER_WEEK * rangeWeekCount);
  const ratio = Math.max(taskRatio, hourRatio);

  if (ratio > WORKLOAD_THRESHOLDS.overloaded) {
    return { ratio, level: "overloaded" };
  }
  if (ratio > WORKLOAD_THRESHOLDS.high) {
    return { ratio, level: "high" };
  }
  if (ratio > WORKLOAD_THRESHOLDS.medium) {
    return { ratio, level: "medium" };
  }
  return { ratio, level: "low" };
}

// ── Sorting ──

export function sortEmployeesDefault(employees: EmployeeProductivity[]) {
  return [...employees].sort((left, right) => {
    if (right.workload_ratio !== left.workload_ratio) {
      return right.workload_ratio - left.workload_ratio;
    }
    if (right.overdue_tasks !== left.overdue_tasks) {
      return right.overdue_tasks - left.overdue_tasks;
    }
    if (right.active_tasks !== left.active_tasks) {
      return right.active_tasks - left.active_tasks;
    }
    return left.full_name.localeCompare(right.full_name, "vi-VN");
  });
}

function sortTasks(tasks: EmployeeJobTask[], today: string) {
  return [...tasks].sort((left, right) => {
    const getPriority = (task: EmployeeJobTask) => {
      if (isActiveStatus(task.status) && task.deadline && task.deadline < today) {
        return 0;
      }
      if (isActiveStatus(task.status) && task.deadline) {
        return 1;
      }
      if (isActiveStatus(task.status)) {
        return 2;
      }
      if (isCompletedStatus(task.status)) {
        return 3;
      }
      return 4;
    };

    const priorityDiff = getPriority(left) - getPriority(right);
    if (priorityDiff !== 0) return priorityDiff;

    if (left.deadline && right.deadline) {
      return left.deadline.localeCompare(right.deadline);
    }
    if (left.deadline) return -1;
    if (right.deadline) return 1;
    return left.work_type.localeCompare(right.work_type, "vi-VN");
  });
}

function sortJobGroups(groups: EmployeeJobGroup[]) {
  return [...groups].sort((left, right) => {
    if (right.overdue !== left.overdue) {
      return right.overdue - left.overdue;
    }
    if (left.event_date && right.event_date) {
      const diff = left.event_date.localeCompare(right.event_date);
      if (diff !== 0) return diff;
    } else if (left.event_date) {
      return -1;
    } else if (right.event_date) {
      return 1;
    }
    return left.contract_code.localeCompare(right.contract_code, "vi-VN");
  });
}

// ── Transforms ──

export function transformEmployeeRow(
  row: RpcEmployeeRow,
  dayCount: number,
  canViewCost: boolean,
): EmployeeProductivity {
  const activeTasks = toNumber(row.active_tasks);
  const onsiteHours = toNumber(row.onsite_hours);
  const { ratio, level } = getWorkloadMetrics(activeTasks, onsiteHours, dayCount);

  return {
    employee_id: row.employee_id,
    full_name: row.full_name || "Không tên",
    role: row.role as EmployeeRole,
    onsite_hours: onsiteHours,
    active_tasks: activeTasks,
    completed_tasks: toNumber(row.completed_tasks),
    post_production_active: toNumber(row.post_production_active),
    overdue_tasks: toNumber(row.overdue_tasks),
    total_cost: canViewCost ? toNumber(row.total_cost) : null,
    workload_level: level,
    workload_ratio: ratio,
  };
}

export function transformJobRows(
  rows: RpcJobRow[],
  canViewCost: boolean,
  today: string,
): EmployeeJobGroup[] {
  const groupMap = new Map<string, EmployeeJobGroup>();

  for (const row of rows) {
    const key = row.contract_id;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        contract_id: row.contract_id,
        contract_code: row.contract_code,
        client_name: row.client_name || "Không tên",
        service_type: row.service_type || "",
        event_date: row.event_date,
        tasks: [],
        total_cost: canViewCost ? 0 : null,
        completed: 0,
        active: 0,
        overdue: 0,
      });
    }

    const group = groupMap.get(key)!;
    const task: EmployeeJobTask = {
      work_type: row.work_type,
      status: row.status,
      deadline: row.deadline,
      cost: canViewCost ? toNumber(row.cost) : null,
    };
    group.tasks.push(task);

    if (isCompletedStatus(row.status)) {
      group.completed += 1;
    } else if (isActiveStatus(row.status)) {
      group.active += 1;
      if (row.deadline && row.deadline < today) {
        group.overdue += 1;
      }
    }

    if (group.total_cost !== null) {
      group.total_cost += toNumber(row.cost);
    }
  }

  return sortJobGroups(
    Array.from(groupMap.values()).map((group) => ({
      ...group,
      tasks: sortTasks(group.tasks, today),
    })),
  );
}

export function buildSummary(
  employees: EmployeeProductivity[],
  canViewCost: boolean,
): ProductivitySummary {
  let totalOnsiteHours = 0;
  let totalActiveTasks = 0;
  let totalCompletedTasks = 0;
  let totalOverdueTasks = 0;
  let overloadedCount = 0;
  let totalCost = 0;

  for (const employee of employees) {
    totalOnsiteHours += employee.onsite_hours;
    totalActiveTasks += employee.active_tasks;
    totalCompletedTasks += employee.completed_tasks;
    totalOverdueTasks += employee.overdue_tasks;
    if (employee.workload_level === "overloaded") {
      overloadedCount++;
    }
    if (employee.total_cost !== null) {
      totalCost += employee.total_cost;
    }
  }

  const trackedTasks = totalActiveTasks + totalCompletedTasks;
  return {
    total_onsite_hours: totalOnsiteHours,
    total_active_tasks: totalActiveTasks,
    total_completed_tasks: totalCompletedTasks,
    total_overdue_tasks: totalOverdueTasks,
    overloaded_count: overloadedCount,
    completion_rate:
      trackedTasks > 0
        ? Math.round((totalCompletedTasks / trackedTasks) * 100)
        : 0,
    total_cost: canViewCost ? totalCost : null,
  };
}
