"use server";

import { withInventoryAccess } from "@/lib/auth_utils";
import { profileAction } from "@/lib/action-profiler";
import {
  inventoryListFiltersSchema,
  inventoryPickerFiltersSchema,
  inventoryUuidSchema,
  transactionFiltersSchema,
} from "@/lib/validations/inventory.schema";
import type {
  InventoryDetail,
  InventoryFilters,
  InventoryContractOption,
  InventoryItem,
  InventoryPickerFilters,
  InventoryPickerPage,
  InventoryStats,
  InventoryTransaction,
  InventoryTransactionTotals,
  TransactionFilters,
} from "@/types/inventory";
import { INVENTORY_PAGE_SIZE, TRANSACTION_PAGE_SIZE } from "@/types/inventory-constants";

const ITEM_SELECT = `
  id, item_code, name, category, unit,
  current_stock, min_stock, purchase_price, average_unit_price, sale_price,
  supplier, image_url, status, notes,
  created_by, updated_by, created_at, updated_at, deleted_at
`;

function normalizeSearch(value: string | undefined) {
  return value?.trim().replace(/[%_(),]/g, " ").slice(0, 80) || "";
}

function normalizeStats(value: unknown): InventoryStats {
  const data = (value && typeof value === "object" ? value : {}) as Partial<InventoryStats>;
  return {
    total: Number(data.total || 0),
    active: Number(data.active || 0),
    lowStock: Number(data.lowStock || 0),
    outOfStock: Number(data.outOfStock || 0),
    totalValue: Number(data.totalValue || 0),
    transactionsThisMonth: Number(data.transactionsThisMonth || 0),
  };
}

function normalizeTotals(value: unknown): InventoryTransactionTotals {
  const data = (value && typeof value === "object" ? value : {}) as Partial<InventoryTransactionTotals>;
  return {
    totalIn: Number(data.totalIn || 0),
    totalOut: Number(data.totalOut || 0),
    transactionCount: Number(data.transactionCount || 0),
  };
}

function firstRelation(value: unknown): Record<string, unknown> | null {
  const item = Array.isArray(value) ? value[0] : value;
  return item && typeof item === "object" ? (item as Record<string, unknown>) : null;
}

function unwrapActionResult<T>(
  result: { success: true; data: T } | { success: false; error: string },
  label: string,
): T {
  if (result.success) return result.data;
  throw new Error(`${label}: ${result.error}`);
}

interface InventoryDetailV2Payload {
  item?: InventoryItem | null;
  transactions?: unknown;
  totals?: unknown;
}

export async function fetchInventoryList(
  filters: InventoryFilters = {},
): Promise<{ data: InventoryItem[]; count: number }> {
  const parsed = inventoryListFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Bộ lọc kho không hợp lệ");
  }

  return profileAction("inventory.fetchInventoryList", async () =>
    unwrapActionResult(
      await withInventoryAccess(async (supabase) => {
        const page = parsed.data.page || 1;
        const { data, error } = await supabase.rpc("inventory_list", {
          p_search: normalizeSearch(parsed.data.search),
          p_category:
            parsed.data.category && parsed.data.category !== "all"
              ? parsed.data.category
              : null,
          p_status:
            parsed.data.status && parsed.data.status !== "all"
              ? parsed.data.status
              : null,
          p_sort: parsed.data.sort || "newest",
          p_page: page,
          p_limit: INVENTORY_PAGE_SIZE,
        });

        if (error) throw new Error(`Không thể tải danh sách kho: ${error.message}`);

        const payload = (data && typeof data === "object" ? data : {}) as {
          items?: InventoryItem[];
          total?: number;
        };

        return {
          data: Array.isArray(payload.items) ? payload.items : [],
          count: Number(payload.total || 0),
        };
      }),
      "fetchInventoryList",
    ),
  );
}

export async function fetchInventoryDetail(id: string): Promise<InventoryDetail | null> {
  const parsedId = inventoryUuidSchema.safeParse(id);
  if (!parsedId.success) throw new Error(parsedId.error.issues[0]?.message || "ID vật tư không hợp lệ");

  return profileAction("inventory.fetchInventoryDetail", async () =>
    unwrapActionResult(
      await withInventoryAccess(async (supabase) => {
        // 🚀 Phase 04: Try new single-RPC pattern first
        const { data: v2Data, error: v2Error } = await supabase.rpc("inventory_detail_v2", {
          p_item_id: parsedId.data,
        });

        if (!v2Error && v2Data) {
          const detail = v2Data as InventoryDetailV2Payload;
          if (!detail.item) return null;
          return {
            ...detail.item,
            transactions: (Array.isArray(detail.transactions) ? detail.transactions : []) as InventoryTransaction[],
            transactionTotals: normalizeTotals(detail.totals),
          };
        }

        // 🛡️ Fallback: Legacy 3-query pattern (safe migration)
        const [itemRes, txnRes, totalsRes] = await Promise.all([
          supabase
            .from("inventory_items")
            .select(ITEM_SELECT)
            .eq("id", parsedId.data)
            .is("deleted_at", null)
            .maybeSingle(),
          supabase
            .from("inventory_transactions")
            .select("*")
            .eq("item_id", parsedId.data)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.rpc("inventory_item_transaction_totals", {
            p_item_id: parsedId.data,
          }),
        ]);

        if (itemRes.error) throw new Error(`Không thể tải vật tư: ${itemRes.error.message}`);
        if (!itemRes.data) return null;
        if (txnRes.error) throw new Error(`Không thể tải lịch sử kho: ${txnRes.error.message}`);
        if (totalsRes.error) {
          throw new Error(`Không thể tải tổng hợp lịch sử kho: ${totalsRes.error.message}`);
        }

        return {
          ...(itemRes.data as InventoryItem),
          transactions: (txnRes.data || []) as unknown as InventoryTransaction[],
          transactionTotals: normalizeTotals(totalsRes.data),
        };
      }),
      "fetchInventoryDetail",
    ),
  );
}

export async function fetchTransactionHistory(
  filters: TransactionFilters = {},
): Promise<{ data: InventoryTransaction[]; count: number }> {
  const parsed = transactionFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Bộ lọc lịch sử kho không hợp lệ");
  }

  return profileAction("inventory.fetchTransactionHistory", async () =>
    unwrapActionResult(
      await withInventoryAccess(async (supabase) => {
        const page = parsed.data.page || 1;
        const from = (page - 1) * TRANSACTION_PAGE_SIZE;
        const to = from + TRANSACTION_PAGE_SIZE - 1;

        let query = supabase
          .from("inventory_transactions")
          .select("*, inventory_items!inner(name, item_code)", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);

        if (parsed.data.type && parsed.data.type !== "all") {
          query = query.eq("transaction_type", parsed.data.type);
        }
        if (parsed.data.item_id) query = query.eq("item_id", parsed.data.item_id);
        if (parsed.data.contract_id) query = query.eq("contract_id", parsed.data.contract_id);
        if (parsed.data.start_date) query = query.gte("created_at", parsed.data.start_date);
        if (parsed.data.end_date) query = query.lte("created_at", parsed.data.end_date);

        const { data, count, error } = await query;
        if (error) throw new Error(`Không thể tải lịch sử kho: ${error.message}`);

        const mapped = (data || []).map((txn) => ({
          ...txn,
          item_name: (txn.inventory_items as Record<string, string>)?.name,
          item_code: (txn.inventory_items as Record<string, string>)?.item_code,
        })) as InventoryTransaction[];

        return { data: mapped, count: count || 0 };
      }),
      "fetchTransactionHistory",
    ),
  );
}

export async function getInventoryStats(): Promise<InventoryStats> {
  return profileAction("inventory.getInventoryStats", async () =>
    unwrapActionResult(
      await withInventoryAccess(async (supabase) => {
        const { data, error } = await supabase.rpc("inventory_stats");
        if (error) throw new Error(`Không thể tải thống kê kho: ${error.message}`);
        return normalizeStats(data);
      }),
      "getInventoryStats",
    ),
  );
}

export async function getNextInventoryCode(): Promise<string> {
  return unwrapActionResult(
    await withInventoryAccess(async (supabase) => {
      const { data, error } = await supabase.rpc("nextval_inventory_code");
      if (error) throw new Error(`Không thể tạo mã vật tư: ${error.message}`);
      return String(data);
    }),
    "getNextInventoryCode",
  );
}

export interface InventorySaleOption {
  id: string;
  name: string;
  item_code: string;
  current_stock: number;
  sale_price: number;
  unit: string | null;
}

export async function fetchInventoryForSale(): Promise<InventorySaleOption[]> {
  return unwrapActionResult(
    await withInventoryAccess(async (supabase) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, item_code, current_stock, sale_price, unit")
        .is("deleted_at", null)
        .eq("status", "active")
        .gt("current_stock", 0)
        .order("name", { ascending: true })
        .range(0, 499);

      if (error) throw new Error(`Không thể tải vật tư bán ra: ${error.message}`);
      return (data || []) as InventorySaleOption[];
    }),
    "fetchInventoryForSale",
  );
}

export async function fetchInventoryContractOptions(
  search?: string,
): Promise<InventoryContractOption[]> {
  return unwrapActionResult(
    await withInventoryAccess(async (supabase) => {
      const term = normalizeSearch(search);
      let query = supabase
        .from("contracts")
        .select("id, contract_code, customers!inner(full_name, phone)")
        .is("deleted_at", null)
        .neq("status", "da_huy")
        .order("created_at", { ascending: false })
        .limit(20);

      if (term) {
        query = query.or(`contract_code.ilike.%${term}%,customers.full_name.ilike.%${term}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(`Không thể tải hợp đồng xuất kho: ${error.message}`);

      return (data || []).map((contract) => {
        const customer = firstRelation((contract as Record<string, unknown>).customers);
        return {
          id: String(contract.id),
          contract_code: String(contract.contract_code || ""),
          customer_name: String(customer?.full_name || "Khách hàng"),
          customer_phone: typeof customer?.phone === "string" ? customer.phone : null,
        };
      });
    }),
    "fetchInventoryContractOptions",
  );
}

export async function fetchInventoryPickerItems(
  filters: InventoryPickerFilters = {},
): Promise<InventoryPickerPage> {
  const parsed = inventoryPickerFiltersSchema.safeParse(filters);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Bộ lọc chọn vật tư không hợp lệ");
  }

  return unwrapActionResult(
    await withInventoryAccess(async (supabase) => {
      const page = parsed.data.page || 1;
      const limit = parsed.data.limit || 30;
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const search = normalizeSearch(parsed.data.search);

      let query = supabase
        .from("inventory_items")
        .select(ITEM_SELECT, { count: "exact" })
        .is("deleted_at", null)
        .order("name", { ascending: true })
        .range(from, to);

      if (parsed.data.activeOnly !== false) {
        query = query.eq("status", "active");
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,item_code.ilike.%${search}%`);
      }

      const { data, count, error } = await query;
      if (error) throw new Error(`Không thể tải danh sách vật tư: ${error.message}`);

      return {
        items: (data || []) as InventoryItem[],
        total: count || 0,
        page,
        limit,
      };
    }),
    "fetchInventoryPickerItems",
  );
}
