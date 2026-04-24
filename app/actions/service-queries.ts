"use server";

import { withAuth } from "@/lib/auth_utils";
import { profileAction } from "@/lib/action-profiler";
import { sanitizeSearch } from "@/lib/utils/service-utils";
import type { ServiceRecord, ServiceCategory, ServiceFilters } from "@/types/service";

// ═══════════════════════════════════════════
// Service Queries — V2 Gold Standard
// READ-only server actions for Services module
//
// Pattern: withAuth → admin client (bypass RLS)
// @see Lesson #59: withAuth pattern is SSOT
// @see Lesson #77: V2 = V1 + optimized
// ═══════════════════════════════════════════

const DEFAULT_LIMIT = 50;

// ─── getServices (paginated, filtered) ───────────

export async function getServices(filters: ServiceFilters = {}) {
  return profileAction("services.getServices", () => withAuth(async (supabase) => {
    const { search, category, status, fulfillment_type, page = 1, limit = DEFAULT_LIMIT } = filters;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("services")
      .select("*, category:service_categories(id, name, icon)", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply filters
    if (search) {
      const sanitized = sanitizeSearch(search);
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,service_code.ilike.%${sanitized}%`);
      }
    }

    if (category) {
      query = query.eq("category_id", category);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (fulfillment_type) {
      query = query.eq("fulfillment_type", fulfillment_type);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Lỗi tải danh sách dịch vụ: ${error.message}`);

    return {
      items: (data || []) as ServiceRecord[],
      total: count || 0,
      page,
      limit,
    };
  }));
}

// ─── getServiceById ──────────────────────────────

export async function getServiceById(id: string) {
  return profileAction("services.getServiceById", () => withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("services")
      .select("*, category:service_categories(id, name, icon)")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw new Error(`Lỗi tải dịch vụ: ${error.message}`);
    return data as ServiceRecord;
  }));
}

// ─── getServiceCategories ────────────────────────

export async function getServiceCategories() {
  return profileAction("services.getServiceCategories", () => withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name");

    if (error) throw new Error(`Lỗi tải danh mục: ${error.message}`);
    return (data || []) as ServiceCategory[];
  }));
}

// ─── getBundleItems ──────────────────────────────

export async function getBundleItems(parentServiceId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("service_bundles")
      .select("*, child_service:services!child_service_id(id, name, selling_price, category_id, unit, service_code, image_url)")
      .eq("parent_service_id", parentServiceId)
      .order("sort_order");

    if (error) throw new Error(`Lỗi tải bundle: ${error.message}`);
    return data || [];
  });
}

// ─── searchServicesForBundle ─────────────────────
// Lightweight search for bundle picker (max 20 results)

export async function searchServicesForBundle(query: string, excludeId?: string) {
  return withAuth(async (supabase) => {
    const sanitized = sanitizeSearch(query);
    if (!sanitized) return [];

    let q = supabase
      .from("services")
      .select("id, name, selling_price, unit, service_type")
      .is("deleted_at", null)
      .eq("status", "active")
      .eq("fulfillment_type", "single") // Bundles can't contain bundles
      .ilike("name", `%${sanitized}%`)
      .limit(20);

    if (excludeId) {
      q = q.neq("id", excludeId);
    }

    const { data, error } = await q;
    if (error) throw new Error(`Lỗi tìm dịch vụ: ${error.message}`);
    return data || [];
  });
}

// NOTE: calculateServiceStats moved to @/lib/utils/service-utils.ts
// (sync function can't be in "use server" file)
