"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Category Actions — Service Categories CRUD
// V1 ref: categories.ts (54 lines)
// V2: withAuth + fireAuditLog + Vietnamese slug gen
// ═══════════════════════════════════════════

function toSlug(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function upsertCategory(data: { id?: string; name: string; icon?: string }) {
  return withAuth(async (supabase) => {
    const payload = { name: data.name, slug: toSlug(data.name), icon: data.icon };

    if (data.id) {
      const { error } = await supabase.from("service_categories").update(payload).eq("id", data.id);
      if (error) throw new Error(`Lỗi cập nhật danh mục: ${error.message}`);
    } else {
      const { error } = await supabase.from("service_categories").insert(payload);
      if (error) throw new Error(`Lỗi tạo danh mục: ${error.message}`);
    }

    fireAuditLog({ action: data.id ? "UPDATE" : "CREATE", tableName: "service_categories", description: `${data.id ? "Cập nhật" : "Tạo"} danh mục: ${data.name}` });
    revalidatePath("/services");
    return null;
  });
}

export async function deleteCategory(id: string) {
  return withAuth(async (supabase) => {
    const { count, error: checkError } = await supabase.from("services").select("*", { count: "exact", head: true }).eq("category_id", id);
    if (checkError) throw new Error(`Lỗi kiểm tra: ${checkError.message}`);
    if (count && count > 0) throw new Error(`Danh mục này đang được dùng bởi ${count} dịch vụ. Không thể xóa.`);

    const { error } = await supabase.from("service_categories").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa danh mục: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "service_categories", recordId: id, description: `Xóa danh mục #${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/services");
    return null;
  });
}
