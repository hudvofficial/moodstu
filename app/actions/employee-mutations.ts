"use server";

import { revalidatePath } from "next/cache";
import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fireAuditLog } from "@/lib/audit";
import {
  requireEmployeesWriteAccess,
  syncAuthIdentity,
  withEmployeesWriteAccess,
} from "@/lib/auth_utils";
import {
  employeeCreateSchema,
  employeeNotesSchema,
  employeeUpdateSchema,
} from "@/lib/validations/employee.schema";
import { ALLOWED_FIELDS } from "@/types/employee-form";
import type { SalaryInfo } from "@/types/employee";

type EmployeePayload = Record<string, string | number | object | null | undefined>;
type CleanEmployeePayload = Record<string, string | number | object | null>;

const uuidSchema = z.string().uuid("Employee ID không hợp lệ");

function sanitizePayload(raw: EmployeePayload): CleanEmployeePayload {
  const clean: CleanEmployeePayload = {};
  for (const field of ALLOWED_FIELDS) {
    if (raw[field] !== undefined) {
      clean[field] = raw[field] as string | number | object | null;
    }
  }
  return clean;
}

function normalizeEmptyStrings(payload: CleanEmployeePayload) {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.trim() === "") {
      payload[key] = null;
    }
  }
  return payload;
}

async function generateNextEmployeeCode(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("next_employee_code");
  if (error) {
    throw new Error(`Không thể tạo mã nhân viên: ${error.message}`);
  }
  return String(data);
}

async function assertCanDeactivateEmployee(
  supabase: SupabaseClient,
  actorUserId: string,
  target: {
    id: string;
    role: string | null;
    auth_user_id: string | null;
    deleted_at: string | null;
    status: string | null;
  },
) {
  const actorContext = await requireEmployeesWriteAccess(supabase, actorUserId);

  if (actorContext.employee?.id === target.id || target.auth_user_id === actorUserId) {
    throw new Error("Bạn không thể cho chính mình nghỉ việc");
  }

  const isPrivilegedTarget =
    !target.deleted_at &&
    target.status === "active" &&
    (target.role === "admin" || target.role === "manager");

  if (!isPrivilegedTarget) return;

  const { count, error } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .in("role", ["admin", "manager"])
    .eq("status", "active")
    .is("deleted_at", null)
    .neq("id", target.id);

  if (error) {
    throw new Error(`Không thể kiểm tra quyền quản trị còn lại: ${error.message}`);
  }

  if ((count || 0) < 1) {
    throw new Error("Không thể cho nghỉ nhân sự quản trị cuối cùng");
  }
}

function revalidateEmployeePaths(employeeId: string) {
  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/settings");
}

export async function createEmployee(payload: EmployeePayload) {
  const parsed = employeeCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false as const,
      error: `Dữ liệu không hợp lệ: ${firstIssue.message}`,
    };
  }

  return withEmployeesWriteAccess(async (supabase: SupabaseClient<Database>) => {
    const data = normalizeEmptyStrings(
      sanitizePayload(parsed.data as EmployeePayload),
    );

    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      data.employee_code = await generateNextEmployeeCode(supabase);

      const { data: created, error } = await supabase
        .from("employees")
        .insert(data as Database["public"]["Tables"]["employees"]["Insert"])
        .select("id, full_name, employee_code")
        .single();

      if (!error && created) {
        fireAuditLog({
          action: "CREATE",
          tableName: "employees",
          recordId: created.id,
          description: `Tạo nhân viên: ${created.full_name} (${created.employee_code})`,
          newData: data,
          source: "server_action",
        });

        revalidatePath("/employees");
        return { id: created.id, employee_code: created.employee_code };
      }

      lastError = error;
      if (error?.code !== "23505") break;
    }

    if (lastError?.code === "23505") {
      throw new Error("Mã nhân viên đã tồn tại. Vui lòng thử lại.");
    }

    throw new Error(
      `Lỗi tạo nhân viên: ${lastError?.message || "Không xác định"}`,
    );
  });
}

export async function updateEmployee(
  id: string,
  payload: EmployeePayload,
  expectedUpdatedAt?: string | null,
) {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  const parsed = employeeUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false as const,
      error: `Dữ liệu không hợp lệ: ${parsed.error.issues[0]?.message}`,
    };
  }

  return withEmployeesWriteAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const data = normalizeEmptyStrings(
      sanitizePayload(parsed.data as EmployeePayload),
    );

    const { data: current, error: currentError } = await supabase
      .from("employees")
      .select("id, full_name, role, auth_user_id, salary_info, updated_at, status, deleted_at")
      .eq("id", parsedId.data)
      .single();

    if (currentError || !current) {
      throw new Error("Không tìm thấy nhân viên");
    }

    if (
      current.auth_user_id === userId &&
      typeof data.status === "string" &&
      data.status !== "active"
    ) {
      throw new Error("Bạn không thể tự vô hiệu hóa tài khoản của mình");
    }

    if (
      current.auth_user_id === userId &&
      typeof data.role === "string" &&
      current.role !== data.role
    ) {
      throw new Error("Bạn không thể tự đổi vai trò của mình");
    }

    if (data.status === "inactive" || data.deleted_at) {
      await assertCanDeactivateEmployee(supabase, userId, current);
    }

    if (data.salary_info && typeof data.salary_info === "object") {
      const existing = (current.salary_info as SalaryInfo) || {};
      data.salary_info = { ...existing, ...(data.salary_info as SalaryInfo) };
    }

    const now = new Date().toISOString();
    let query = supabase
      .from("employees")
      .update({ ...data, updated_at: now })
      .eq("id", parsedId.data);

    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: updatedRows, error } = await query.select("id, updated_at");

    if (error) throw new Error(`Lỗi cập nhật: ${error.message}`);
    if (expectedUpdatedAt && (!updatedRows || updatedRows.length === 0)) {
      throw new Error("Dữ liệu nhân viên đã thay đổi. Tải lại trước khi lưu.");
    }

    if (current.auth_user_id && (data.full_name || data.role)) {
      await syncAuthIdentity(supabase, current.auth_user_id, {
        fullName:
          typeof data.full_name === "string" ? data.full_name : current.full_name,
        role: typeof data.role === "string" ? data.role : current.role,
      });
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: parsedId.data,
      description: `Cập nhật nhân viên: ${
        (data.full_name as string) || current.full_name || parsedId.data
      }`,
      oldData: { updated_at: current.updated_at },
      newData: { ...data, updated_at: now },
      source: "server_action",
    });

    revalidateEmployeePaths(parsedId.data);
    return { id: parsedId.data, updated_at: updatedRows?.[0]?.updated_at || now };
  });
}

export async function softDeleteEmployee(id: string) {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  return withEmployeesWriteAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { data: emp, error: currentError } = await supabase
      .from("employees")
      .select("id, full_name, employee_code, role, auth_user_id, status, deleted_at")
      .eq("id", parsedId.data)
      .single();

    if (currentError || !emp) {
      throw new Error("Không tìm thấy nhân viên");
    }

    await assertCanDeactivateEmployee(supabase, userId, emp);

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("employees")
      .update({
        deleted_at: now,
        status: "inactive",
        updated_at: now,
      })
      .eq("id", parsedId.data);

    if (error) throw new Error(`Lỗi cho nghỉ việc: ${error.message}`);

    if (emp.auth_user_id) {
      await syncAuthIdentity(supabase, emp.auth_user_id, { role: "viewer" });
    }

    fireAuditLog({
      action: "DELETE",
      tableName: "employees",
      recordId: parsedId.data,
      oldData: emp,
      newData: { deleted_at: now, status: "inactive" },
      description: `Cho nghỉ việc: ${emp.full_name || parsedId.data} (${emp.employee_code || ""})`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidateEmployeePaths(parsedId.data);
    return null;
  });
}

export async function restoreEmployee(id: string) {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  return withEmployeesWriteAccess(async (supabase: SupabaseClient<Database>) => {
    const { data: emp, error: currentError } = await supabase
      .from("employees")
      .select("id, full_name, role, auth_user_id, status, deleted_at")
      .eq("id", parsedId.data)
      .single();

    if (currentError || !emp) {
      throw new Error("Không tìm thấy nhân viên");
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("employees")
      .update({
        deleted_at: null,
        status: "active",
        updated_at: now,
      })
      .eq("id", parsedId.data);

    if (error) throw new Error(`Lỗi khôi phục: ${error.message}`);

    if (emp.auth_user_id && emp.role) {
      await syncAuthIdentity(supabase, emp.auth_user_id, { role: emp.role });
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: parsedId.data,
      oldData: emp,
      newData: { deleted_at: null, status: "active", updated_at: now },
      description: `Khôi phục nhân viên: ${emp.full_name || parsedId.data}`,
      source: "server_action",
    });

    revalidateEmployeePaths(parsedId.data);
    return null;
  });
}

export async function updateEmployeeNotes(id: string, notes: string | null) {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  const parsedNotes = employeeNotesSchema.safeParse(notes);
  if (!parsedNotes.success) {
    return {
      success: false as const,
      error: parsedNotes.error.issues[0]?.message || "Ghi chú không hợp lệ",
    };
  }

  return withEmployeesWriteAccess(async (supabase: SupabaseClient<Database>) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("employees")
      .update({ notes: parsedNotes.data, updated_at: now })
      .eq("id", parsedId.data);

    if (error) throw new Error(`Lỗi cập nhật ghi chú: ${error.message}`);

    revalidatePath(`/employees/${parsedId.data}`);
    return null;
  });
}
