import { SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  canManageSettingsRole,
  normalizeEmployeeRole,
  normalizeRole,
  type Role,
} from "@/types/roles";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

type EmployeeContextRecord = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  role: string | null;
  gender: string | null;
  auth_user_id: string | null;
};

export interface AuthenticatedUserContext {
  user: User;
  employee: EmployeeContextRecord | null;
  shellRole: Role;
  userName: string;
  canManageSettings: boolean;
  canManageMembers: boolean;
}

async function getEmployeeByAuthUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<EmployeeContextRecord | null> {
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, full_name, email, phone, avatar_url, department, position, role, gender, auth_user_id",
    )
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Khong the tai ho so nhan vien: ${error.message}`);
  }

  return (data as EmployeeContextRecord | null) ?? null;
}

export async function syncAuthIdentity(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    fullName?: string | null;
    role?: string | null;
  },
) {
  if (updates.fullName === undefined && updates.role === undefined) return;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.admin.getUserById(userId);

  if (userError) {
    throw new Error(`Khong the tai tai khoan dang nhap: ${userError.message}`);
  }

  if (!user) return;

  const nextUserMetadata = { ...(user.user_metadata ?? {}) };
  const nextAppMetadata = { ...(user.app_metadata ?? {}) };

  if (updates.fullName !== undefined) {
    nextUserMetadata.full_name = updates.fullName?.trim() || "";
  }

  if (updates.role !== undefined) {
    nextAppMetadata.role = updates.role;
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      user_metadata: nextUserMetadata,
      app_metadata: nextAppMetadata,
    },
  );

  if (updateError) {
    throw new Error(`Khong the dong bo tai khoan dang nhap: ${updateError.message}`);
  }
}

async function bootstrapEmployeeProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<EmployeeContextRecord> {
  const email = user.email || "unknown";
  const fullName =
    typeof user.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : email.split("@")[0] || "Nhan vien moi";
  const role = normalizeEmployeeRole(
    (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined),
  );

  const { data: emailMatch, error: emailMatchError } = await supabase
    .from("employees")
    .select(
      "id, full_name, email, phone, avatar_url, department, position, role, gender, auth_user_id",
    )
    .eq("email", email)
    .is("auth_user_id", null)
    .maybeSingle();

  if (emailMatchError) {
    throw new Error(`Loi tim ho so nhan vien theo email: ${emailMatchError.message}`);
  }

  if (emailMatch) {
    const { data: linkedEmployee, error: linkError } = await supabase
      .from("employees")
      .update({
        auth_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", emailMatch.id)
      .select(
        "id, full_name, email, phone, avatar_url, department, position, role, gender, auth_user_id",
      )
      .single();

    if (linkError || !linkedEmployee) {
      throw new Error(
        `Loi lien ket ho so nhan vien: ${linkError?.message || "Unknown"}`,
      );
    }

    await syncAuthIdentity(supabase, user.id, {
      fullName: linkedEmployee.full_name || fullName,
      role: linkedEmployee.role || role,
    });

    return linkedEmployee as EmployeeContextRecord;
  }

  const { data, error } = await supabase
    .from("employees")
    .insert({
      full_name: fullName,
      email,
      auth_user_id: user.id,
      role,
      employee_code: `NV-${Date.now().toString(36).toUpperCase()}`,
      department: "Chua phan",
      position: "Nhan vien",
      status: "active",
      start_date: new Date().toISOString().split("T")[0],
    })
    .select(
      "id, full_name, email, phone, avatar_url, department, position, role, gender, auth_user_id",
    )
    .single();

  if (error || !data) {
    throw new Error(`Loi khoi tao ho so nhan vien: ${error?.message || "Unknown"}`);
  }

  await syncAuthIdentity(supabase, user.id, { fullName, role });

  return data as EmployeeContextRecord;
}

export async function getAuthenticatedUserContext(options?: {
  bootstrapProfile?: boolean;
}): Promise<AuthenticatedUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminSupabase = await createAdminClient();
  let employee = await getEmployeeByAuthUserId(adminSupabase, user.id);

  if (!employee && options?.bootstrapProfile) {
    employee = await bootstrapEmployeeProfile(adminSupabase, user);
  }

  const roleSource =
    employee?.role ??
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);

  return {
    user,
    employee,
    shellRole: normalizeRole(roleSource),
    userName:
      employee?.full_name ||
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : undefined) ||
      user.email?.split("@")[0] ||
      "User",
    canManageSettings: canManageSettingsRole(roleSource),
    canManageMembers: canManageSettingsRole(roleSource),
  };
}

export async function withAuth<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Chua dang nhap" };
    }

    const adminSupabase = await createAdminClient();
    const result = await action(adminSupabase, user.id);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.error("[withAuth] Error:", err);
    const message = err instanceof Error ? err.message : "Loi server";
    return { success: false, error: message };
  }
}

export async function withAdmin<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Chua dang nhap" };
    }

    const jwtRole = user.app_metadata?.role as string | undefined;

    if (!canManageSettingsRole(jwtRole)) {
      const adminFallback = await createAdminClient();
      const { data: employee } = await adminFallback
        .from("employees")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!employee || !canManageSettingsRole(employee.role)) {
        return { success: false, error: "Ban khong co quyen thuc hien thao tac nay" };
      }
    }

    const adminSupabase = await createAdminClient();
    const result = await action(adminSupabase, user.id);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.error("[withAdmin] Error:", err);
    const message = err instanceof Error ? err.message : "Loi server";
    return { success: false, error: message };
  }
}
