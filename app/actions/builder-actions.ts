"use server";

import { withAuth } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import { cache } from "react";

// ═══════════════════════════════════════════
// Builder Actions — Service Relations + Price Rules
// V1 ref: builder.ts (142 lines, 4 fn)
// V2: withAuth + fireAuditLog + cached reads
// ═══════════════════════════════════════════

// ─── CACHED READS ─────────────────────────────

export const getServiceRelations = cache(async (serviceId: string) => {
  if (!serviceId) return [];
  const result = await withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("service_relations")
      .select("*, child_service:services!child_service_id(id, service_code, service_name, selling_price, image_url, unit, category_id), child_category:service_categories!child_category_id(id, name, slug, icon)")
      .eq("parent_service_id", serviceId);
    if (error) return [];
    return data || [];
  });
  return result.success ? result.data : [];
});

export const getPriceRules = cache(async () => {
  const result = await withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("price_rules")
      .select("id, name, description, conditions, actions, priority, is_active")
      .eq("is_active", true)
      .order("priority", { ascending: false });
    if (error) return [];
    return data || [];
  });
  return result.success ? result.data : [];
});

// ─── MUTATIONS ────────────────────────────────

export async function upsertRelation(relation: { id?: string; parent_service_id?: string; child_service_id?: string; child_category_id?: string; relation_type?: string; is_required?: boolean; sort_order?: number }) {
  return withAuth(async (supabase) => {
    if (!relation.parent_service_id) throw new Error("Thiếu parent_service_id");
    if (!relation.child_service_id && !relation.child_category_id) throw new Error("Cần ít nhất child_service_id hoặc child_category_id");

    const { data, error } = relation.id
      ? await supabase.from("service_relations").update(relation).eq("id", relation.id).select("id").single()
      : await supabase.from("service_relations").insert(relation).select("id").single();
    if (error) throw new Error(`Lỗi lưu relation: ${error.message}`);

    fireAuditLog({ action: relation.id ? "UPDATE" : "CREATE", tableName: "service_relations", recordId: data?.id, description: `${relation.id ? "Cập nhật" : "Tạo"} service relation` });
    return data;
  });
}

export async function upsertPriceRule(rule: { id?: string; name?: string; description?: string; conditions?: Record<string, unknown>; actions?: Record<string, unknown>; priority?: number; is_active?: boolean }) {
  return withAuth(async (supabase) => {
    if (!rule.name) throw new Error("Tên quy tắc không được để trống");

    const { data, error } = rule.id
      ? await supabase.from("price_rules").update(rule).eq("id", rule.id).select("id").single()
      : await supabase.from("price_rules").insert(rule).select("id").single();
    if (error) throw new Error(`Lỗi lưu price rule: ${error.message}`);

    fireAuditLog({ action: rule.id ? "UPDATE" : "CREATE", tableName: "price_rules", recordId: data?.id, description: `${rule.id ? "Cập nhật" : "Tạo"} price rule: ${rule.name}` });
    return data;
  });
}
