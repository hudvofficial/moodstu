"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Inventory Query Actions — Transaction History
// V1 ref: inventory.ts (getItemTransactions, getAllTransactions)
// V2: withAuth + paginated + joined data
// ═══════════════════════════════════════════

/** Get transactions for a specific item (paginated) */
export async function getItemTransactions(itemId: string, page: number = 1, pageSize: number = 20) {
  return withAuth(async (supabase) => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await supabase
      .from("inventory_transactions")
      .select("*, inventory_items!inner(name, item_code)", { count: "exact" })
      .eq("item_id", itemId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(`Lỗi tải lịch sử: ${error.message}`);

    return {
      transactions: (data || []).map((t) => ({
        ...t,
        item_name: (t.inventory_items as Record<string, string>)?.name,
        item_code: (t.inventory_items as Record<string, string>)?.item_code,
      })),
      total: count || 0,
    };
  });
}

/** Get all transactions with filters (paginated) */
export async function getAllTransactions(filters?: {
  type?: "IN" | "OUT";
  item_id?: string;
  contract_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
}) {
  return withAuth(async (supabase) => {
    const page = filters?.page || 1;
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("inventory_transactions")
      .select("*, inventory_items!inner(name, item_code)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.type) query = query.eq("transaction_type", filters.type);
    if (filters?.item_id) query = query.eq("item_id", filters.item_id);
    if (filters?.contract_id) query = query.eq("contract_id", filters.contract_id);
    if (filters?.start_date) query = query.gte("created_at", filters.start_date);
    if (filters?.end_date) query = query.lte("created_at", filters.end_date);

    const { data, count, error } = await query;
    if (error) throw new Error(`Lỗi tải giao dịch kho: ${error.message}`);

    revalidatePath("/inventory");
    return {
      transactions: (data || []).map((t) => ({
        ...t,
        item_name: (t.inventory_items as Record<string, string>)?.name,
        item_code: (t.inventory_items as Record<string, string>)?.item_code,
      })),
      total: count || 0,
    };
  });
}
