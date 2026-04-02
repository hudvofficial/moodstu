"use server";

import { withAuth, withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { profileSchema, adminProfileSchema } from "@/lib/validations/settings.schema";

// ═══════════════════════════════════════════
// Profile Actions — Init + Update + Avatar
// V2 Gold Standard: withAuth + Zod + Audit
// @see docs/specs/settings.md §3.4
// ═══════════════════════════════════════════

export async function initializeProfile() {
  return withAuth(async (supabase, userId) => {
    // [GS-FIX] Dùng userId param, KHÔNG gọi getUser() trên admin client
    const { data: existing } = await supabase.from("employees").select("id").eq("auth_user_id", userId).single();
    if (existing) return { initialized: false };

    // Lấy email từ auth.users bằng admin client (service role)
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.email || "unknown";
    const fullName = authUser?.user_metadata?.full_name || email.split("@")[0] || "Nhân viên mới";

    const { data: newEmp, error } = await supabase.from("employees").insert({
      full_name: fullName,
      email: email,
      auth_user_id: userId,  // [GS-FIX] Liên kết auth user
      role: "User",
      employee_code: "NV-" + Date.now().toString(36).toUpperCase(),
      department: "Chưa phân", position: "Nhân viên", status: "active",
      start_date: new Date().toISOString().split("T")[0],
    }).select("id").single();
    if (error) throw new Error(`Lỗi tạo hồ sơ: ${error.message}`);

    // Audit: profile initialization
    fireAuditLog({
      action: "CREATE",
      tableName: "employees",
      recordId: newEmp?.id,
      description: `Khởi tạo hồ sơ cho ${email}`,
      source: "server_action",
    });

    revalidatePath("/settings");
    return { initialized: true };
  });
}

export async function updateProfile(rawData: {
  full_name: string; phone?: string; gender?: string;
}) {
  return withAuth(async (supabase, userId) => {
    // [GS-FIX] Dùng userId param, KHÔNG gọi getUser()

    // ── Zod validation ──
    const parsed = profileSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { full_name, phone, gender } = parsed.data;

    const updateData: Record<string, string | null> = { full_name };
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (gender !== undefined) updateData.gender = gender?.trim() || null;

    // [GS-FIX] Lookup bằng auth_user_id
    const { data: emp } = await supabase.from("employees").select("id").eq("auth_user_id", userId).single();
    if (!emp) throw new Error("Không tìm thấy hồ sơ nhân viên");

    const { error } = await supabase.from("employees").update(updateData).eq("id", emp.id);
    if (error) throw new Error(`Lỗi cập nhật hồ sơ: ${error.message}`);

    // Audit: profile update [GS-FIX] có recordId
    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: emp.id,
      description: `Cập nhật hồ sơ: ${full_name}`,
      newData: updateData,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}

export async function uploadAvatar(formData: FormData) {
  return withAuth(async (supabase, userId) => {
    // [GS-FIX] Dùng userId param, KHÔNG gọi getUser()

    const file = formData.get("avatar") as File;
    if (!file || file.size === 0) throw new Error("Chưa chọn ảnh");
    if (file.size > 2 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 2MB");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) throw new Error("Chỉ chấp nhận JPG, PNG, WEBP");

    // [GS-FIX] Lookup bằng auth_user_id
    const { data: emp } = await supabase.from("employees").select("id, avatar_url").eq("auth_user_id", userId).single();
    if (!emp) throw new Error("Không tìm thấy hồ sơ");

    // Delete old avatar
    if (emp.avatar_url) {
      const oldPath = emp.avatar_url.split("/avatars/")[1]?.split("?")[0];
      if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
    }

    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${emp.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true, contentType: file.type });
    if (uploadError) throw new Error(`Lỗi upload: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

    const { error: updateError } = await supabase.from("employees").update({ avatar_url: publicUrl }).eq("id", emp.id);
    if (updateError) throw new Error(`Lỗi cập nhật avatar: ${updateError.message}`);

    // Audit: avatar update
    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: emp.id,
      description: "Cập nhật avatar",
      source: "server_action",
    });

    revalidatePath("/settings");
    return { url: publicUrl };
  });
}

// ─── UPDATE ADMIN PROFILE FIELDS ──────────

/** Update department + position (admin only) */
export async function updateAdminProfileFields(rawData: {
  employee_id: string;
  department?: string;
  position?: string;
}) {
  return withAdmin(async (adminClient) => {
    // ── Zod validation ──
    const parsed = adminProfileSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { employee_id, department, position } = parsed.data;

    const updateData: Record<string, string | null> = {};
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (position !== undefined) updateData.position = position?.trim() || null;

    // Skip if nothing to update
    if (Object.keys(updateData).length === 0) return null;

    const { error } = await adminClient
      .from("employees")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", employee_id);

    if (error) throw new Error(`Lỗi cập nhật phòng ban/chức vụ: ${error.message}`);

    // Audit: admin profile fields update
    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      recordId: employee_id,
      description: `Admin cập nhật phòng ban/chức vụ`,
      newData: updateData,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}
