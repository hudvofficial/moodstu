"use server";

import { withAdmin } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/* ═══════════════════════════════════════════
   User Management — Admin-only actions
   Port V1 + V2 upgrades: Zod validation + AuditLog
   ═══════════════════════════════════════════ */

// ─── TYPES ──────────────────────────────────────────

export type AuthUserWithEmployee = {
  auth_id: string;
  email: string;
  jwt_role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
  linked_employee: {
    id: string;
    full_name: string;
    email: string | null;
    role: string;
    avatar_url: string | null;
    auth_user_id: string;
    status: string;
  } | null;
  suggested_employee: {
    id: string;
    full_name: string;
    email: string | null;
    role: string;
    avatar_url: string | null;
  } | null;
};

// ─── ZOD SCHEMAS ─────────────────────────────────────

const roleSchema = z.enum(["Admin", "Manager", "User"], {
  error: "Quyền không hợp lệ. Chỉ chấp nhận: Admin, Manager, User",
});

const uuidSchema = z.string().uuid("ID không hợp lệ");

// ─── GET AUTH USERS + EMPLOYEE LINKS ─────────────────

export async function getAuthUsers() {
  return withAdmin(async (supabase) => {
    // 1. Lấy auth users via Admin API
    const { data: authUsersRaw, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw new Error(authError.message);

    const authUsers = (authUsersRaw?.users || []).map((u) => ({
      auth_id: u.id,
      email: u.email || "",
      jwt_role: (u.app_metadata?.role as string) || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      is_banned: !!u.banned_until,
    }));

    // 2. Lấy employees (để match/link)
    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, email, role, avatar_url, auth_user_id, status")
      .eq("status", "active")
      .order("full_name");

    // 3. Merge: mỗi auth user → linked employee (nếu có)
    const result: AuthUserWithEmployee[] = authUsers.map((user) => {
      const linked =
        employees?.find(
          (e: { auth_user_id: string | null }) =>
            e.auth_user_id === user.auth_id,
        ) || null;
      const emailMatch = !linked
        ? employees?.find(
            (e: { email: string | null; auth_user_id: string | null }) =>
              e.email?.toLowerCase() === user.email?.toLowerCase() &&
              !e.auth_user_id,
          ) || null
        : null;

      return {
        ...user,
        linked_employee: linked,
        suggested_employee: emailMatch,
      };
    });

    return result;
  });
}

// ─── UPDATE USER ROLE ────────────────────────────────

export async function updateUserRole(authUserId: string, newRole: string) {
  return withAdmin(async (supabase) => {
    // V2 upgrade: Zod validation
    const parsedId = uuidSchema.safeParse(authUserId);
    if (!parsedId.success) throw new Error(parsedId.error.issues[0]?.message);

    const parsedRole = roleSchema.safeParse(newRole);
    if (!parsedRole.success) throw new Error(parsedRole.error.issues[0]?.message);

    // Update JWT role via admin auth API
    const { error: authError } = await supabase.auth.admin.updateUserById(
      parsedId.data,
      { app_metadata: { role: parsedRole.data } },
    );
    if (authError) throw new Error(authError.message);

    // Update employees.role (if linked)
    await supabase
      .from("employees")
      .update({ role: parsedRole.data, updated_at: new Date().toISOString() })
      .eq("auth_user_id", parsedId.data);

    // V2 upgrade: Audit log
    fireAuditLog({
      action: "UPDATE",
      tableName: "auth.users",
      recordId: parsedId.data,
      description: `Đổi quyền → ${parsedRole.data}`,
    });

    revalidatePath("/settings");
    return { message: `Đã cập nhật quyền thành ${parsedRole.data}` };
  });
}

// ─── LINK USER TO EMPLOYEE ───────────────────────────

export async function linkUserToEmployee(
  authUserId: string,
  employeeId: string,
) {
  return withAdmin(async (supabase) => {
    // V2: Zod validation
    const parsedAuth = uuidSchema.safeParse(authUserId);
    if (!parsedAuth.success) throw new Error("Auth ID không hợp lệ");

    const parsedEmp = uuidSchema.safeParse(employeeId);
    if (!parsedEmp.success) throw new Error("Employee ID không hợp lệ");

    // Check employee chưa link với ai khác
    const { data: existing } = await supabase
      .from("employees")
      .select("auth_user_id, full_name")
      .eq("id", parsedEmp.data)
      .single();

    if (existing?.auth_user_id && existing.auth_user_id !== parsedAuth.data) {
      throw new Error(
        `${existing.full_name} đã được liên kết với tài khoản khác`,
      );
    }

    // Clear old link (nếu auth user đang link employee khác)
    await supabase
      .from("employees")
      .update({
        auth_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", parsedAuth.data)
      .neq("id", parsedEmp.data);

    // Set new link
    const { error } = await supabase
      .from("employees")
      .update({
        auth_user_id: parsedAuth.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsedEmp.data);

    if (error) throw new Error(error.message);

    // V2 upgrade: Audit log
    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: parsedEmp.data,
      description: `Liên kết auth user ${parsedAuth.data}`,
    });

    revalidatePath("/settings");
    return { message: "Đã liên kết thành công" };
  });
}

// ─── UNLINK USER FROM EMPLOYEE ───────────────────────

export async function unlinkUserFromEmployee(authUserId: string) {
  return withAdmin(async (supabase) => {
    const parsedId = uuidSchema.safeParse(authUserId);
    if (!parsedId.success) throw new Error("Auth ID không hợp lệ");

    // Get employee name for audit before unlinking
    const { data: emp } = await supabase
      .from("employees")
      .select("id, full_name")
      .eq("auth_user_id", parsedId.data)
      .single();

    const { error } = await supabase
      .from("employees")
      .update({
        auth_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", parsedId.data);

    if (error) throw new Error(error.message);

    // V2 upgrade: Audit log
    if (emp) {
      fireAuditLog({
        action: "UPDATE",
        tableName: "employees",
        recordId: emp.id,
        description: `Hủy liên kết ${emp.full_name} khỏi auth user`,
      });
    }

    revalidatePath("/settings");
    return { message: "Đã hủy liên kết" };
  });
}

// ─── GET UNLINKED EMPLOYEES (for dropdown) ───────────

export async function getUnlinkedEmployees() {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, email, role, avatar_url")
      .is("auth_user_id", null)
      .eq("status", "active")
      .order("full_name");

    if (error) throw new Error(error.message);
    return data;
  });
}
