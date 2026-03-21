"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Employee Actions — CRUD + Stats + Notes
// Split from employee-actions.ts (389 lines)
// Salary adjustments moved to salary-actions.ts
// ═══════════════════════════════════════════

// ─── ALLOWED FIELDS (Whitelist) ───────────
const ALLOWED_FIELDS = [
  "employee_code", "full_name", "gender", "phone", "email",
  "department", "position", "status", "start_date", "salary_info", "avatar_url",
] as const;

interface EmployeeFormData { [key: string]: string | number | object | null }

function sanitizeFormData(raw: EmployeeFormData): Record<string, string | number | object | null> {
  const clean: Record<string, string | number | object | null> = {};
  for (const field of ALLOWED_FIELDS) { if (raw[field] !== undefined) clean[field] = raw[field]; }
  return clean;
}

// ═══ QUERIES ══════════════════════════════

export async function getEmployeesAction(searchParams: { search?: string; dept?: string; status?: string; page?: string }) {
  return withAuth(async (supabase) => {
    const page = parseInt(searchParams.page || "1");
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from("employees")
      .select("id, employee_code, full_name, department, position, phone, email, status, avatar_url, start_date, created_at", { count: "exact" })
      .is("deleted_at", null).order("created_at", { ascending: false }).range(from, to);

    if (searchParams.search) query = query.or(`full_name.ilike.%${searchParams.search}%,employee_code.ilike.%${searchParams.search}%,phone.ilike.%${searchParams.search}%`);
    if (searchParams.dept && searchParams.dept !== "all") query = query.eq("department", searchParams.dept);
    if (searchParams.status && searchParams.status !== "all") query = query.eq("status", searchParams.status);

    const { data, count, error } = await query;
    if (error) throw new Error(`Lỗi tải nhân viên: ${error.message}`);
    return { employees: data || [], total: count || 0, page, pageSize };
  });
}

export async function getEmployeeStatsAction() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.from("employees").select("department, status").is("deleted_at", null);
    if (error) throw new Error(`Lỗi tải stats: ${error.message}`);
    const employees = data || [];
    return {
      total: employees.length,
      active: employees.filter((e) => e.status === "active").length,
      photo: employees.filter((e) => e.department === "PHOTO").length,
      makeup: employees.filter((e) => e.department === "MAKEUP").length,
    };
  });
}

// ═══ MUTATIONS ════════════════════════════

export async function createEmployeeAction(formData: EmployeeFormData) {
  return withAuth(async (supabase) => {
    const data = sanitizeFormData(formData);
    const { data: created, error } = await supabase.from("employees").insert(data).select("id, full_name, employee_code").single();
    if (error) {
      if (error.code === "23505") throw new Error("Mã nhân viên đã tồn tại. Vui lòng thử lại.");
      throw new Error(`Lỗi tạo nhân viên: ${error.message}`);
    }
    fireAuditLog({ action: "CREATE", tableName: "employees", recordId: created.id, description: `Tạo nhân viên: ${created.full_name} (${created.employee_code})`, newData: data });
    revalidatePath("/employees");
    return { id: created.id };
  });
}

export async function updateEmployeeAction(id: string, formData: EmployeeFormData) {
  return withAuth(async (supabase) => {
    const data = sanitizeFormData(formData);
    const { error } = await supabase.from("employees").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật: ${error.message}`);
    fireAuditLog({ action: "UPDATE", tableName: "employees", recordId: id, description: `Cập nhật nhân viên: ${data.full_name || id}` });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { id };
  });
}

export async function deleteEmployeeAction(id: string) {
  return withAuth(async (supabase) => {
    const { data: emp } = await supabase.from("employees").select("full_name, employee_code").eq("id", id).single();
    const { error } = await supabase.from("employees").update({ deleted_at: new Date().toISOString(), status: "inactive" }).eq("id", id);
    if (error) throw new Error(`Lỗi xóa nhân viên: ${error.message}`);
    fireAuditLog({ action: "DELETE", tableName: "employees", recordId: id, oldData: emp ?? undefined, description: `Xóa nhân viên: ${emp?.full_name || id} (${emp?.employee_code || ""})`, severity: "CRITICAL" });
    revalidatePath("/employees");
    return null;
  });
}

export async function updateEmployeeNotesAction(id: string, notes: string | null) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("employees").update({ salary_info: { notes } }).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật ghi chú: ${error.message}`);
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return null;
  });
}
