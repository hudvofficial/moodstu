"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";
import { fireAuditLog } from "@/lib/audit";
import { withServicesAccess } from "@/lib/auth_utils";
import {
  priceRuleSchema,
  serviceIdSchema,
  serviceRelationSchema,
} from "@/lib/validations/service.schema";

export const getServiceRelations = cache(async (serviceId: string) => {
  if (!serviceId) return [];

  const result = await withServicesAccess(async (supabase) => {
    const parentServiceId = serviceIdSchema.parse(serviceId);
    const { data, error } = await supabase
      .from("service_relations")
      .select(
        "*, child_service:services!child_service_id(id, service_code, name, selling_price, image_url, unit, category_id), child_category:service_categories!child_category_id(id, name, slug, icon)",
      )
      .eq("parent_service_id", parentServiceId)
      .order("sort_order");

    if (error) throw new Error(`Loi tai service relations: ${error.message}`);
    return data || [];
  });

  if (!result.success) throw new Error(result.error);
  return result.data || [];
});

export const getPriceRules = cache(async (includeInactive = false) => {
  const result = await withServicesAccess(async (supabase) => {
    let query = supabase
      .from("price_rules")
      .select("id, name, description, conditions, actions, priority, is_active")
      .order("priority", { ascending: false });

    if (!includeInactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw new Error(`Loi tai price rules: ${error.message}`);
    return data || [];
  });

  if (!result.success) throw new Error(result.error);
  return result.data || [];
});

export async function upsertRelation(relation: {
  id?: string;
  parent_service_id?: string;
  child_service_id?: string;
  child_category_id?: string;
  relation_type?: string;
  is_required?: boolean;
  sort_order?: number;
}) {
  return withServicesAccess(async (supabase) => {
    const parsed = serviceRelationSchema.safeParse(relation);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Relation khong hop le");
    }

    const payload = parsed.data;
    const { data, error } = payload.id
      ? await supabase.from("service_relations").update(payload).eq("id", payload.id).select("id").single()
      : await supabase.from("service_relations").insert(payload).select("id").single();

    if (error) throw new Error(`Loi luu relation: ${error.message}`);

    fireAuditLog({
      action: payload.id ? "UPDATE" : "CREATE",
      tableName: "service_relations",
      recordId: data?.id,
      description: `${payload.id ? "Cap nhat" : "Tao"} service relation`,
    });
    revalidatePath("/services");
    return data;
  });
}

export async function upsertPriceRule(rule: {
  id?: string;
  name?: string;
  description?: string;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  priority?: number;
  is_active?: boolean;
}) {
  return withServicesAccess(async (supabase) => {
    const parsed = priceRuleSchema.safeParse(rule);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Quy tac khong hop le");
    }

    const payload = parsed.data;
    const { data, error } = payload.id
      ? await supabase.from("price_rules").update(payload).eq("id", payload.id).select("id").single()
      : await supabase.from("price_rules").insert(payload).select("id").single();

    if (error) throw new Error(`Loi luu price rule: ${error.message}`);

    fireAuditLog({
      action: payload.id ? "UPDATE" : "CREATE",
      tableName: "price_rules",
      recordId: data?.id,
      description: `${payload.id ? "Cap nhat" : "Tao"} price rule: ${payload.name}`,
    });
    revalidatePath("/services");
    return data;
  });
}
