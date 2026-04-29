"use server";

import { withDressesAccess } from "@/lib/auth_utils";
import type {
  DressDetail,
  DressFilters,
  DressItem,
  DressStats,
  RentalHistoryFilters,
  RentalHistoryRow,
} from "@/types/dress";
import { DRESS_PAGE_SIZE, RENTAL_HISTORY_PAGE_SIZE } from "@/types/dress-constants";

const DRESS_SELECT = `
  id, item_code, name, category, size, color, condition,
  rental_price, sale_price, purchase_price,
  current_stock, min_stock, image_url, status, notes,
  created_at, updated_at, created_by, updated_by, deleted_at
`;

const DEFAULT_STATS: DressStats = {
  total: 0,
  available: 0,
  reserved: 0,
  rented: 0,
  maintenance: 0,
};

const SORTS = new Set(["newest", "price_desc", "price_asc", "name_asc"]);

function cleanText(value: string | undefined | null, maxLength = 120) {
  const text = value?.trim();
  return text ? text.slice(0, maxLength) : undefined;
}

function pageNumber(value: number | undefined, fallback = 1) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : fallback;
}

function normalizeSort(value: DressFilters["sort"]) {
  return value && SORTS.has(value) ? value : "newest";
}

function throwActionError(action: string, error: string): never {
  throw new Error(`${action}: ${error}`);
}

function isMissingRpc(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() || "";
  return message.includes("could not find the function") || error?.code === "PGRST202";
}

export async function fetchDressList(
  filters: DressFilters = {},
): Promise<{ data: DressItem[]; count: number }> {
  const result = await withDressesAccess(async (supabase) => {
    const page = pageNumber(filters.page);
    const sort = normalizeSort(filters.sort);
    const category = filters.category && filters.category !== "all" ? filters.category : undefined;
    const status = filters.status && filters.status !== "all" ? filters.status : undefined;
    const search = cleanText(filters.search);

    const rpc = await supabase.rpc("dress_list", {
      p_search: search ?? null,
      p_category: category ?? null,
      p_status: status ?? null,
      p_sort: sort,
      p_page: page,
      p_limit: DRESS_PAGE_SIZE,
    });

    if (!rpc.error && rpc.data && typeof rpc.data === "object") {
      const payload = rpc.data as {
        items?: DressItem[];
        total?: number;
        count?: number;
      };

      return {
        data: payload.items || [],
        count: Number(payload.total ?? payload.count ?? 0),
      };
    }

    if (rpc.error && !isMissingRpc(rpc.error)) {
      throw new Error(rpc.error.message);
    }

    const from = (page - 1) * DRESS_PAGE_SIZE;
    const to = from + DRESS_PAGE_SIZE - 1;

    let query = supabase
      .from("dresses")
      .select(DRESS_SELECT, { count: "exact" })
      .is("deleted_at", null);

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    if (search) {
      const safe = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(`name.ilike.%${safe}%,item_code.ilike.%${safe}%`);
    }

    switch (sort) {
      case "price_desc":
        query = query.order("rental_price", { ascending: false }).order("created_at", { ascending: false });
        break;
      case "price_asc":
        query = query.order("rental_price", { ascending: true }).order("created_at", { ascending: false });
        break;
      case "name_asc":
        query = query.order("name", { ascending: true }).order("created_at", { ascending: false });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return { data: (data as DressItem[]) || [], count: count || 0 };
  });

  if (!result.success) throwActionError("Khong the tai danh sach trang phuc", result.error);
  return result.data;
}

export async function fetchDressDetail(id: string): Promise<DressDetail | null> {
  const result = await withDressesAccess(async (supabase) => {
    const [itemRes, reservationsRes] = await Promise.all([
      supabase
        .from("dresses")
        .select(DRESS_SELECT)
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .from("dress_reservations")
        .select(
          "id, dress_id, contract_id, status, start_date, end_date, notes, created_at, contracts(id, contract_code, customers(full_name))",
        )
        .eq("dress_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (itemRes.error) throw new Error(itemRes.error.message);
    if (!itemRes.data) return null;
    if (reservationsRes.error) throw new Error(reservationsRes.error.message);

    return {
      ...(itemRes.data as DressItem),
      reservations: (reservationsRes.data || []) as unknown as DressDetail["reservations"],
    };
  });

  if (!result.success) throwActionError("Khong the tai chi tiet trang phuc", result.error);
  return result.data;
}

export async function getDressStats(): Promise<DressStats> {
  const result = await withDressesAccess(async (supabase) => {
    const rpc = await supabase.rpc("dress_stats");

    if (!rpc.error && rpc.data && typeof rpc.data === "object") {
      const data = rpc.data as Partial<DressStats>;
      return {
        total: Number(data.total || 0),
        available: Number(data.available || 0),
        reserved: Number(data.reserved || 0),
        rented: Number(data.rented || 0),
        maintenance: Number(data.maintenance || 0),
      };
    }

    if (rpc.error && !isMissingRpc(rpc.error)) {
      throw new Error(rpc.error.message);
    }

    const { data, error } = await supabase
      .from("dresses")
      .select("status")
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    const items = data || [];
    return {
      total: items.length,
      available: items.filter((item) => item.status === "available").length,
      reserved: items.filter((item) => item.status === "reserved").length,
      rented: items.filter((item) => item.status === "rented" || item.status === "overdue").length,
      maintenance: items.filter((item) => item.status === "maintenance" || item.status === "cleaning").length,
    };
  });

  if (!result.success) throwActionError("Khong the tai thong ke trang phuc", result.error);
  return result.data ?? DEFAULT_STATS;
}

export async function getDressAvailability(
  itemId: string,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const result = await withDressesAccess(async (supabase) => {
    const rpc = await supabase.rpc("is_dress_available", {
      p_dress_id: itemId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_exclude_reservation_id: null,
      p_exclude_rental_id: null,
    });

    if (!rpc.error) return rpc.data === true;
    if (!isMissingRpc(rpc.error)) throw new Error(rpc.error.message);

    const [reservationRes, rentalRes, dressRes] = await Promise.all([
      supabase
        .from("dress_reservations")
        .select("id")
        .eq("dress_id", itemId)
        .in("status", ["reserved", "in_use", "rented"])
        .lte("start_date", endDate)
        .gte("end_date", startDate)
        .limit(1),
      supabase
        .from("dress_rentals")
        .select("id")
        .eq("item_id", itemId)
        .in("status", ["reserved", "renting", "overdue"])
        .lte("pickup_date", endDate)
        .gte("return_date", startDate)
        .limit(1),
      supabase
        .from("dresses")
        .select("status")
        .eq("id", itemId)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

    if (reservationRes.error) throw new Error(reservationRes.error.message);
    if (rentalRes.error) throw new Error(rentalRes.error.message);
    if (dressRes.error) throw new Error(dressRes.error.message);
    if (!dressRes.data || ["maintenance", "retired", "cleaning"].includes(String(dressRes.data.status))) {
      return false;
    }

    return (reservationRes.data?.length || 0) === 0 && (rentalRes.data?.length || 0) === 0;
  });

  if (!result.success) return false;
  return result.data;
}

export async function fetchRentalHistory(
  filters: RentalHistoryFilters = {},
): Promise<{ data: RentalHistoryRow[]; count: number }> {
  const result = await withDressesAccess(async (supabase) => {
    const page = pageNumber(filters.page);
    const from = (page - 1) * RENTAL_HISTORY_PAGE_SIZE;
    const to = from + RENTAL_HISTORY_PAGE_SIZE - 1;

    let query = supabase
      .from("dress_reservations")
      .select(
        `id, dress_id, contract_id, status, start_date, end_date, notes, created_at,
         contracts(id, contract_code, customers(full_name)),
         dresses!inner(id, name, item_code, category)`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (filters.item_id) query = query.eq("dress_id", filters.item_id);
    if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);

    const { data, count, error } = await query.range(from, to);
    if (error) throw new Error(error.message);

    return { data: (data as unknown as RentalHistoryRow[]) || [], count: count || 0 };
  });

  if (!result.success) throwActionError("Khong the tai lich su dat trang phuc", result.error);
  return result.data;
}

export async function getAvailableItems() {
  return withDressesAccess(async (supabase) => {
    const { data, error } = await supabase
      .from("dresses")
      .select("id, name, item_code, category, size, color, rental_price, image_url")
      .eq("status", "available")
      .is("deleted_at", null)
      .order("name");

    if (error) throw new Error(`Loi lay trang phuc: ${error.message}`);
    return data || [];
  });
}
