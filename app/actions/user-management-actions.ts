"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// User Management Actions — Auth Users + Employee Linking
// V1 ref: user-management.ts (193 lines, 5 fn)
// V2: withAuth + fireAuditLog (V1 used withAdmin, no audit)
// ═══════════════════════════════════════════

// ─── TYPES ────────────────────────────────────

export type AuthUserWithEmployee = {
  auth_id: string;
  email: string;
  jwt_role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
  linked_employee: { id: string; full_name: string; email: string | null; role: string; avatar_url: string | null; auth_user_id: string; status: string } | null;
  suggested_employee: { id: string; full_name: string; email: string | null; role: string; avatar_url: string | null } | null;
};

// ─── GET AUTH USERS + EMPLOYEE LINKS ──────────

export async function getAuthUsers() {
  return withAuth(async (supabase) => {
    const { data: authUsersRaw, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw new Error(authError.message);

    const authUsers = (authUsersRaw?.users || []).map((u) => ({
      auth_id: u.id, email: u.email || "",
      jwt_role: (u.app_metadata?.role as string) || null,
      created_at: u.created_at, last_sign_in_at: u.last_sign_in_at || null, is_banned: !!u.banned_until,
    }));

    const { data: employees } = await supabase.from("employees").select("id, full_name, email, role, avatar_url, auth_user_id, status").eq("status", "active").order("full_name");

    const result: AuthUserWithEmployee[] = authUsers.map((user) => {
      const linked = employees?.find((e: { auth_user_id: string | null }) => e.auth_user_id === user.auth_id) || null;
      const emailMatch = !linked ? employees?.find((e: { email: string | null; auth_user_id: string | null }) => e.email?.toLowerCase() === user.email?.toLowerCase() && !e.auth_user_id) || null : null;
      return { ...user, linked_employee: linked, suggested_employee: emailMatch };
    });
    return result;
  });
}

// ─── UPDATE USER ROLE ─────────────────────────

export async function updateUserRole(authUserId: string, newRole: string) {
  return withAuth(async (supabase) => {
    if (!["Admin", "Manager", "User"].includes(newRole)) throw new Error(`Invalid role: ${newRole}`);

    const { error: authError } = await supabase.auth.admin.updateUserById(authUserId, { app_metadata: { role: newRole } });
    if (authError) throw new Error(authError.message);

    await supabase.from("employees").update({ role: newRole, updated_at: new Date().toISOString() }).eq("auth_user_id", authUserId);

    fireAuditLog({ action: "UPDATE", tableName: "auth.users", recordId: authUserId, description: `Cập nhật quyền → ${newRole}` });
    revalidatePath("/settings");
    return { message: `Đã cập nhật quyền thành ${newRole}` };
  });
}

// ─── LINK USER TO EMPLOYEE ────────────────────

export async function linkUserToEmployee(authUserId: string, employeeId: string) {
  return withAuth(async (supabase) => {
    const { data: existing } = await supabase.from("employees").select("auth_user_id, full_name").eq("id", employeeId).single();
    if (existing?.auth_user_id && existing.auth_user_id !== authUserId) throw new Error(`${existing.full_name} đã được liên kết với tài khoản khác`);

    await supabase.from("employees").update({ auth_user_id: null, updated_at: new Date().toISOString() }).eq("auth_user_id", authUserId).neq("id", employeeId);
    const { error } = await supabase.from("employees").update({ auth_user_id: authUserId, updated_at: new Date().toISOString() }).eq("id", employeeId);
    if (error) throw new Error(error.message);

    fireAuditLog({ action: "UPDATE", tableName: "employees", recordId: employeeId, description: `Liên kết user → employee` });
    revalidatePath("/settings");
    return { message: "Đã liên kết thành công" };
  });
}

// ─── UNLINK USER FROM EMPLOYEE ────────────────

export async function unlinkUserFromEmployee(authUserId: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("employees").update({ auth_user_id: null, updated_at: new Date().toISOString() }).eq("auth_user_id", authUserId);
    if (error) throw new Error(error.message);

    fireAuditLog({ action: "UPDATE", tableName: "employees", description: `Hủy liên kết user ${authUserId.substring(0, 8)}` });
    revalidatePath("/settings");
    return { message: "Đã hủy liên kết" };
  });
}

// ─── GET UNLINKED EMPLOYEES ───────────────────

export async function getUnlinkedEmployees() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.from("employees").select("id, full_name, email, role, avatar_url").is("auth_user_id", null).eq("status", "active").order("full_name");
    if (error) throw new Error(error.message);
    return data;
  });
}
