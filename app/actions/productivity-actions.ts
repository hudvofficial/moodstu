"use server";

import { withAuth } from "@/lib/auth_utils";
import { logError } from "@/lib/audit";

// ═══════════════════════════════════════════
// Productivity Actions — Employee workload dashboard
// V1 ref: productivity.ts (234 lines)
// V2: withAuth + work_tasks RPCs + optimized types
// ═══════════════════════════════════════════

// ─── TYPES ───────────────────────────────────────
export type ProductivityPeriod = "week" | "month" | "quarter";
export type WorkloadLevel = "low" | "medium" | "high" | "overloaded";

export interface EmployeeProductivity {
  employee_id: string;
  full_name: string;
  role: string;
  onsite_hours: number;
  active_tasks: number;
  completed_tasks: number;
  post_production_active: number;
  overdue_tasks: number;
  total_cost: number;
  workload_level: WorkloadLevel;
}

export interface ProductivitySummary {
  total_onsite_hours: number;
  total_active_tasks: number;
  total_completed_tasks: number;
  overloaded_count: number;
  completion_rate: number;
  total_cost: number;
}

export interface ProductivityData {
  employees: EmployeeProductivity[];
  summary: ProductivitySummary;
  period: ProductivityPeriod;
  date_range: { start: string; end: string };
}

export interface EmployeeJobGroup {
  contract_id: string;
  contract_code: string;
  client_name: string;
  service_type: string;
  event_date: string | null;
  tasks: { work_type: string; status: string; deadline: string | null; cost: number }[];
  total_cost: number;
  completed: number;
  active: number;
  overdue: number;
}

// ─── CONSTANTS ───────────────────────────────────
const OVERLOAD_THRESHOLDS = {
  MAX_TASKS_PER_WEEK: 8,
  MAX_HOURS_PER_WEEK: 40,
} as const;

// ─── HELPERS ─────────────────────────────────────

function getDateRange(period: ProductivityPeriod): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;

  switch (period) {
    case "week": {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1);
      break;
    }
  }

  return { start: start.toISOString().split("T")[0], end };
}

function calculateWorkloadLevel(
  activeTasks: number,
  onsiteHours: number,
  period: ProductivityPeriod,
): WorkloadLevel {
  const weekFactor = period === "week" ? 1 : period === "month" ? 4 : 13;
  const weeklyTasks = activeTasks / weekFactor;
  const weeklyHours = onsiteHours / weekFactor;

  const taskRatio = weeklyTasks / OVERLOAD_THRESHOLDS.MAX_TASKS_PER_WEEK;
  const hourRatio = weeklyHours / OVERLOAD_THRESHOLDS.MAX_HOURS_PER_WEEK;
  const ratio = Math.max(taskRatio, hourRatio);

  if (ratio > 0.9) return "overloaded";
  if (ratio > 0.7) return "high";
  if (ratio > 0.4) return "medium";
  return "low";
}

// ─── MAIN ACTION: Fetch productivity data ────────

interface RpcEmployeeRow {
  employee_id: string;
  full_name: string;
  role: string;
  onsite_hours: number;
  active_tasks: number;
  completed_tasks: number;
  post_production_active: number;
  overdue_tasks: number;
  total_cost: number;
}

export async function fetchProductivityData(
  period: ProductivityPeriod = "month",
) {
  return withAuth(async (supabase) => {
    const { start, end } = getDateRange(period);

    const { data, error } = await supabase.rpc("get_employee_productivity", {
      p_start_date: start,
      p_end_date: end,
    });

    if (error) {
      logError({
        error,
        context: "productivity.fetch",
        tableName: "employees",
      }).catch(() => {});
      throw new Error("Lỗi tải dữ liệu năng suất");
    }

    const rawEmployees: RpcEmployeeRow[] = data || [];

    // Calculate workload levels
    const employees: EmployeeProductivity[] = rawEmployees.map((emp) => ({
      ...emp,
      workload_level: calculateWorkloadLevel(
        emp.active_tasks,
        emp.onsite_hours,
        period,
      ),
    }));

    // Summary (single pass — V2 optimized)
    let totalOnsite = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let overloadedCount = 0;
    let totalCost = 0;

    for (const e of employees) {
      totalOnsite += e.onsite_hours;
      totalActive += e.active_tasks;
      totalCompleted += e.completed_tasks;
      totalCost += e.total_cost;
      if (e.workload_level === "overloaded") overloadedCount++;
    }

    const totalAll = totalCompleted + totalActive;
    const summary: ProductivitySummary = {
      total_onsite_hours: totalOnsite,
      total_active_tasks: totalActive,
      total_completed_tasks: totalCompleted,
      overloaded_count: overloadedCount,
      completion_rate:
        totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
      total_cost: totalCost,
    };

    return {
      employees,
      summary,
      period,
      date_range: { start, end },
    } as ProductivityData;
  });
}

// ─── EMPLOYEE JOB DETAILS (Modal) ────────────────

interface RpcJobRow {
  contract_id: string;
  contract_code: string;
  client_name: string;
  service_type: string;
  event_date: string | null;
  work_type: string;
  status: string;
  deadline: string | null;
  cost: number;
}

export async function fetchEmployeeJobDetails(
  employeeId: string,
  startDate: string,
  endDate: string,
) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.rpc("get_employee_job_details", {
      p_employee_id: employeeId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logError({
        error,
        context: "productivity.jobDetails",
        tableName: "work_tasks",
      }).catch(() => {});
      throw new Error("Lỗi tải chi tiết công việc");
    }

    const rawTasks: RpcJobRow[] = data || [];

    // Group by contract_id (V1 logic preserved)
    const groupMap = new Map<string, EmployeeJobGroup>();
    const today = new Date().toISOString().split("T")[0];

    for (const task of rawTasks) {
      const key = task.contract_id;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          contract_id: task.contract_id,
          contract_code: task.contract_code,
          client_name: task.client_name || "Không tên",
          service_type: task.service_type || "",
          event_date: task.event_date,
          tasks: [],
          total_cost: 0,
          completed: 0,
          active: 0,
          overdue: 0,
        });
      }
      const group = groupMap.get(key)!;
      group.tasks.push({
        work_type: task.work_type,
        status: task.status,
        deadline: task.deadline,
        cost: task.cost,
      });
      group.total_cost += task.cost;

      // V2: snake_case status enums
      if (task.status === "hoan_thanh") {
        group.completed++;
      } else {
        group.active++;
        if (task.deadline && task.deadline < today) group.overdue++;
      }
    }

    return Array.from(groupMap.values());
  });
}
