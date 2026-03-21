"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Profile Actions — Init + Update + Avatar
// V1 ref: profile.ts (195 lines, 3 fn)
// V2: withAuth for all (V1 used raw createClient)
// ═══════════════════════════════════════════

export async function initializeProfile() {
  return withAuth(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Chưa đăng nhập");

    const { data: existing } = await supabase.from("employees").select("id").eq("email", user.email).single();
    if (existing) return { initialized: false };

    const { error } = await supabase.from("employees").insert({
      full_name: user.user_metadata.full_name || user.email?.split("@")[0] || "Nhân viên mới",
      email: user.email, role: "User",
      employee_code: "NV-" + Date.now().toString(36).toUpperCase(),
      department: "Chưa phân", position: "Nhân viên", status: "Đang làm",
      start_date: new Date().toISOString(), base_salary: 0, employee_type: "Nhân viên",
    });
    if (error) throw new Error(`Lỗi tạo hồ sơ: ${error.message}`);

    revalidatePath("/", "layout");
    return { initialized: true };
  });
}

export async function updateProfile(data: {
  full_name: string; department?: string; phone?: string; gender?: string;
  position?: string; bank_name?: string; bank_account_no?: string; bank_account_name?: string;
}) {
  return withAuth(async (supabase) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) throw new Error("Chưa đăng nhập");

    const name = data.full_name?.trim();
    if (!name) throw new Error("Tên không được để trống");

    const updateData: Record<string, string | null> = { full_name: name };
    if (data.department !== undefined) updateData.department = data.department.trim() || null;
    if (data.phone !== undefined) updateData.phone = data.phone.trim() || null;
    if (data.gender !== undefined) updateData.gender = data.gender.trim() || null;
    if (data.position !== undefined) updateData.position = data.position.trim() || null;
    if (data.bank_name !== undefined) updateData.bank_name = data.bank_name.trim() || null;
    if (data.bank_account_no !== undefined) updateData.bank_account_no = data.bank_account_no.trim() || null;
    if (data.bank_account_name !== undefined) updateData.bank_account_name = data.bank_account_name.trim() || null;

    const { error } = await supabase.from("employees").update(updateData).eq("email", user.email);
    if (error) throw new Error(`Lỗi cập nhật hồ sơ: ${error.message}`);

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

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { url: publicUrl };
  });
}
