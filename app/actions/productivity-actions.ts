"use server";

import { logError } from "@/lib/audit";
import {
  getProductivityDateRange,
  getTodayInTimeZone,
} from "@/lib/studio-date";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/common";
import type {
  EmployeeJobGroup,
  ProductivityData,
  ProductivityPagePayload,
  ProductivityPeriod,
} from "@/types/productivity";
import {
  resolveProductivityViewerContext,
  type ProductivityViewerContext,
} from "@/lib/productivity-auth";
import {
  buildSummary,
  sortEmployeesDefault,
  transformEmployeeRow,
  transformJobRows,
  type RpcEmployeeRow,
} from "@/lib/productivity-transforms";
import {
  productivityDetailParamsSchema,
  productivityPeriodSchema,
} from "@/lib/validations/productivity.schema";
import { ZodError } from "zod";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

// ── Internal fetch helpers ──

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

// ── Public API ──

export async function fetchProductivityData(
  period: ProductivityPeriod = "month",
): Promise<ActionResult<ProductivityPagePayload>> {
  try {
    const safePeriod = productivityPeriodSchema.parse(period);
    const viewerResult = await resolveProductivityViewerContext();
    if (!viewerResult.success) {
      return viewerResult;
    }

    const viewer = viewerResult.data;
    const overview =
      viewer.viewMode === "team"
        ? await fetchTeamOverview(safePeriod, viewer)
        : await fetchSelfOverview(safePeriod, viewer);

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
    if (error instanceof ZodError) {
      return {
        success: false,
        error: getErrorMessage(error, "Loi tai du lieu nang suat"),
      };
    }
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
    const params = productivityDetailParamsSchema.parse({
      employeeId,
      startDate,
      endDate,
    });
    const viewerResult = await resolveProductivityViewerContext();
    if (!viewerResult.success) {
      return viewerResult;
    }

    const viewer = viewerResult.data;
    let targetEmployeeId = params.employeeId;

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
      params.startDate,
      params.endDate,
      viewer,
    );

    return { success: true, data };
  } catch (error) {
    logError({
      error,
      context: "productivity.jobDetails",
      tableName: "work_tasks",
    }).catch(() => {});
    if (error instanceof ZodError) {
      return {
        success: false,
        error: getErrorMessage(error, "Loi tai chi tiet cong viec"),
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Lỗi tải chi tiết công việc",
    };
  }
}
