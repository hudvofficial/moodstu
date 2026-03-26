"use server";

import { withAuth } from "@/lib/auth_utils";
import type { DressItem, DressFilters, DressStats, DressDetail, RentalHistoryRow, RentalHistoryFilters } from "@/types/dress";
import { DRESS_PAGE_SIZE, RENTAL_HISTORY_PAGE_SIZE } from "@/types/dress-constants";
import { DRESS_CATEGORIES } from "@/lib/validations/dress.schema";

// ═══════════════════════════════════════════
// Dress Queries — Read-only server actions
// DB: inventory_items (filter category for dresses)
// Pattern: withAuth + return empty on error
// ═══════════════════════════════════════════

const DRESS_SELECT = `
  id, item_code, name, category, size, color, condition,
  rental_price, sale_price, purchase_price,
  current_stock, min_stock, image_url, status, notes,
  created_at, updated_at, created_by, updated_by, deleted_at
`;

// ─── FETCH LIST (paginated + filtered) ───────────────────────

export async function fetchDressList(
  filters: DressFilters = {}
): Promise<{ data: DressItem[]; count: number }> {
  return withAuth(async (supabase) => {
    const page = filters.page || 1;
    const from = (page - 1) * DRESS_PAGE_SIZE;
    const to = from + DRESS_PAGE_SIZE - 1;

    let query = supabase
      .from("inventory_items")
      .select(DRESS_SELECT, { count: "exact" })
      .in("category", DRESS_CATEGORIES)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Status filter
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    // Category filter
    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    // Search (name or code)
    if (filters.search?.trim()) {
      const s = filters.search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.or(`name.ilike.%${s}%,item_code.ilike.%${s}%`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error("[fetchDressList]", error);
      return { data: [], count: 0 };
    }
    return { data: (data as DressItem[]) || [], count: count || 0 };
  }).then((result) => {
    if (result.success) return result.data;
    console.error("[fetchDressList] auth error:", result.error);
    return { data: [], count: 0 };
  });
}

// ─── FETCH DETAIL (single item + reservations) ───────────────

export async function fetchDressDetail(id: string): Promise<DressDetail | null> {
  return withAuth(async (supabase) => {
    // Parallel: item + reservations
    const [itemRes, reservationsRes] = await Promise.all([
      supabase.from("inventory_items").select(DRESS_SELECT).eq("id", id).is("deleted_at", null).single(),
      supabase
        .from("inventory_reservations")
        .select(`id, inventory_item_id, contract_id, status, start_date, end_date, notes, created_at, contracts(id, contract_code, customers(full_name))`)
        .eq("inventory_item_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (itemRes.error || !itemRes.data) return null;

    return {
      ...(itemRes.data as DressItem),
      reservations: (reservationsRes.data || []) as unknown as DressDetail["reservations"],
    };
  }).then((result) => {
    if (result.success) return result.data;
    return null;
  });
}

// ─── STATS ───────────────────────────────────────────────────

export async function getDressStats(): Promise<DressStats> {
  return withAuth(async (supabase) => {
    const { data } = await supabase
      .from("inventory_items")
      .select("status")
      .in("category", DRESS_CATEGORIES)
      .is("deleted_at", null);

    const items = data || [];
    return {
      total: items.length,
      available: items.filter((i) => i.status === "available").length,
      reserved: items.filter((i) => i.status === "reserved").length,
      rented: items.filter((i) => i.status === "rented").length,
      maintenance: items.filter((i) => i.status === "maintenance").length,
    };
  }).then((result) => {
    if (result.success) return result.data;
    return { total: 0, available: 0, reserved: 0, rented: 0, maintenance: 0 };
  });
}

// ─── AVAILABILITY CHECK ──────────────────────────────────────

export async function getDressAvailability(
  itemId: string,
  startDate: string,
  endDate: string
): Promise<boolean> {
  return withAuth(async (supabase) => {
    // Check for overlapping reservations
    const { data, error } = await supabase
      .from("inventory_reservations")
      .select("id")
      .eq("inventory_item_id", itemId)
      .in("status", ["reserved", "rented"])
      .lte("start_date", endDate)
      .gte("end_date", startDate);

    if (error) {
      console.error("[getDressAvailability]", error);
      return false;
    }
    return (data?.length || 0) === 0;
  }).then((result) => {
    if (result.success) return result.data;
    return false;
  });
}

// ─── RENTAL HISTORY (paginated, full page) ───────────────────

export async function fetchRentalHistory(
  filters: RentalHistoryFilters = {}
): Promise<{ data: RentalHistoryRow[]; count: number }> {
  return withAuth(async (supabase) => {
    const page = filters.page || 1;
    const from = (page - 1) * RENTAL_HISTORY_PAGE_SIZE;
    const to = from + RENTAL_HISTORY_PAGE_SIZE - 1;

    let query = supabase
      .from("inventory_reservations")
      .select(
        `id, item_id, contract_id, status, rental_price, start_date, end_date, notes, created_at,
         contracts(id, contract_code, customers(full_name)),
         inventory_items!inner(id, name, item_code, category)`,
        { count: "exact" }
      )
      .in("inventory_items.category", DRESS_CATEGORIES)
      .order("created_at", { ascending: false });

    // Filter by specific dress
    if (filters.item_id) {
      query = query.eq("item_id", filters.item_id);
    }

    // Status filter
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error("[fetchRentalHistory]", error);
      return { data: [], count: 0 };
    }
    return { data: (data as unknown as RentalHistoryRow[]) || [], count: count || 0 };
  }).then((result) => {
    if (result.success) return result.data;
    console.error("[fetchRentalHistory] auth error:", result.error);
    return { data: [], count: 0 };
  });
}
