"use server";

import { logError } from "@/lib/audit";
import {
  DEFAULT_STUDIO_TIMEZONE,
  getProductivityDateRange,
  getRangeWeekCount,
  getTodayInTimeZone,
} from "@/lib/studio-date";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import type { Database } from "@/types/database.types";
import type { EmployeeRole } from "@/types/employee";
import type { ActionResult } from "@/types/common";
import type {
  EmployeeJobGroup,
  EmployeeJobTask,
  EmployeeProductivity,
  ProductivityData,
  ProductivityPagePayload,
  ProductivityPeriod,
  ProductivitySummary,
  ProductivityViewer,
  WorkloadLevel,
} from "@/types/productivity";
import {
  MAX_HOURS_PER_WEEK,
  MAX_TASKS_PER_WEEK,
  PRODUCTIVITY_ALLOWED_ROLES,
  PRODUCTIVITY_TEAM_ROLES,
  WORKLOAD_THRESHOLDS,
} from "@/types/productivity-constants";

type RpcEmployeeRow =
  Database["public"]["Functions"]["get_employee_productivity"]["Returns"][number];
type RpcJobRow =
  Database["public"]["Functions"]["get_employee_job_details"]["Returns"][number];

type ProductivityViewerContext = ProductivityViewer;

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function isAllowedProductivityRole(role: string): boolean {
  return PRODUCTIVITY_ALLOWED_ROLES.includes(
    role as (typeof PRODUCTIVITY_ALLOWED_ROLES)[number],
  );
}

function canViewTeam(role: string): boolean {
  return PRODUCTIVITY_TEAM_ROLES.includes(
    role as (typeof PRODUCTIVITY_TEAM_ROLES)[number],
  );
}

function isCompletedStatus(status: string): boolean {
  return status === "hoan_thanh";
}

function isActiveStatus(status: string): boolean {
  return status === "chua_lam" || status === "dang_lam";
}

function getWorkloadMetrics(
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

function sortEmployeesDefault(employees: EmployeeProductivity[]) {
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

function buildSummary(
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

function transformEmployeeRow(
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

function transformJobRows(
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

async function getStudioTimezone(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
): Promise<string> {
  const { data, error } = await adminClient
    .from("studio_info")
    .select("timezone")
    .limit(1)
    .single();

  if (error) {
    return DEFAULT_STUDIO_TIMEZONE;
  }

  return data?.timezone || DEFAULT_STUDIO_TIMEZONE;
}

async function resolveProductivityViewerContext(): Promise<
  ActionResult<ProductivityViewerContext>
> {
  const context = await getAuthenticatedUserContext();
  if (!context) {
    return { success: false, error: "Chưa đăng nhập" };
  }

  if (!isAllowedProductivityRole(context.shellRole)) {
    return { success: false, error: "Bạn không có quyền truy cập module này" };
  }

  const adminClient = await createAdminClient();
  const timezone = await getStudioTimezone(adminClient);
  const isLinkedEmployee = Boolean(context.employee?.id);
  const viewMode = canViewTeam(context.shellRole) ? "team" : "self";

  return {
    success: true,
    data: {
      role: context.shellRole,
      viewMode,
      currentEmployeeId: context.employee?.id || null,
      canViewCost: viewMode === "team",
      timezone,
      isLinkedEmployee,
    },
  };
}

async function fetchTeamOverview(
  period: ProductivityPeriod,
  viewer: ProductivityViewerContext,
): Promise<ProductivityData> {
  const adminClient = await createAdminClient();
  const { start, end, dayCount } = getProductivityDateRange(
    period,
    viewer.timezone,
  );

  const { data, error } = await adminClient.rpc("get_employee_productivity", {
    p_start_date: start,
    p_end_date: end,
  });

  if (error) {
    throw new Error("Lỗi tải dữ liệu năng suất");
  }

  const employees = sortEmployeesDefault(
    (data || []).map((row: RpcEmployeeRow) =>
      transformEmployeeRow(row, dayCount, true),
    ),
  );

  return {
    employees,
    summary: buildSummary(employees, true),
    period,
    date_range: { start, end },
  };
}

async function fetchSelfOverview(
  period: ProductivityPeriod,
  viewer: ProductivityViewerContext,
): Promise<ProductivityData> {
  const { start, end, dayCount } = getProductivityDateRange(
    period,
    viewer.timezone,
  );

  if (!viewer.currentEmployeeId) {
    return {
      employees: [],
      summary: buildSummary([], false),
      period,
      date_range: { start, end },
    };
  }

  const userClient = await createClient();
  const { data, error } = await userClient.rpc("get_my_employee_productivity", {
    p_start_date: start,
    p_end_date: end,
  });

  if (error) {
    throw new Error("Lỗi tải dữ liệu năng suất cá nhân");
  }

  const employees = (data || []).map((row: RpcEmployeeRow) =>
    transformEmployeeRow(row, dayCount, false),
  );

  return {
    employees,
    summary: buildSummary(employees, false),
    period,
    date_range: { start, end },
  };
}

async function fetchJobDetailsInternal(
  employeeId: string,
  startDate: string,
  endDate: string,
  viewer: ProductivityViewerContext,
): Promise<EmployeeJobGroup[]> {
  const today = getTodayInTimeZone(viewer.timezone);

  if (viewer.viewMode === "self") {
    const userClient = await createClient();
    const { data, error } = await userClient.rpc("get_my_employee_job_details", {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      throw new Error("Lỗi tải chi tiết công việc");
    }

    return transformJobRows(data || [], false, today);
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.rpc("get_employee_job_details", {
    p_employee_id: employeeId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    throw new Error("Lỗi tải chi tiết công việc");
  }

  return transformJobRows(
    data || [],
    viewer.canViewCost,
    today,
  );
}

export async function fetchProductivityData(
  period: ProductivityPeriod = "month",
): Promise<ActionResult<ProductivityPagePayload>> {
  try {
    const viewerResult = await resolveProductivityViewerContext();
    if (!viewerResult.success) {
      return viewerResult;
    }

    const viewer = viewerResult.data;
    const overview =
      viewer.viewMode === "team"
        ? await fetchTeamOverview(period, viewer)
        : await fetchSelfOverview(period, viewer);

    return {
      success: true,
      data: {
        viewer,
        overview,
      },
    };
  } catch (error) {
    logError({
      error,
      context: "productivity.fetch",
      tableName: "work_tasks",
    }).catch(() => {});
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi tải dữ liệu năng suất",
    };
  }
}

export async function fetchEmployeeJobDetails(
  employeeId: string,
  startDate: string,
  endDate: string,
): Promise<ActionResult<EmployeeJobGroup[]>> {
  try {
    const viewerResult = await resolveProductivityViewerContext();
    if (!viewerResult.success) {
      return viewerResult;
    }

    const viewer = viewerResult.data;
    let targetEmployeeId = employeeId;

    if (viewer.viewMode === "self") {
      if (!viewer.currentEmployeeId) {
        return {
          success: false,
          error: "Tài khoản chưa được liên kết với hồ sơ nhân sự",
        };
      }
      targetEmployeeId = viewer.currentEmployeeId;
    }

    if (!targetEmployeeId) {
      return { success: false, error: "Thiếu nhân sự cần xem chi tiết" };
    }

    const data = await fetchJobDetailsInternal(
      targetEmployeeId,
      startDate,
      endDate,
      viewer,
    );

    return { success: true, data };
  } catch (error) {
    logError({
      error,
      context: "productivity.jobDetails",
      tableName: "work_tasks",
    }).catch(() => {});
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi tải chi tiết công việc",
    };
  }
}
