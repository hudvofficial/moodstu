import { cache } from "react";
import { SupabaseClient, type User } from "@supabase/supabase-js";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  canManageSettingsRole,
  normalizeEmployeeRole,
  normalizeRole,
  canAccess,
  type Role,
} from "@/types/roles";
import type { ActionResult } from "@/types/action-result";

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
  status: string | null;
  deleted_at: string | null;
};

type AuthContextUser = Pick<
  User,
  "id" | "email" | "app_metadata" | "user_metadata"
>;

export interface AuthenticatedUserContext {
  user: AuthContextUser;
  employee: EmployeeContextRecord | null;
  shellRole: Role;
  userName: string;
  canManageSettings: boolean;
  canManageMembers: boolean;
}

const EMPLOYEE_CONTEXT_SELECT =
  "id, full_name, email, phone, avatar_url, department, position, role, gender, auth_user_id, status, deleted_at";

function isActiveEmployeeContext(employee: EmployeeContextRecord | null) {
  return !!employee && !employee.deleted_at && employee.status === "active";
}

async function getEmployeeByAuthUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<EmployeeContextRecord | null> {
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_CONTEXT_SELECT)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Không thể tải hồ sơ nhân viên: ${error.message}`);
  }

  return (data as EmployeeContextRecord | null) ?? null;
}

const getVerifiedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
});

const getClaimsUser = cache(async (): Promise<AuthContextUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) return null;

  const { claims } = data;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    app_metadata: (claims.app_metadata ?? {}) as User["app_metadata"],
    user_metadata: (claims.user_metadata ?? {}) as User["user_metadata"],
  };
});

const getEmployeeContextByAuthUserId = cache(
  async (userId: string): Promise<EmployeeContextRecord | null> => {
    const adminSupabase = await createAdminClient();
    return getEmployeeByAuthUserId(adminSupabase, userId);
  },
);

const canCurrentUserManageSettings = cache(
  async (userId: string, jwtRole: string | null): Promise<boolean> => {
    const employee = await getEmployeeContextByAuthUserId(userId);
    if (employee) {
      return isActiveEmployeeContext(employee) && canManageSettingsRole(employee.role);
    }

    return (
      process.env.ALLOW_SETTINGS_JWT_ADMIN_FALLBACK === "true" &&
      canManageSettingsRole(jwtRole)
    );
  },
);

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
    throw new Error(`Không thể tải tài khoản đăng nhập: ${userError.message}`);
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
    throw new Error(`Không thể đồng bộ tài khoản đăng nhập: ${updateError.message}`);
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
      : email.split("@")[0] || "Nhân viên mới";
  const role = normalizeEmployeeRole(
    (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined),
  );

  const { data: emailMatch, error: emailMatchError } = await supabase
    .from("employees")
    .select(EMPLOYEE_CONTEXT_SELECT)
    .eq("email", email)
    .is("auth_user_id", null)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (emailMatchError) {
    throw new Error(`Lỗi tìm hồ sơ nhân viên theo email: ${emailMatchError.message}`);
  }

  if (emailMatch) {
    const { data: linkedEmployee, error: linkError } = await supabase
      .from("employees")
      .update({
        auth_user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", emailMatch.id)
      .select(EMPLOYEE_CONTEXT_SELECT)
      .single();

    if (linkError || !linkedEmployee) {
      throw new Error(
        `Lỗi liên kết hồ sơ nhân viên: ${linkError?.message || "Không xác định"}`,
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
      department: "Chưa phân",
      position: "Nhân viên",
      status: "active",
      start_date: new Date().toISOString().split("T")[0],
    })
    .select(EMPLOYEE_CONTEXT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(`Lỗi khởi tạo hồ sơ nhân viên: ${error?.message || "Không xác định"}`);
  }

  await syncAuthIdentity(supabase, user.id, { fullName, role });

  return data as EmployeeContextRecord;
}

const getAuthenticatedUserContextCached = cache(
  async (bootstrapProfile: boolean): Promise<AuthenticatedUserContext | null> => {
    const verifiedUser = bootstrapProfile ? await getVerifiedUser() : null;
    const user = verifiedUser ?? (bootstrapProfile ? null : await getClaimsUser());
    if (!user) return null;

    const adminSupabase = await createAdminClient();
    let employee = await getEmployeeContextByAuthUserId(user.id);

    if (!employee && bootstrapProfile && verifiedUser) {
      employee = await bootstrapEmployeeProfile(adminSupabase, verifiedUser);
    }

    const activeEmployee = isActiveEmployeeContext(employee) ? employee : null;
    const roleSource = employee
      ? activeEmployee?.role ?? null
      : (user.app_metadata?.role as string | undefined) ??
        (user.user_metadata?.role as string | undefined);
    const hasSettingsAdminAccess = activeEmployee
      ? canManageSettingsRole(activeEmployee.role)
      : process.env.ALLOW_SETTINGS_JWT_ADMIN_FALLBACK === "true" &&
        canManageSettingsRole(roleSource);

    return {
      user,
      employee: activeEmployee,
      shellRole: normalizeRole(roleSource),
      userName:
        activeEmployee?.full_name ||
        (typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined) ||
        user.email?.split("@")[0] ||
        "User",
      canManageSettings: hasSettingsAdminAccess,
      canManageMembers: hasSettingsAdminAccess,
    };
  },
);

export async function getAuthenticatedUserContext(options?: {
  bootstrapProfile?: boolean;
}): Promise<AuthenticatedUserContext | null> {
  return getAuthenticatedUserContextCached(options?.bootstrapProfile === true);
}

export async function withAuth<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await getVerifiedUser();

    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const adminSupabase = await createAdminClient();
    const result = await action(adminSupabase, user.id);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.error("[withAuth] Error:", err);
    const message = err instanceof Error 
      ? err.message 
      : (typeof err === "object" && err !== null && "message" in err) 
        ? String((err as { message: unknown }).message) 
        : "Lỗi server";
    return { success: false, error: message };
  }
}

export async function withAdmin<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await getVerifiedUser();

    if (!user) {
      return { success: false, error: "Chưa đăng nhập" };
    }

    const jwtRole = (user.app_metadata?.role as string | undefined) ?? null;
    const canManage = await canCurrentUserManageSettings(user.id, jwtRole);

    if (!canManage) {
      return { success: false, error: "Bạn không có quyền thực hiện thao tác này" };
    }

    const adminSupabase = await createAdminClient();
    const result = await action(adminSupabase, user.id);
    return { success: true, data: result };
  } catch (err: unknown) {
    console.error("[withAdmin] Error:", err);
    const message = err instanceof Error 
      ? err.message 
      : (typeof err === "object" && err !== null && "message" in err) 
        ? String((err as { message: unknown }).message) 
        : "Lỗi server";
    return { success: false, error: message };
  }
}

async function resolveActiveUserRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ employee: EmployeeContextRecord | null; role: Role }> {
  const employee = await getEmployeeContextByAuthUserId(userId);

  if (employee && !isActiveEmployeeContext(employee)) {
    throw new Error("Tài khoản nhân viên đã bị vô hiệu hóa");
  }

  let roleSource = employee?.role ?? null;

  if (!roleSource) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      throw new Error("Không tìm thấy tài khoản đăng nhập");
    }

    roleSource =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined) ??
      null;
  }

  return { employee, role: normalizeRole(roleSource) };
}

export async function requireSettingsAdminAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const employee = await getEmployeeByAuthUserId(supabase, userId);

  if (!employee || !isActiveEmployeeContext(employee)) {
    throw new Error("KhĂ´ng tĂ¬m tháº¥y thĂ´ng tin nhĂ¢n viĂªn");
  }

  if (!canManageSettingsRole(employee.role)) {
    throw new Error("Báº¡n khĂ´ng cĂ³ quyá»n quáº£n trá»‹ cĂ i Ä‘áº·t");
  }

  return { employee, role: normalizeRole(employee.role) };
}

/**
 * Gatekeeper function for CRM server actions.
 * Throws an error if the user lacks the 'crm' permission.
 * Expected to be caught by the withAuth wrapper.
 */
export async function requireCrmAccess(supabase: SupabaseClient, userId: string) {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, full_name, role, auth_user_id, status, deleted_at")
    .eq("auth_user_id", userId)
    .single();

  if (error || !employee || !isActiveEmployeeContext(employee as EmployeeContextRecord)) {
    throw new Error("Không tìm thấy thông tin nhân viên");
  }

  if (!canAccess(employee.role as Role, "crm")) {
    throw new Error("Bạn không có quyền truy cập CRM");
  }

  return { employee, role: employee.role as Role };
}

/**
 * Gatekeeper function for Moodie server actions.
 * Moodie is user-facing, but skill access is still constrained by shell role.
 */
export async function requireMoodieAccess(supabase: SupabaseClient, userId: string) {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, full_name, role, auth_user_id, status, deleted_at")
    .eq("auth_user_id", userId)
    .single();

  if (error || !employee || !isActiveEmployeeContext(employee as EmployeeContextRecord)) {
    throw new Error("Không tìm thấy thông tin nhân viên");
  }

  if (!canAccess(employee.role as Role, "moodie")) {
    throw new Error("Bạn không có quyền truy cập Moodie");
  }

  return { employee, role: employee.role as Role };
}

/**
 * Gatekeeper function for Finance server actions.
 * Finance reads use the admin client for RPC/service-role access, so each action
 * must still enforce app-level finance permission after authentication.
 */
export async function requireFinanceAccess(supabase: SupabaseClient, userId: string) {
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, full_name, role, auth_user_id, status, deleted_at")
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error("Không tìm thấy thông tin nhân viên");
  }

  if (employee && !isActiveEmployeeContext(employee as EmployeeContextRecord)) {
    throw new Error("Tài khoản nhân viên đã bị vô hiệu hóa");
  }

  let roleSource = employee?.role ?? null;

  if (!roleSource) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.admin.getUserById(userId);

    if (userError || !user) {
      throw new Error("Không tìm thấy tài khoản đăng nhập");
    }

    roleSource =
      (user.app_metadata?.role as string | undefined) ??
      (user.user_metadata?.role as string | undefined) ??
      null;
  }

  const role = normalizeRole(roleSource);

  if (!canAccess(role, "finance")) {
    throw new Error("Bạn không có quyền truy cập Tài chính");
  }

  return { employee, role };
}

export async function withFinanceRead<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireFinanceAccess(supabase, userId);
    return action(supabase, userId);
  });
}

/**
 * Gatekeeper for Printing/Labs server actions.
 * Printing actions use the admin client after authentication, so the module
 * permission must be enforced inside each action, not only at the route level.
 */
export async function requirePrintingAccess(supabase: SupabaseClient, userId: string) {
  const { employee, role } = await resolveActiveUserRole(supabase, userId);

  if (!canAccess(role, "printing")) {
    throw new Error("Bạn không có quyền truy cập Printing");
  }

  return { employee, role };
}

export async function withPrintingAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requirePrintingAccess(supabase, userId);
    return action(supabase, userId);
  });
}

/**
 * Gatekeeper for Services server actions.
 * Services actions use the admin client after authentication, so app-level
 * module permission must be enforced before every read/write.
 */
export async function requireServicesAccess(supabase: SupabaseClient, userId: string) {
  const { employee, role } = await resolveActiveUserRole(supabase, userId);

  if (!canAccess(role, "services")) {
    throw new Error("Bạn không có quyền truy cập Dịch vụ");
  }

  return { employee, role };
}

export async function withServicesAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireServicesAccess(supabase, userId);
    return action(supabase, userId);
  });
}

/**
 * Gatekeeper for Inventory server actions.
 * Inventory uses the admin client after authentication, so every action must
 * enforce module permission explicitly instead of relying on route guards.
 */
export async function requireInventoryAccess(supabase: SupabaseClient, userId: string) {
  const { employee, role } = await resolveActiveUserRole(supabase, userId);

  if (!canAccess(role, "inventory")) {
    throw new Error("Bạn không có quyền truy cập Kho vật tư");
  }

  return { employee, role };
}

export async function withInventoryAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireInventoryAccess(supabase, userId);
    return action(supabase, userId);
  });
}

/**
 * Gatekeeper for Dresses server actions.
 * Dresses actions use the admin client after authentication, so every action
 * must enforce module permission explicitly instead of relying on route guards.
 */
export async function requireDressesAccess(supabase: SupabaseClient, userId: string) {
  const { employee, role } = await resolveActiveUserRole(supabase, userId);

  if (!canAccess(role, "dresses")) {
    throw new Error("Bạn không có quyền truy cập Trang phục");
  }

  return { employee, role };
}

export async function requireDressesBookingAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const context = await requireDressesAccess(supabase, userId);

  if (
    context.role !== "admin" &&
    context.role !== "manager" &&
    context.role !== "sale"
  ) {
    throw new Error("Bạn không có quyền quản lý lịch thuê trang phục");
  }

  return context;
}

export async function requireDressesCatalogWriteAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const context = await requireDressesAccess(supabase, userId);

  if (context.role !== "admin" && context.role !== "manager") {
    throw new Error("Bạn không có quyền quản lý danh mục trang phục");
  }

  return context;
}

export async function withDressesAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireDressesAccess(supabase, userId);
    return action(supabase, userId);
  });
}

export async function withDressesBookingAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireDressesBookingAccess(supabase, userId);
    return action(supabase, userId);
  });
}

export async function withDressesCatalogWriteAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireDressesCatalogWriteAccess(supabase, userId);
    return action(supabase, userId);
  });
}

export async function requireEmployeesAccess(supabase: SupabaseClient, userId: string) {
  const { employee, role } = await resolveActiveUserRole(supabase, userId);

  if (!canAccess(role, "employees")) {
    throw new Error("Bạn không có quyền truy cập Nhân viên");
  }

  return { employee, role };
}

export async function requireEmployeesWriteAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const context = await requireEmployeesAccess(supabase, userId);

  if (context.role !== "admin" && context.role !== "manager") {
    throw new Error("Bạn không có quyền quản lý nhân viên");
  }

  return context;
}

export async function requireEmployeeDirectoryAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const context = await resolveActiveUserRole(supabase, userId);

  if (context.role === "viewer") {
    throw new Error("Bạn không có quyền xem danh sách nhân sự");
  }

  return context;
}

export async function withEmployeesAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireEmployeesAccess(supabase, userId);
    return action(supabase, userId);
  });
}

export async function withEmployeesWriteAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireEmployeesWriteAccess(supabase, userId);
    return action(supabase, userId);
  });
}

export async function withEmployeeDirectoryAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireEmployeeDirectoryAccess(supabase, userId);
    return action(supabase, userId);
  });
}

/**
 * Gatekeeper for Contract server actions.
 * Contract actions use the admin client after authentication, so they must
 * enforce module permission explicitly instead of relying on RLS.
 */
export async function requireContractAccess(supabase: SupabaseClient, userId: string) {
  const { employee, role } = await resolveActiveUserRole(supabase, userId);

  if (!canAccess(role, "contracts")) {
    throw new Error("Bạn không có quyền truy cập Hợp đồng");
  }

  return { employee, role };
}

export async function requireContractWriteAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const context = await requireContractAccess(supabase, userId);

  if (
    context.role !== "admin" &&
    context.role !== "manager" &&
    context.role !== "sale"
  ) {
    throw new Error("Ban khong co quyen ghi du lieu hop dong");
  }

  return context;
}

export async function requireContractDestructiveAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const context = await requireContractAccess(supabase, userId);

  if (context.role !== "admin" && context.role !== "manager") {
    throw new Error("Ban khong co quyen thuc hien thao tac vong doi hop dong");
  }

  return context;
}

export async function withContractAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);
    return action(supabase, userId);
  });
}

export async function withContractWriteAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);
    return action(supabase, userId);
  });
}

export async function withContractDestructiveAccess<T>(
  action: (supabase: SupabaseClient, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  return withAuth(async (supabase, userId) => {
    await requireContractDestructiveAccess(supabase, userId);
    return action(supabase, userId);
  });
}

/**
 * Gatekeeper for recording contract payments.
 * Sales can collect contract payments from the contract detail workflow, while
 * media/viewer roles must not be able to create finance-impacting receipts.
 */
export async function requirePaymentRecordAccess(supabase: SupabaseClient, userId: string) {
  const { employee, role } = await resolveActiveUserRole(supabase, userId);

  if (role !== "admin" && role !== "manager" && role !== "sale") {
    throw new Error("Bạn không có quyền ghi nhận thanh toán hợp đồng");
  }

  return { employee, role };
}
