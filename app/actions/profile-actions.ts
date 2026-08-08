"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { fireAuditLog } from "@/lib/audit";
import { withAuth, withAdmin, syncAuthIdentity } from "@/lib/auth_utils";
import {
  profileSchema,
  adminProfileSchema,
} from "@/lib/validations/settings.schema";
import { normalizeEmployeeRole } from "@/types/roles";

export async function initializeProfile() {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { data: existing, error: existingError } = await supabase
      .from("employees")
      .select("id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Lỗi tải hồ sơ nhân viên: ${existingError.message}`);
    }

    if (existing) return { initialized: false };

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.admin.getUserById(userId);

    if (authError || !authUser) {
      throw new Error(
        `Lỗi tải tài khoản đăng nhập: ${
          authError?.message || "Không xác định"
        }`,
      );
    }

    const email = authUser.email || "unknown";
    const fullName =
      typeof authUser.user_metadata?.full_name === "string" &&
      authUser.user_metadata.full_name.trim()
        ? authUser.user_metadata.full_name.trim()
        : email.split("@")[0] || "Nhân viên mới";
    const role = normalizeEmployeeRole(
      (authUser.app_metadata?.role as string | undefined) ??
        (authUser.user_metadata?.role as string | undefined),
    );

    const { data: emailMatch, error: emailMatchError } = await supabase
      .from("employees")
      .select("id, full_name, role")
      .eq("email", email)
      .is("auth_user_id", null)
      .maybeSingle();

    if (emailMatchError) {
      throw new Error(`Lỗi tìm hồ sơ theo email: ${emailMatchError.message}`);
    }

    if (emailMatch) {
      const { error: linkError } = await supabase
        .from("employees")
        .update({
          auth_user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", emailMatch.id);

      if (linkError) {
        throw new Error(`Lỗi liên kết hồ sơ: ${linkError.message}`);
      }

      await syncAuthIdentity(supabase, userId, {
        fullName: emailMatch.full_name || fullName,
        role: emailMatch.role || role,
      });

      revalidatePath("/settings");
      return { initialized: true };
    }

    const { data: newEmployee, error } = await supabase
      .from("employees")
      .insert({
        full_name: fullName,
        email,
        auth_user_id: userId,
        role,
        employee_code: `NV-${Date.now().toString(36).toUpperCase()}`,
        department: "Chưa phân",
        position: "Nhân viên",
        status: "active",
        start_date: new Date().toISOString().split("T")[0],
      })
      .select("id")
      .single();

    if (error) throw new Error(`Lỗi tạo hồ sơ: ${error.message}`);

    await syncAuthIdentity(supabase, userId, {
      fullName,
      role,
    });

    fireAuditLog({
      action: "CREATE",
      tableName: "employees",
      recordId: newEmployee?.id,
      description: `Khởi tạo hồ sơ cho ${email}`,
      source: "server_action",
    });

    revalidatePath("/settings");
    return { initialized: true };
  });
}

export async function updateProfile(rawData: {
  full_name: string;
  phone?: string;
  gender?: string;
}) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const parsed = profileSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { full_name, phone, gender } = parsed.data;

    const updateData: Database["public"]["Tables"]["employees"]["Update"] = { full_name };
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (gender !== undefined) updateData.gender = (gender?.trim() || null) as Database["public"]["Enums"]["gender_enum"] | null;

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id")
      .eq("auth_user_id", userId)
      .single();

    if (employeeError || !employee) {
      throw new Error("Không tìm thấy hồ sơ nhân viên");
    }

    const { error } = await supabase
      .from("employees")
      .update(updateData)
      .eq("id", employee.id);

    if (error) throw new Error(`Lỗi cập nhật hồ sơ: ${error.message}`);

    await syncAuthIdentity(supabase, userId, {
      fullName: full_name,
    });

    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: employee.id,
      description: `Cập nhật hồ sơ: ${full_name}`,
      newData: updateData,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}

export async function uploadAvatar(formData: FormData) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const file = formData.get("avatar") as File;
    if (!file || file.size === 0) throw new Error("Chưa chọn ảnh");
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("Ảnh không được vượt quá 2MB");
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      throw new Error("Chỉ chấp nhận JPG, PNG, WEBP");
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, avatar_url")
      .eq("auth_user_id", userId)
      .single();

    if (employeeError || !employee) throw new Error("Không tìm thấy hồ sơ");

    if (employee.avatar_url) {
      const oldPath = employee.avatar_url.split("/avatars/")[1]?.split("?")[0];
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${employee.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) throw new Error(`Lỗi tải ảnh: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("employees")
      .update({ avatar_url: publicUrl })
      .eq("id", employee.id);

    if (updateError) {
      throw new Error(`Lỗi cập nhật avatar: ${updateError.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: employee.id,
      description: "Cập nhật avatar",
      source: "server_action",
    });

    revalidatePath("/settings");
    return { url: publicUrl };
  });
}

export async function updateAdminProfileFields(rawData: {
  employee_id: string;
  department?: string;
  position?: string;
}) {
  return withAdmin(async (adminClient) => {
    const parsed = adminProfileSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { employee_id, department, position } = parsed.data;

    const updateData: Database["public"]["Tables"]["employees"]["Update"] = {};
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (position !== undefined) updateData.position = position?.trim() || null;

    if (Object.keys(updateData).length === 0) return null;

    const { error } = await adminClient
      .from("employees")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", employee_id);

    if (error) {
      throw new Error(`Lỗi cập nhật phòng ban/chức vụ: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: employee_id,
      description: "Cập nhật phòng ban/chức vụ",
      newData: updateData,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}
