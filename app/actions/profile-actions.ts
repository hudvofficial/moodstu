"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { profileSchema } from "@/lib/validations/settings.schema";

// ═══════════════════════════════════════════
// Profile Actions — Init + Update + Avatar
// V2 Gold Standard: withAuth + Zod + Audit
// @see docs/specs/settings.md §3.4
// ═══════════════════════════════════════════

export async function initializeProfile() {
  return withAuth(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Chưa đăng nhập");

    const { data: existing } = await supabase.from("employees").select("id").eq("email", user.email).single();
    if (existing) return { initialized: false };

    const { data: newEmp, error } = await supabase.from("employees").insert({
      full_name: user.user_metadata.full_name || user.email?.split("@")[0] || "Nhân viên mới",
      email: user.email, role: "User",
      employee_code: "NV-" + Date.now().toString(36).toUpperCase(),
      department: "Chưa phân", position: "Nhân viên", status: "Đang làm",
      start_date: new Date().toISOString(), base_salary: 0, employee_type: "Nhân viên",
    }).select("id").single();
    if (error) throw new Error(`Lỗi tạo hồ sơ: ${error.message}`);

    // Audit: profile initialization
    fireAuditLog({
      action: "CREATE",
      tableName: "employees",
      recordId: newEmp?.id,
      description: `Khởi tạo hồ sơ cho ${user.email}`,
      source: "server_action",
    });

    revalidatePath("/", "layout");
    return { initialized: true };
  });
}

export async function updateProfile(rawData: {
  full_name: string; department?: string; phone?: string; gender?: string;
  position?: string; bank_name?: string; bank_account_no?: string; bank_account_name?: string;
}) {
  return withAuth(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Chưa đăng nhập");

    // ── Zod validation ──
    const parsed = profileSchema.safeParse(rawData);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ";
      throw new Error(firstError);
    }

    const { full_name, phone, gender, bank_name, bank_account_no, bank_account_name } = parsed.data;

    const updateData: Record<string, string | null> = { full_name };
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (gender !== undefined) updateData.gender = gender?.trim() || null;
    if (bank_name !== undefined) updateData.bank_name = bank_name?.trim() || null;
    if (bank_account_no !== undefined) updateData.bank_account_no = bank_account_no?.trim() || null;
    if (bank_account_name !== undefined) updateData.bank_account_name = bank_account_name?.trim() || null;

    // Allow department/position only from validated data pass-through (not in Zod — admin-only fields)
    if (rawData.department !== undefined) updateData.department = rawData.department.trim() || null;
    if (rawData.position !== undefined) updateData.position = rawData.position.trim() || null;

    const { error } = await supabase.from("employees").update(updateData).eq("email", user.email);
    if (error) throw new Error(`Lỗi cập nhật hồ sơ: ${error.message}`);

    // Audit: profile update
    fireAuditLog({
      action: "UPDATE",
      tableName: "employees",
      description: `Cập nhật hồ sơ: ${full_name}`,
      newData: updateData,
      source: "server_action",
    });

    revalidatePath("/settings");
    return null;
  });
}

export async function uploadAvatar(formData: FormData) {
  return withAuth(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Chưa đăng nhập");

    const file = formData.get("avatar") as File;
    if (!file || file.size === 0) throw new Error("Chưa chọn ảnh");
    if (file.size > 2 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 2MB");
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) throw new Error("Chỉ chấp nhận JPG, PNG, WEBP");

    const { data: emp } = await supabase.from("employees").select("id, avatar_url").eq("email", user.email).single();
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
    revalidatePath("/", "layout");
    return { url: publicUrl };
  });
}
