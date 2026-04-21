"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fireAuditLog } from "@/lib/audit";
import { syncAuthIdentity, withAdmin } from "@/lib/auth_utils";
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
  const { data, error } = await supabase
    .from("employees")
    .select("employee_code")
    .ilike("employee_code", "NV-%")
    .range(0, 4999);

  if (error) {
    throw new Error(`Không thể tạo mã nhân viên: ${error.message}`);
  }

  const maxNumber = (data || []).reduce((max, row) => {
    const match = String(row.employee_code || "").match(/^NV-(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);

  return `NV-${String(maxNumber + 1).padStart(3, "0")}`;
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

  return withAdmin(async (supabase) => {
    const data = normalizeEmptyStrings(
      sanitizePayload(parsed.data as EmployeePayload),
    );

    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      data.employee_code = await generateNextEmployeeCode(supabase);

      const { data: created, error } = await supabase
        .from("employees")
        .insert(data)
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

export async function updateEmployee(id: string, payload: EmployeePayload) {
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

  return withAdmin(async (supabase) => {
    const data = normalizeEmptyStrings(
      sanitizePayload(parsed.data as EmployeePayload),
    );

    const { data: current, error: currentError } = await supabase
      .from("employees")
      .select("id, full_name, role, auth_user_id, salary_info")
      .eq("id", parsedId.data)
      .single();

    if (currentError || !current) {
      throw new Error("Không tìm thấy nhân viên");
    }

    if (data.salary_info && typeof data.salary_info === "object") {
      const existing = (current.salary_info as SalaryInfo) || {};
      data.salary_info = { ...existing, ...(data.salary_info as SalaryInfo) };
    }

    const { error } = await supabase
      .from("employees")
      .update(data)
      .eq("id", parsedId.data);

    if (error) throw new Error(`Lỗi cập nhật: ${error.message}`);

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
      newData: data,
      source: "server_action",
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${parsedId.data}`);
    revalidatePath("/settings");
    return { id: parsedId.data };
  });
}

export async function softDeleteEmployee(id: string) {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  return withAdmin(async (supabase) => {
    const { data: emp } = await supabase
      .from("employees")
      .select("full_name, employee_code")
      .eq("id", parsedId.data)
      .single();

    const { error } = await supabase
      .from("employees")
      .update({
        deleted_at: new Date().toISOString(),
        status: "inactive",
      })
      .eq("id", parsedId.data);

    if (error) throw new Error(`Lỗi cho nghỉ việc: ${error.message}`);

    fireAuditLog({
      action: "DELETE",
      tableName: "employees",
      recordId: parsedId.data,
      oldData: emp ?? undefined,
      description: `Cho nghỉ việc: ${emp?.full_name || parsedId.data} (${emp?.employee_code || ""})`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${parsedId.data}`);
    return null;
  });
}

export async function restoreEmployee(id: string) {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  return withAdmin(async (supabase) => {
    const { error } = await supabase
      .from("employees")
      .update({
        deleted_at: null,
        status: "active",
      })
      .eq("id", parsedId.data);

    if (error) throw new Error(`Lỗi khôi phục: ${error.message}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: parsedId.data,
      description: `Khôi phục nhân viên #${parsedId.data.substring(0, 8)}`,
      source: "server_action",
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${parsedId.data}`);
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

  return withAdmin(async (supabase) => {
    const { error } = await supabase
      .from("employees")
      .update({ notes: parsedNotes.data })
      .eq("id", parsedId.data);

    if (error) throw new Error(`Lỗi cập nhật ghi chú: ${error.message}`);

    revalidatePath(`/employees/${parsedId.data}`);
    return null;
  });
}
