"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { getNextEmployeeCode } from "./employee-queries";
import { ALLOWED_FIELDS } from "@/types/employee-form";
import { employeeCreateSchema } from "@/lib/validations/employee.schema";
import type { SalaryInfo } from "@/types/employee";

// ═══════════════════════════════════════════
// Employee Mutations — Create, Update, Delete
// Follow V2 Template: mutations separate from queries
// Hybrid Gold Standard: Employees scaffold + Contracts patterns
// ═══════════════════════════════════════════

type EmployeePayload = Record<string, string | number | object | null | undefined>;

function sanitizePayload(raw: EmployeePayload): Record<string, string | number | object | null> {
  const clean: Record<string, string | number | object | null> = {};
  for (const field of ALLOWED_FIELDS) {
    if (raw[field] !== undefined) clean[field] = raw[field] as string | number | object | null;
  }
  return clean;
}

// ─── createEmployee ──────────────────────────
export async function createEmployee(payload: EmployeePayload) {
  // Zod validation (Gap C fix — industry standard)
  const parsed = employeeCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false as const,
      error: `Dữ liệu không hợp lệ: ${firstIssue.message}`,
    };
  }

  return withAuth(async (supabase) => {
    const data = sanitizePayload(parsed.data as EmployeePayload);

    // Auto-generate employee_code
    const employeeCode = await getNextEmployeeCode();
    data.employee_code = employeeCode;

    const { data: created, error } = await supabase
      .from("employees")
      .insert(data)
      .select("id, full_name, employee_code")
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("Mã nhân viên đã tồn tại. Vui lòng thử lại.");
      throw new Error(`Lỗi tạo nhân viên: ${error.message}`);
    }

    fireAuditLog({
      action: "CREATE", tableName: "employees", recordId: created.id,
      description: `Tạo nhân viên: ${created.full_name} (${created.employee_code})`,
      newData: data,
    });

    revalidatePath("/employees");
    return { id: created.id, employee_code: created.employee_code };
  });
}

// ─── updateEmployee ──────────────────────────
export async function updateEmployee(id: string, payload: EmployeePayload) {
  return withAuth(async (supabase) => {
    const data = sanitizePayload(payload);

    // JSONB merge for salary_info — read existing, spread merge, NEVER overwrite
    if (data.salary_info && typeof data.salary_info === "object") {
      const { data: current } = await supabase
        .from("employees")
        .select("salary_info")
        .eq("id", id)
        .single();

      const existing = (current?.salary_info as SalaryInfo) || {};
      data.salary_info = { ...existing, ...(data.salary_info as SalaryInfo) };
    }

    // Do NOT set updated_at — DB trigger handles it
    const { error } = await supabase.from("employees").update(data).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật: ${error.message}`);

    fireAuditLog({
      action: "UPDATE", tableName: "employees", recordId: id,
      description: `Cập nhật nhân viên: ${(data.full_name as string) || id}`,
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { id };
  });
}

// ─── softDeleteEmployee ──────────────────────
export async function softDeleteEmployee(id: string) {
  return withAuth(async (supabase) => {
    const { data: emp } = await supabase
      .from("employees")
      .select("full_name, employee_code")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw new Error(`Lỗi cho nghỉ việc: ${error.message}`);

    fireAuditLog({
      action: "DELETE", tableName: "employees", recordId: id,
      oldData: emp ?? undefined,
      description: `Cho nghỉ việc: ${emp?.full_name || id} (${emp?.employee_code || ""})`,
      severity: "WARNING",
    });

    revalidatePath("/employees");
    return null;
  });
}

// ─── restoreEmployee ─────────────────────────
export async function restoreEmployee(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("employees")
      .update({ deleted_at: null })
      .eq("id", id);

    if (error) throw new Error(`Lỗi khôi phục: ${error.message}`);

    fireAuditLog({
      action: "UPDATE", tableName: "employees", recordId: id,
      description: `Khôi phục nhân viên #${id.substring(0, 8)}`,
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return null;
  });
}

// ─── updateEmployeeNotes ─────────────────────
// Uses dedicated `notes` column (NOT salary_info JSONB)
export async function updateEmployeeNotes(id: string, notes: string | null) {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("employees")
      .update({ notes })
      .eq("id", id);

    if (error) throw new Error(`Lỗi cập nhật ghi chú: ${error.message}`);

    revalidatePath(`/employees/${id}`);
    return null;
  });
}
