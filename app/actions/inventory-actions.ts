"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Inventory Actions — Items CRUD + Transactions + Reservations
// V1 ref: inventory.ts (323 lines) → split into 2 files
// V2: withAuth + fireAuditLog + stock validation
// ═══════════════════════════════════════════

// ─── TYPES ────────────────────────────────────

interface CreateTransactionInput {
  item_id: string;
  transaction_type: "IN" | "OUT";
  quantity: number;
  unit_cost?: number;
  contract_id?: string;
  contract_code?: string;
  printing_order_id?: string;
  reason: string;
  supplier?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  notes?: string;
}

// ─── GET ITEMS (Search) ──────────────────────

export async function getInventoryAction(search?: string) {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("inventory_items")
      .select("id, item_code, name, category, size, color, rental_price, current_stock, min_stock, average_unit_price, status, image_url, notes, created_at")
      .order("created_at", { ascending: false });

    if (search) {
      const s = search.replace(/[(),]/g, " ");
      query = query.or(`name.ilike.%${s}%,item_code.ilike.%${s}%`);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Lỗi lấy vật tư: ${error.message}`);
    return data || [];
  });
}

/** Get available items for reservation */
export async function getAvailableItems() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("id, name, item_code, category, size, color, rental_price, image_url")
      .eq("status", "available")
      .order("name");
    if (error) throw new Error(`Lỗi lấy trang phục: ${error.message}`);
    return data || [];
  });
}

// ─── CREATE ITEM ─────────────────────────────

export async function createInventoryItem(data: Record<string, string | number | null>) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("inventory_items").insert(data);
    if (error) throw new Error(`Lỗi thêm vật tư: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "inventory_items", description: `Thêm vật tư: ${data.name || data.item_code}` });
    revalidatePath("/inventory");
    return null;
  });
}

// ─── UPDATE ITEM ─────────────────────────────

export async function updateInventoryItem(id: string, data: Record<string, string | number | null>) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("inventory_items").update(data).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật vật tư: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "inventory_items", recordId: id, description: `Cập nhật vật tư #${id.substring(0, 8)}` });
    revalidatePath("/inventory");
    return null;
  });
}

// ─── DELETE ITEM ─────────────────────────────

export async function deleteInventoryItem(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa vật tư: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "inventory_items", recordId: id, description: `Xóa vật tư #${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/inventory");
    return null;
  });
}

// ─── CREATE TRANSACTION (Nhập/Xuất kho) ──────

export async function createInventoryTransaction(input: CreateTransactionInput) {
  return withAuth(async (supabase, userId) => {
    if (!input.item_id) throw new Error("Chưa chọn vật tư");
    if (!input.quantity || input.quantity <= 0) throw new Error("Số lượng phải lớn hơn 0");
    if (input.transaction_type === "IN" && !input.reason?.trim()) throw new Error("Vui lòng nhập lý do");

    // Stock check for OUT
    if (input.transaction_type === "OUT") {
      const { data: item } = await supabase.from("inventory_items").select("current_stock, name").eq("id", input.item_id).single();
      if (!item) throw new Error("Vật tư không tồn tại");
      if (item.current_stock < input.quantity) throw new Error(`Không đủ tồn kho! ${item.name} chỉ còn ${item.current_stock}`);
    }

    const { error } = await supabase.from("inventory_transactions").insert({
      item_id: input.item_id, transaction_type: input.transaction_type, quantity: input.quantity,
      unit_cost: input.unit_cost || 0, contract_id: input.contract_id || null, contract_code: input.contract_code || null,
      printing_order_id: input.printing_order_id || null, reason: input.reason?.trim() || null,
      supplier: input.supplier?.trim() || null, performed_by: userId,
      customer_name: input.customer_name?.trim() || null, customer_phone: input.customer_phone?.trim() || null,
      customer_address: input.customer_address?.trim() || null, notes: input.notes?.trim() || null,
    });
    if (error) throw new Error(`Lỗi tạo phiếu: ${error.message}`);

    // Low stock warning
    let warning: string | undefined;
    if (input.transaction_type === "OUT") {
      const { data: updated } = await supabase.from("inventory_items").select("current_stock, min_stock, name").eq("id", input.item_id).single();
      if (updated && updated.min_stock && updated.current_stock < updated.min_stock) {
        warning = `⚠️ ${updated.name} sắp hết! Còn ${updated.current_stock} (tối thiểu: ${updated.min_stock})`;
      }
    }

    fireAuditLog({ action: "CREATE", tableName: "inventory_transactions", description: `${input.transaction_type === "IN" ? "Nhập" : "Xuất"} kho: ${input.quantity} đơn vị` });
    revalidatePath("/inventory");
    return { warning };
  });
}


// ─── INVENTORY STATS ─────────────────────────

export async function getInventoryStats() {
  return withAuth(async (supabase) => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const [itemsRes, txnRes] = await Promise.all([
      supabase.from("inventory_items").select("current_stock, min_stock, average_unit_price"),
      supabase.from("inventory_transactions").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    ]);
    const items = itemsRes.data || [];
    return {
      totalItems: items.length,
      totalValue: items.reduce((sum, i) => sum + (i.current_stock || 0) * (i.average_unit_price || 0), 0),
      lowStockItems: items.filter((i) => i.min_stock && i.current_stock < i.min_stock).length,
      transactionsThisMonth: txnRes.count || 0,
    };
  });
}
