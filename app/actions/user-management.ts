"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
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

const roleSchema = z.enum(["admin", "manager", "sale", "media", "ctv"], {
  error: "Quyen khong hop le",
});

const uuidSchema = z.string().uuid("ID khong hop le");

export async function getAuthUsers() {
  return withAdmin(async (supabase) => {
    const { data: authUsersRaw, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) throw new Error(authError.message);

    const authUsers = (authUsersRaw?.users || []).map((u) => ({
      auth_id: u.id,
      email: u.email || "",
      jwt_role: normalizeEmployeeRole(
        (u.app_metadata?.role as string | undefined) ?? null,
      ),
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      is_banned: !!u.banned_until,
    }));

    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, email, role, avatar_url, auth_user_id, status")
      .eq("status", "active")
      .order("full_name");

    const result: AuthUserWithEmployee[] = authUsers.map((user) => {
      const linked =
        employees?.find(
          (employee: { auth_user_id: string | null }) =>
            employee.auth_user_id === user.auth_id,
        ) || null;
      const emailMatch = !linked
        ? employees?.find(
            (employee: {
              email: string | null;
              auth_user_id: string | null;
            }) =>
              employee.email?.toLowerCase() === user.email.toLowerCase() &&
              !employee.auth_user_id,
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

export async function updateUserRole(authUserId: string, newRole: string) {
  return withAdmin(async (supabase) => {
    const parsedId = uuidSchema.safeParse(authUserId);
    if (!parsedId.success) throw new Error(parsedId.error.issues[0]?.message);

    const parsedRole = roleSchema.safeParse(newRole);
    if (!parsedRole.success) {
      throw new Error(parsedRole.error.issues[0]?.message);
    }

    await syncAuthIdentity(supabase, parsedId.data, {
      role: parsedRole.data,
    });

    await supabase
      .from("employees")
      .update({
        role: parsedRole.data,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", parsedId.data);

    fireAuditLog({
      action: "UPDATE",
      tableName: "auth.users",
      recordId: parsedId.data,
      description: `Doi quyen -> ${ROLE_LABELS[parsedRole.data]}`,
    });

    revalidatePath("/settings");
    return {
      message: `Da cap nhat quyen thanh ${ROLE_LABELS[parsedRole.data]}`,
    };
  });
}

export async function linkUserToEmployee(
  authUserId: string,
  employeeId: string,
) {
  return withAdmin(async (supabase) => {
    const parsedAuth = uuidSchema.safeParse(authUserId);
    if (!parsedAuth.success) throw new Error("Auth ID khong hop le");

    const parsedEmp = uuidSchema.safeParse(employeeId);
    if (!parsedEmp.success) throw new Error("Employee ID khong hop le");

    const { data: existing } = await supabase
      .from("employees")
      .select("auth_user_id, full_name, role")
      .eq("id", parsedEmp.data)
      .single();

    if (existing?.auth_user_id && existing.auth_user_id !== parsedAuth.data) {
      throw new Error(`${existing.full_name} da duoc lien ket voi tai khoan khac`);
    }

    await supabase
      .from("employees")
      .update({
        auth_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("auth_user_id", parsedAuth.data)
      .neq("id", parsedEmp.data);

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

    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: parsedEmp.data,
      description: `Lien ket auth user ${parsedAuth.data}`,
    });

    revalidatePath("/settings");
    return { message: "Da lien ket thanh cong" };
  });
}

export async function unlinkUserFromEmployee(authUserId: string) {
  return withAdmin(async (supabase) => {
    const parsedId = uuidSchema.safeParse(authUserId);
    if (!parsedId.success) throw new Error("Auth ID khong hop le");

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

    if (emp) {
      fireAuditLog({
        action: "UPDATE",
        tableName: "employees",
        recordId: emp.id,
        description: `Huy lien ket ${emp.full_name} khoi auth user`,
      });
    }

    revalidatePath("/settings");
    return { message: "Da huy lien ket" };
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
