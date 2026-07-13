"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { withAdmin, syncAuthIdentity } from "@/lib/auth_utils";
import { ROLE_LABELS } from "@/types/employee-constants";
import type { EmployeeRole } from "@/types/employee";
import { normalizeEmployeeRole } from "@/types/roles";

export type AuthUserWithEmployee = {
  auth_id: string;
  email: string;
  jwt_role: EmployeeRole | null;
  created_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
  linked_employee: {
    id: string;
    full_name: string;
    email: string | null;
    role: EmployeeRole;
    avatar_url: string | null;
    auth_user_id: string;
    status: string;
  } | null;
  suggested_employee: {
    id: string;
    full_name: string;
    email: string | null;
    role: EmployeeRole;
    avatar_url: string | null;
  } | null;
};

export type AuthUsersPage = {
  users: AuthUserWithEmployee[];
  page: number;
  perPage: number;
  hasMore: boolean;
};

const roleSchema = z.enum(["admin", "manager", "sale", "media", "ctv"], {
  error: "Quyền không hợp lệ",
});

const uuidSchema = z.string().uuid("ID không hợp lệ");

export async function getAuthUsers(params?: { page?: number; perPage?: number }) {
  return withAdmin(async (supabase) => {
    const page = Math.max(1, Math.trunc(Number(params?.page) || 1));
    const perPage = Math.min(50, Math.max(1, Math.trunc(Number(params?.perPage) || 25)));
    const [authResult, employeeResult] = await Promise.all([
      supabase.auth.admin.listUsers({ page, perPage }),
      supabase
        .from("employees")
        .select("id, full_name, email, role, avatar_url, auth_user_id, status")
        .eq("status", "active")
        .order("full_name"),
    ]);

    if (authResult.error) throw new Error(authResult.error.message);
    if (employeeResult.error) throw new Error(employeeResult.error.message);

    const authUsers = (authResult.data.users || []).map((user) => ({
      auth_id: user.id,
      email: user.email || "",
      jwt_role: normalizeEmployeeRole(
        (user.app_metadata?.role as string | undefined) ?? null,
      ),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
      is_banned: !!user.banned_until,
    }));

    const employees = employeeResult.data || [];
    const linkedByAuthId = new Map(
      employees
        .filter((employee) => employee.auth_user_id)
        .map((employee) => [employee.auth_user_id as string, employee]),
    );
    const unlinkedByEmail = new Map(
      employees
        .filter((employee) => !employee.auth_user_id && employee.email)
        .map((employee) => [employee.email!.toLowerCase(), employee]),
    );

    const result: AuthUserWithEmployee[] = authUsers.map((user) => {
      const linked = linkedByAuthId.get(user.auth_id) || null;
      const emailMatch = linked
        ? null
        : unlinkedByEmail.get(user.email.toLowerCase()) || null;

      return {
        ...user,
        linked_employee: linked,
        suggested_employee: emailMatch,
      };
    });

    return {
      users: result,
      page,
      perPage,
      hasMore: authUsers.length === perPage,
    } satisfies AuthUsersPage;
  });
}

export async function updateUserRole(authUserId: string, newRole: string) {
  return withAdmin(async (supabase, userId) => {
    const parsedId = uuidSchema.safeParse(authUserId);
    if (!parsedId.success) throw new Error(parsedId.error.issues[0]?.message);
    if (parsedId.data === userId) {
      throw new Error("Không thể tự thay đổi quyền của chính bạn");
    }

    const parsedRole = roleSchema.safeParse(newRole);
    if (!parsedRole.success) {
      throw new Error(parsedRole.error.issues[0]?.message);
    }

    await syncAuthIdentity(supabase, parsedId.data, {
      role: parsedRole.data,
    });

    const { error: employeeError } = await supabase
      .from("employees")
      .update({
        role: parsedRole.data,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", parsedId.data);
    if (employeeError) throw new Error(employeeError.message);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "auth.users",
      recordId: parsedId.data,
      description: `Đổi quyền -> ${ROLE_LABELS[parsedRole.data]}`,
    });

    revalidatePath("/settings");
    return {
      message: `Đã cập nhật quyền thành ${ROLE_LABELS[parsedRole.data]}`,
    };
  });
}

export async function linkUserToEmployee(
  authUserId: string,
  employeeId: string,
) {
  return withAdmin(async (supabase) => {
    const parsedAuth = uuidSchema.safeParse(authUserId);
    if (!parsedAuth.success) throw new Error("Auth ID không hợp lệ");

    const parsedEmp = uuidSchema.safeParse(employeeId);
    if (!parsedEmp.success) throw new Error("Employee ID không hợp lệ");

    const { data: existing, error: existingError } = await supabase
      .from("employees")
      .select("auth_user_id, full_name, role")
      .eq("id", parsedEmp.data)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Khong tim thay nhan vien.");

    if (existing?.auth_user_id && existing.auth_user_id !== parsedAuth.data) {
      throw new Error(
        `${existing.full_name} đã được liên kết với tài khoản khác`,
      );
    }

    const { error: clearExistingError } = await supabase
      .from("employees")
      .update({
        auth_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", parsedAuth.data)
      .neq("id", parsedEmp.data);
    if (clearExistingError) throw new Error(clearExistingError.message);

    const { error } = await supabase
      .from("employees")
      .update({
        auth_user_id: parsedAuth.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsedEmp.data);

    if (error) throw new Error(error.message);

    await syncAuthIdentity(supabase, parsedAuth.data, {
      fullName: existing?.full_name || null,
      role: existing?.role || "ctv",
    });

    await writeAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: parsedEmp.data,
      oldData: { auth_user_id: existing.auth_user_id },
      newData: { auth_user_id: parsedAuth.data, role: existing.role },
      source: "server_action",
      description: `Liên kết auth user ${parsedAuth.data}`,
    });

    revalidatePath("/settings");
    return { message: "Đã liên kết thành công" };
  });
}

export async function unlinkUserFromEmployee(authUserId: string) {
  return withAdmin(async (supabase, userId) => {
    const parsedId = uuidSchema.safeParse(authUserId);
    if (!parsedId.success) throw new Error("Auth ID không hợp lệ");

    if (parsedId.data === userId) {
      throw new Error("Không thể hủy liên kết tài khoản của chính bạn");
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, full_name, role")
      .eq("auth_user_id", parsedId.data)
      .maybeSingle();

    if (employeeError) throw new Error(employeeError.message);

    const { error } = await supabase
      .from("employees")
      .update({
        auth_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", parsedId.data);

    if (error) throw new Error(error.message);

    await syncAuthIdentity(supabase, parsedId.data, {
      fullName: null,
      role: "ctv",
    });

    if (employee) {
      await writeAuditLog({
        action: "UPDATE",
        tableName: "employees",
        recordId: employee.id,
        oldData: { auth_user_id: parsedId.data, role: employee.role },
        newData: { auth_user_id: null, revoked_auth_role: "ctv" },
        source: "server_action",
        description: `Hủy liên kết ${employee.full_name} khỏi auth user`,
      });
    }

    revalidatePath("/settings");
    return { message: "Đã hủy liên kết" };
  });
}

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
