"use server";

import { withAdmin } from "@/lib/auth_utils";
import type {
  InventoryItem,
  InventoryFilters,
  InventoryStats,
  InventoryDetail,
  InventoryTransaction,
  TransactionFilters,
} from "@/types/inventory";
import { INVENTORY_PAGE_SIZE, TRANSACTION_PAGE_SIZE } from "@/types/inventory-constants";

// ═══════════════════════════════════════════
// Inventory Queries — Read-only server actions
// DB: inventory_items, inventory_transactions
// Pattern: withAdmin + return empty on error
// ═══════════════════════════════════════════

const ITEM_SELECT = `
  id, item_code, name, category, unit,
  current_stock, min_stock, purchase_price, average_unit_price, sale_price,
  supplier, image_url, status, notes,
  created_by, updated_by, created_at, updated_at, deleted_at
`;

const validStatuses = new Set(["active", "discontinued"]);
const validCategories = new Set([
  "khung_anh",
  "album",
  "hoa",
  "tieu_hao",
  "trang_tri",
]);

function normalizePage(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.trunc(value));
}

function normalizeSearch(value: string | undefined) {
  return value?.trim().replace(/[%(),]/g, " ").slice(0, 80) || "";
}

// ─── FETCH LIST (paginated + filtered) ───────────────

export async function fetchInventoryList(
  filters: InventoryFilters = {}
): Promise<{ data: InventoryItem[]; count: number }> {
  return withAdmin(async (supabase) => {
    const page = normalizePage(filters.page);
    const from = (page - 1) * INVENTORY_PAGE_SIZE;
    const to = from + INVENTORY_PAGE_SIZE - 1;

    let query = supabase
      .from("inventory_items")
      .select(ITEM_SELECT, { count: "exact" })
      .is("deleted_at", null);

    // Status filter
    if (
      filters.status &&
      filters.status !== "all" &&
      validStatuses.has(filters.status)
    ) {
      query = query.eq("status", filters.status);
    }

    // Category filter
    if (
      filters.category &&
      filters.category !== "all" &&
      validCategories.has(filters.category)
    ) {
      query = query.eq("category", filters.category);
    }

    // Search (name or code)
    const s = normalizeSearch(filters.search);
    if (s) {
      query = query.or(`name.ilike.%${s}%,item_code.ilike.%${s}%`);
    }

    const sortMap: Record<string, { column: string; ascending: boolean }> = {
      newest: { column: "created_at", ascending: false },
      name_asc: { column: "name", ascending: true },
      stock_asc: { column: "current_stock", ascending: true },
      stock_desc: { column: "current_stock", ascending: false },
    };
    const sort = sortMap[filters.sort || "newest"] || sortMap.newest;
    query = query.order(sort.column, { ascending: sort.ascending });
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) {
      console.error("[fetchInventoryList]", error);
      return { data: [], count: 0 };
    }
    return { data: (data as InventoryItem[]) || [], count: count || 0 };
  }).then((result) => {
    if (result.success) return result.data;
    console.error("[fetchInventoryList] auth error:", result.error);
    return { data: [], count: 0 };
  });
}

// ─── FETCH DETAIL (single item + recent transactions) ──

export async function fetchInventoryDetail(id: string): Promise<InventoryDetail | null> {
  return withAdmin(async (supabase) => {
    // Parallel: item + transactions
    const [itemRes, txnRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select(ITEM_SELECT)
        .eq("id", id)
        .is("deleted_at", null)
        .single(),
      supabase
        .from("inventory_transactions")
        .select("*")
        .eq("item_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (itemRes.error || !itemRes.data) return null;

    return {
      ...(itemRes.data as InventoryItem),
      transactions: (txnRes.data || []) as unknown as InventoryTransaction[],
    };
  }).then((result) => {
    if (result.success) return result.data;
    return null;
  });
}

// ─── TRANSACTION HISTORY (full log, filtered) ────────

export async function fetchTransactionHistory(
  filters: TransactionFilters = {}
): Promise<{ data: InventoryTransaction[]; count: number }> {
  return withAdmin(async (supabase) => {
    const page = normalizePage(filters.page);
    const from = (page - 1) * TRANSACTION_PAGE_SIZE;
    const to = from + TRANSACTION_PAGE_SIZE - 1;

    let query = supabase
      .from("inventory_transactions")
      .select(
        "*, inventory_items!inner(name, item_code)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.type && filters.type !== "all") {
      query = query.eq("transaction_type", filters.type);
    }
    if (filters.item_id) {
      query = query.eq("item_id", filters.item_id);
    }
    if (filters.contract_id) {
      query = query.eq("contract_id", filters.contract_id);
    }
    if (filters.start_date) {
      query = query.gte("created_at", filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte("created_at", filters.end_date);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error("[fetchTransactionHistory]", error);
      return { data: [], count: 0 };
    }

    // Map joined fields
    const mapped = (data || []).map((t) => ({
      ...t,
      item_name: (t.inventory_items as Record<string, string>)?.name,
      item_code: (t.inventory_items as Record<string, string>)?.item_code,
    })) as InventoryTransaction[];

    return { data: mapped, count: count || 0 };
  }).then((result) => {
    if (result.success) return result.data;
    console.error("[fetchTransactionHistory] auth error:", result.error);
    return { data: [], count: 0 };
  });
}

// ─── STATS ───────────────────────────────────────────

export async function getInventoryStats(): Promise<InventoryStats> {
  return withAdmin(async (supabase) => {
    const [itemsRes, txnRes] = await Promise.all([
      supabase
        .from("inventory_items")
        .select("current_stock, min_stock, average_unit_price, status")
        .is("deleted_at", null),
      supabase
        .from("inventory_transactions")
        .select("id", { count: "exact", head: true })
        .gte(
          "created_at",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        ),
    ]);

    const items = itemsRes.data || [];
    return {
      total: items.length,
      active: items.filter((i) => i.status === "active").length,
      lowStock: items.filter(
        (i) => i.min_stock && i.current_stock < i.min_stock
      ).length,
      totalValue: items.reduce(
        (sum, i) => sum + (i.current_stock || 0) * (i.average_unit_price || 0),
        0
      ),
      transactionsThisMonth: txnRes.count || 0,
    };
  }).then((result) => {
    if (result.success) return result.data;
    return { total: 0, active: 0, lowStock: 0, totalValue: 0, transactionsThisMonth: 0 };
  });
}

// ─── NEXT INVENTORY CODE (auto-gen VT-XXX) ───────────

export async function getNextInventoryCode(): Promise<string> {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("item_code")
      .ilike("item_code", "VT-%")
      .range(0, 4999);

    if (error) throw new Error(`Không thể tạo mã vật tư: ${error.message}`);

    const maxNumber = (data || []).reduce((max, row) => {
      const match = String(row.item_code || "").match(/^VT-(\d+)$/);
      if (!match) return max;
      return Math.max(max, Number(match[1]) || 0);
    }, 0);

    return `VT-${String(maxNumber + 1).padStart(3, "0")}`;
  }).then((result) => {
    if (result.success) return result.data;
    return "VT-001";
  });
}

// ─── FETCH FOR SALE (lightweight — for receipt form) ──

export interface InventorySaleOption {
  id: string;
  name: string;
  item_code: string;
  current_stock: number;
  sale_price: number;
  unit: string | null;
}

export async function fetchInventoryForSale(): Promise<InventorySaleOption[]> {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, item_code, current_stock, sale_price, unit")
      .is("deleted_at", null)
      .eq("status", "active")
      .gt("current_stock", 0)
      .order("name", { ascending: true });

    if (error) {
      console.error("[fetchInventoryForSale]", error);
      return [];
    }
    return (data || []) as InventorySaleOption[];
  }).then((result) => {
    if (result.success) return result.data;
    return [];
  });
}

export async function fetchInventoryPickerItems(): Promise<InventoryItem[]> {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select(ITEM_SELECT)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .range(0, 999);

    if (error) {
      console.error("[fetchInventoryPickerItems]", error);
      return [];
    }

    return (data || []) as InventoryItem[];
  }).then((result) => {
    if (result.success) return result.data;
    return [];
  });
}
