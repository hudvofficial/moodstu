"use server";

import { z } from "zod";
import { withAdmin, withAuth } from "@/lib/auth_utils";
import { profileAction } from "@/lib/action-profiler";
import { isMissingRpcError } from "@/lib/finance-utils";
import type {
  ActiveEmployee,
  EmployeeDetail,
  EmployeeListItem,
} from "@/types/employee";

interface EmployeeListParams {
  search?: string;
  status?: string;
  department?: string;
  role?: string;
  sort?: string;
  page?: string;
  pageSize?: number;
}

const uuidSchema = z.string().uuid("Employee ID không hợp lệ");
const employeeRoles = new Set(["admin", "manager", "sale", "media", "ctv"]);
const employeeStatuses = new Set(["all", "active", "inactive"]);

function normalizePage(value: string | undefined) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function normalizePageSize(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 20;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

function normalizeSearch(value: string | undefined) {
  return value?.trim().replace(/[%(),]/g, " ").slice(0, 80) || "";
}

export async function getEmployeeList(params: EmployeeListParams = {}) {
  return profileAction("employees.getEmployeeList", () => withAdmin(async (supabase) => {
    const page = normalizePage(params.page);
    const pageSize = normalizePageSize(params.pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const selectFields =
      "id, employee_code, full_name, department, position, role, phone, email, status, gender, avatar_url, start_date, deleted_at";

    let query = supabase
      .from("employees")
      .select(selectFields, { count: "exact" });

    const status = employeeStatuses.has(params.status || "")
      ? params.status
      : "all";

    if (status === "inactive") {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
      if (status === "active") query = query.eq("status", "active");
    }

    const search = normalizeSearch(params.search);
    if (search) {
      query = query.or(
        [
          `full_name.ilike.%${search}%`,
          `employee_code.ilike.%${search}%`,
          `phone.ilike.%${search}%`,
          `email.ilike.%${search}%`,
        ].join(","),
      );
    }

    if (params.department && params.department !== "all") {
      query = query.eq("department", params.department.slice(0, 80));
    }

    if (params.role && params.role !== "all" && employeeRoles.has(params.role)) {
      query = query.eq("role", params.role);
    }

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      newest: { column: "created_at", ascending: false },
      name_asc: { column: "full_name", ascending: true },
      name_desc: { column: "full_name", ascending: false },
      code_asc: { column: "employee_code", ascending: true },
      code_desc: { column: "employee_code", ascending: false },
    };
    const sortConfig = sortMap[params.sort || "newest"] || sortMap.newest;
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(`Lỗi tải nhân viên: ${error.message}`);

    return {
      employees: (data || []) as EmployeeListItem[],
      total: count || 0,
      page,
      pageSize,
    };
  }));
}

export async function getEmployeeById(id: string) {
  return profileAction("employees.getEmployeeById", async () => {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", parsedId.data)
      .single();

    if (error || !data) throw new Error("Không tìm thấy nhân viên");
    return data as EmployeeDetail;
  });
  });
}

export async function getEmployeeStats() {
  return profileAction("employees.getEmployeeStats", () => withAdmin(async (supabase) => {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc("employee_stats")
      .maybeSingle();

    if (!rpcError && rpcData) {
      const row = rpcData as Record<string, unknown>;
      const departments =
        row.departments && typeof row.departments === "object" && !Array.isArray(row.departments)
          ? (row.departments as Record<string, number>)
          : {};

      return {
        total: Number(row.total) || 0,
        active: Number(row.active) || 0,
        inactive: Number(row.inactive) || 0,
        departments,
      };
    }

    if (rpcError && !isMissingRpcError(rpcError)) {
      throw new Error(`Loi tai thong ke: ${rpcError.message}`);
    }

    const { data, error } = await supabase
      .from("employees")
      .select("department, status")
      .is("deleted_at", null);

    if (error) throw new Error(`Lỗi tải thống kê: ${error.message}`);
    const employees = data || [];

    const { count: inactiveCount, error: inactiveError } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .not("deleted_at", "is", null);

    if (inactiveError) {
      throw new Error(`Lỗi tải thống kê: ${inactiveError.message}`);
    }

    const deptCounts: Record<string, number> = {};
    for (const employee of employees) {
      const dept = (employee.department as string) || "Khác";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }

    return {
      total: employees.length + (inactiveCount || 0),
      active: employees.filter((employee) => employee.status === "active")
        .length,
      inactive: inactiveCount || 0,
      departments: deptCounts,
    };
  }));
}

export async function getNextEmployeeCode() {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("employees")
      .select("employee_code")
      .ilike("employee_code", "NV-%")
      .range(0, 4999);

    if (error) throw new Error(`Không thể tạo mã nhân viên: ${error.message}`);

    const maxNumber = (data || []).reduce((max, row) => {
      const match = String(row.employee_code || "").match(/^NV-(\d+)$/);
      if (!match) return max;
      return Math.max(max, Number(match[1]) || 0);
    }, 0);

    return `NV-${String(maxNumber + 1).padStart(3, "0")}`;
  });
}

export async function getActiveEmployees() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, avatar_url, department, position")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name");

    if (error) throw new Error(`Lỗi tải nhân viên: ${error.message}`);
    return (data || []) as ActiveEmployee[];
  });
}
