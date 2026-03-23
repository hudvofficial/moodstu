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

// ═══════════════════════════════════════════
// Service Actions — Query + Quick Create
// Moved from contract-queries.ts → service domain (V2)
// ═══════════════════════════════════════════

// ─── getAvailableServices ────────────────────
// Fetch services for ItemModal service picker
export async function getAvailableServices(search?: string) {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("services")
      .select("id, service_name, service_type, category_id, selling_price, cost_price")
      .eq("status", "active")
      .order("service_name");

    if (search && search.trim()) {
      const sanitized = search.replace(/[%_]/g, "").trim();
      query = query.ilike("service_name", `%${sanitized}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Lỗi tải dịch vụ: ${error.message}`);
    return data || [];
  });
}

// ─── quickCreateService ──────────────────────
// Quick create service from ItemModal
export async function quickCreateService(serviceData: {
  service_name: string;
  service_type: string;
  selling_price: number;
  cost_price?: number;
}) {
  return withAuth(async (supabase) => {
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        service_name: serviceData.service_name.trim(),
        service_type: serviceData.service_type,
        selling_price: serviceData.selling_price,
        cost_price: serviceData.cost_price || 0,
        status: "active",
      })
      .select("id, service_name, selling_price, service_type")
      .single();

    if (error) throw error;
    return service;
  });
}
