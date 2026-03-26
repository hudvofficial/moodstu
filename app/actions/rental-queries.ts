"use server";

import { withAuth } from "@/lib/auth_utils";
import type { DressRental } from "@/types/dress";

// Re-export type for backward compat
export type { DressRental } from "@/types/dress";

// ═══════════════════════════════════════════
// Rental Queries — Fetch rentals data
// DB: dress_rentals + inventory_items (join)
// Pattern: withAuth + service_role (bypass RLS)
// ═══════════════════════════════════════════

// ─── FETCH RENTALS BY ITEM ───────────────────────────────────
// Dùng cho DressDrawer: hiển thị lịch sử thuê của 1 váy

export async function fetchRentalsByItem(itemId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("dress_rentals")
      .select("*")
      .eq("item_id", itemId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as DressRental[];
  });
}

// ─── FETCH ALL RENTALS ───────────────────────────────────────
// Dùng cho trang /dresses/rentals: danh sách toàn bộ đơn thuê

export async function fetchAllRentals(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  return withAuth(async (supabase) => {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("dress_rentals")
      .select("*, inventory_items!inner(name, item_code, image_url)", { count: "exact" });

    if (filters?.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters?.search) {
      query = query.or(`customer_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    // Flatten joined data
    const rentals: DressRental[] = (data || []).map((r: Record<string, unknown>) => {
      const item = r.inventory_items as Record<string, unknown> | null;
      return {
        ...r,
        item_name: item?.name as string || "",
        item_code: item?.item_code as string || "",
        item_image: item?.image_url as string || null,
        inventory_items: undefined,
      } as unknown as DressRental;
    });

    return { rentals, total: count || 0, page, pageSize };
  });
}

// ─── FETCH ACTIVE RENTAL ─────────────────────────────────────
// Check đơn thuê đang active cho 1 váy (reserved/renting)

export async function fetchActiveRental(itemId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("dress_rentals")
      .select("*")
      .eq("item_id", itemId)
      .in("status", ["reserved", "renting"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as DressRental | null;
  });
}
