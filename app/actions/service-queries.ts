"use server";

import { profileAction } from "@/lib/action-profiler";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { withServicesAccess } from "@/lib/auth_utils";
import { sanitizeSearch } from "@/lib/utils/service-utils";
import {
  serviceFiltersSchema,
  serviceIdSchema,
} from "@/lib/validations/service.schema";
import type {
  ServiceCategory,
  ServiceFilters,
  ServiceRecord,
} from "@/types/service";

const DEFAULT_LIMIT = 50;

export async function getServices(filters: ServiceFilters = {}) {
  return profileAction("services.getServices", () =>
    withServicesAccess(async (supabase: SupabaseClient<Database>) => {
      const parsed = serviceFiltersSchema.safeParse(filters);
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message || "Bo loc khong hop le");
      }

      const {
        search,
        category,
        status,
        fulfillment_type,
        page = 1,
        limit = DEFAULT_LIMIT,
      } = parsed.data;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from("services")
        .select("*, category:service_categories(id, name, icon)", { count: "exact" })
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search) {
        const sanitized = sanitizeSearch(search);
        if (sanitized) {
          query = query.or(`name.ilike.%${sanitized}%,service_code.ilike.%${sanitized}%`);
        }
      }

      if (category) query = query.eq("category_id", category);
      if (status) query = query.eq("status", status);
      if (fulfillment_type) query = query.eq("fulfillment_type", fulfillment_type);

      const { data, error, count } = await query;
      if (error) throw new Error(`Loi tai danh sach dich vu: ${error.message}`);

      return {
        items: (data || []) as ServiceRecord[],
        total: count || 0,
        page,
        limit,
      };
    }),
  );
}

export async function getServiceById(id: string) {
  return profileAction("services.getServiceById", () =>
    withServicesAccess(async (supabase: SupabaseClient<Database>) => {
      const serviceId = serviceIdSchema.parse(id);
      const { data, error } = await supabase
        .from("services")
        .select("*, category:service_categories(id, name, icon)")
        .eq("id", serviceId)
        .is("deleted_at", null)
        .single();

      if (error) throw new Error(`Loi tai dich vu: ${error.message}`);
      return data as ServiceRecord;
    }),
  );
}

export async function getServiceCategories() {
  return profileAction("services.getServiceCategories", () =>
    withServicesAccess(async (supabase: SupabaseClient<Database>) => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name");

      if (error) throw new Error(`Loi tai danh muc: ${error.message}`);
      return (data || []) as ServiceCategory[];
    }),
  );
}

export async function getBundleItems(parentServiceId: string) {
  return withServicesAccess(async (supabase: SupabaseClient<Database>) => {
    const serviceId = serviceIdSchema.parse(parentServiceId);
    const { data, error } = await supabase
      .from("service_bundles")
      .select(
        "*, child_service:services!child_service_id(id, name, selling_price, category_id, unit, service_code, image_url)",
      )
      .eq("parent_service_id", serviceId)
      .order("sort_order");

    if (error) throw new Error(`Loi tai bundle: ${error.message}`);
    return data || [];
  });
}

export async function searchServicesForBundle(query: string, excludeId?: string) {
  return withServicesAccess(async (supabase: SupabaseClient<Database>) => {
    const sanitized = sanitizeSearch(String(query || "").slice(0, 100));
    if (!sanitized) return [];

    const excludedServiceId = excludeId ? serviceIdSchema.parse(excludeId) : null;
    let q = supabase
      .from("services")
      .select("id, name, service_code, selling_price, unit, category_id, image_url")
      .is("deleted_at", null)
      .eq("status", "active")
      .eq("fulfillment_type", "single")
      .ilike("name", `%${sanitized}%`)
      .limit(20);

    if (excludedServiceId) q = q.neq("id", excludedServiceId);

    const { data, error } = await q;
    if (error) throw new Error(`Loi tim dich vu: ${error.message}`);
    return data || [];
  });
}

// NOTE: calculateServiceStats moved to @/lib/utils/service-utils.ts
// (sync function cannot be in a "use server" file)
