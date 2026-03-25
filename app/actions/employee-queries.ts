"use server";

import { withAuth } from "@/lib/auth_utils";
import type { EmployeeListItem, EmployeeDetail, ActiveEmployee } from "@/types/employee";

// ═══════════════════════════════════════════
// Employee Queries — READ-only actions
// Follow V2 Template: queries separate from mutations
// Gold Standard ref: contract-queries.ts
// ═══════════════════════════════════════════

interface EmployeeListParams {
  search?: string;
  status?: string;
  department?: string;
  role?: string;
  sort?: string;
  page?: string;
  pageSize?: number;
}

// ─── getEmployeeList ─────────────────────────
export async function getEmployeeList(params: EmployeeListParams = {}) {
  return withAuth(async (supabase) => {
    const page = parseInt(params.page || "1");
    const pageSize = params.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const selectFields = "id, employee_code, full_name, department, position, role, phone, email, status, gender, avatar_url, start_date, deleted_at";

    let query = supabase
      .from("employees")
      .select(selectFields, { count: "exact" });

    // Status filter — "inactive" shows soft-deleted, default hides them
    if (params.status === "inactive") {
      query = query.not("deleted_at", "is", null);
    } else {
      query = query.is("deleted_at", null);
      if (params.status && params.status !== "all") {
        query = query.eq("status", params.status);
      }
    }

    // Search: name, code, phone, email
    if (params.search) {
      const s = params.search;
      query = query.or(`full_name.ilike.%${s}%,employee_code.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
    }

    // Filters
    if (params.department && params.department !== "all") query = query.eq("department", params.department);
    if (params.role && params.role !== "all") query = query.eq("role", params.role);

    // Sort
    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      newest: { column: "created_at", ascending: false },
      name_asc: { column: "full_name", ascending: true },
      name_desc: { column: "full_name", ascending: false },
      code_asc: { column: "employee_code", ascending: true },
      code_desc: { column: "employee_code", ascending: false },
    };
    const sortConfig = sortMap[params.sort || "newest"] || sortMap.newest;
    query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

    // Pagination
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error(`Lỗi tải nhân viên: ${error.message}`);

    return {
      employees: (data || []) as EmployeeListItem[],
      total: count || 0,
      page,
      pageSize,
    };
  });
}

// ─── getEmployeeById ─────────────────────────
export async function getEmployeeById(id: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("Không tìm thấy nhân viên");
    return data as EmployeeDetail;
  });
}

// ─── getEmployeeStats ────────────────────────
export async function getEmployeeStats() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("employees")
      .select("department, status")
      .is("deleted_at", null);

    if (error) throw new Error(`Lỗi tải stats: ${error.message}`);
    const employees = data || [];

    // Count soft-deleted (inactive) separately
    const { count: inactiveCount } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .not("deleted_at", "is", null);

    const deptCounts: Record<string, number> = {};
    for (const e of employees) {
      const dept = (e.department as string) || "Khác";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    }

    return {
      total: employees.length + (inactiveCount || 0),
      active: employees.filter((e) => e.status === "active").length,
      inactive: inactiveCount || 0,
      departments: deptCounts,
    };
  });
}

// ─── getNextEmployeeCode ─────────────────────
export async function getNextEmployeeCode() {
  return withAuth(async (supabase) => {
    const { data } = await supabase
      .from("employees")
      .select("employee_code")
      .order("employee_code", { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextNum = 1;
    if (data?.employee_code) {
      const match = (data.employee_code as string).match(/NV-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    return `NV-${nextNum.toString().padStart(3, "0")}`;
  });
}

// ─── getActiveEmployees ──────────────────────
// Moved from work-task-actions.ts — shared across modules
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
