"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import {
  inventoryCreateSchema,
  inventoryUpdateSchema,
  stockInSchema,
  stockOutSchema,
} from "@/lib/validations/inventory.schema";

// ═══════════════════════════════════════════
// Inventory Mutations — Create/Update/Delete + Stock In/Out
// DB: inventory_items, inventory_transactions
// Pattern: withAuth + Zod safeParse + fireAuditLog + revalidatePath
// ═══════════════════════════════════════════

// ─── CREATE ──────────────────────────────────────────

export async function createInventoryItem(rawData: unknown) {
  const parsed = inventoryCreateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const data = parsed.data;

    // Auto-gen item_code if empty — MAX() parse
    let itemCode = data.item_code?.trim();
    if (!itemCode) {
      const { data: maxRow } = await supabase
        .from("inventory_items")
        .select("item_code")
        .like("item_code", "VT-%")
        .order("item_code", { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (maxRow?.item_code) {
        const match = maxRow.item_code.match(/(\d+)$/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      itemCode = `VT-${String(nextNum).padStart(3, "0")}`;
    }

    try {
      const { data: result, error } = await supabase
        .from("inventory_items")
        .insert({
          name: data.name,
          item_code: itemCode,
          category: data.category,
          unit: data.unit,
          min_stock: data.min_stock || 0,
          purchase_price: data.purchase_price || 0,
          sale_price: data.sale_price || 0,
          supplier: data.supplier?.trim() || null,
          image_url: data.image_url || null,
          notes: data.notes?.trim() || null,
          status: "active",
          current_stock: 0,
          average_unit_price: 0,
          created_by: userId,
          updated_by: userId,
        })
        .select("id, item_code")
        .single();

      if (error) {
        // Race condition retry
        if (error.code === "23505" && !parsed.data.item_code?.trim()) {
          const codeMatch = itemCode.match(/(\d+)$/);
          const currentNum = codeMatch ? parseInt(codeMatch[1], 10) : 0;
          const retryCode = `VT-${String(currentNum + 1).padStart(3, "0")}`;
          const { data: retryData, error: retryErr } = await supabase
            .from("inventory_items")
            .insert({
              name: data.name,
              item_code: retryCode,
              category: data.category,
              unit: data.unit,
              min_stock: data.min_stock || 0,
              purchase_price: data.purchase_price || 0,
              sale_price: data.sale_price || 0,
              supplier: data.supplier?.trim() || null,
              image_url: data.image_url || null,
              notes: data.notes?.trim() || null,
              status: "active",
              current_stock: 0,
              average_unit_price: 0,
              created_by: userId,
              updated_by: userId,
            })
            .select("id, item_code")
            .single();
          if (retryErr) throw new Error("Mã vật tư đã tồn tại, vui lòng thử lại");
          await fireAuditLog({ action: "CREATE", tableName: "inventory_items", recordId: retryData.id, source: "server_action" });
          revalidatePath("/inventory");
          return { success: true as const, data: retryData };
        }
        throw new Error(error.message);
      }

      await fireAuditLog({ action: "CREATE", tableName: "inventory_items", recordId: result.id, source: "server_action" });
      revalidatePath("/inventory");
      return { success: true as const, data: result };
    } catch (err) {
      console.error("[createInventoryItem]", err);
      return { success: false as const, error: err instanceof Error ? err.message : "Không thể tạo vật tư" };
    }
  });
}

// ─── UPDATE (optimistic locking) ─────────────────────

export async function updateInventoryItem(rawData: unknown) {
  const parsed = inventoryUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const { id, updated_at, data } = parsed.data;

    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          ...data,
          supplier: data.supplier?.trim() || null,
          image_url: data.image_url || null,
          notes: data.notes?.trim() || null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("updated_at", updated_at) // Optimistic lock
        .is("deleted_at", null);

      if (error) throw new Error(error.message);

      await fireAuditLog({ action: "UPDATE", tableName: "inventory_items", recordId: id, source: "server_action" });
      revalidatePath("/inventory");
      return { success: true as const };
    } catch (err) {
      console.error("[updateInventoryItem]", err);
      return { success: false as const, error: "Không thể cập nhật. Dữ liệu có thể đã bị thay đổi." };
    }
  });
}

// ─── DELETE (soft delete) ────────────────────────────

export async function deleteInventoryItem(id: string) {
  return withAuth(async (supabase, userId) => {
    try {
      const { error } = await supabase
        .from("inventory_items")
        .update({ deleted_at: new Date().toISOString(), updated_by: userId })
        .eq("id", id)
        .is("deleted_at", null);

      if (error) throw new Error(error.message);

      await fireAuditLog({ action: "DELETE", tableName: "inventory_items", recordId: id, source: "server_action" });
      revalidatePath("/inventory");
      return { success: true as const };
    } catch (err) {
      console.error("[deleteInventoryItem]", err);
      return { success: false as const, error: "Không thể xóa vật tư" };
    }
  });
}

// ─── STOCK IN (nhập kho) ─────────────────────────────

export async function stockIn(rawData: unknown) {
  const parsed = stockInSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const { itemId, quantity, unitCost, supplier, reason, notes } = parsed.data;

    try {
      // Get current item
      const { data: item, error: fetchErr } = await supabase
        .from("inventory_items")
        .select("id, current_stock, average_unit_price, name")
        .eq("id", itemId)
        .is("deleted_at", null)
        .single();

      if (fetchErr || !item) {
        return { success: false as const, error: "Vật tư không tồn tại" };
      }

      // Calculate new average price (weighted)
      const oldStock = item.current_stock || 0;
      const oldAvg = item.average_unit_price || 0;
      const newStock = oldStock + quantity;
      const newAvg = newStock > 0
        ? ((oldStock * oldAvg) + (quantity * unitCost)) / newStock
        : unitCost;

      // Insert transaction
      const { error: txnErr } = await supabase
        .from("inventory_transactions")
        .insert({
          item_id: itemId,
          transaction_type: "stock_in",
          quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
          supplier: supplier?.trim() || null,
          reason: reason?.trim() || "Nhập kho",
          notes: notes?.trim() || null,
          performed_by: userId,
          created_by: userId,
        });

      if (txnErr) throw new Error(txnErr.message);

      // Update stock + avg price
      const { error: updateErr } = await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          average_unit_price: Math.round(newAvg * 100) / 100,
          purchase_price: unitCost, // Last purchase price
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (updateErr) throw new Error(updateErr.message);

      await fireAuditLog({ action: "CREATE", tableName: "inventory_transactions", recordId: itemId, description: "Stock In", source: "server_action" });
      revalidatePath("/inventory");
      return { success: true as const };
    } catch (err) {
      console.error("[stockIn]", err);
      return { success: false as const, error: "Không thể nhập kho" };
    }
  });
}

// ─── STOCK OUT (xuất kho) ────────────────────────────

export async function stockOut(rawData: unknown) {
  const parsed = stockOutSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAuth(async (supabase, userId) => {
    const { itemId, quantity, contractId, reason, customerName, customerPhone, notes } = parsed.data;

    try {
      // Check current stock
      const { data: item, error: fetchErr } = await supabase
        .from("inventory_items")
        .select("id, current_stock, min_stock, name, average_unit_price")
        .eq("id", itemId)
        .is("deleted_at", null)
        .single();

      if (fetchErr || !item) {
        return { success: false as const, error: "Vật tư không tồn tại" };
      }

      if (item.current_stock < quantity) {
        return {
          success: false as const,
          error: `Không đủ tồn kho! ${item.name} chỉ còn ${item.current_stock}`,
        };
      }

      // Insert transaction
      const unitCost = item.average_unit_price || 0;
      const { error: txnErr } = await supabase
        .from("inventory_transactions")
        .insert({
          item_id: itemId,
          transaction_type: "stock_out",
          quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
          contract_id: contractId || null,
          reason: reason?.trim() || "Xuất kho",
          customer_name: customerName?.trim() || null,
          customer_phone: customerPhone?.trim() || null,
          notes: notes?.trim() || null,
          performed_by: userId,
          created_by: userId,
        });

      if (txnErr) throw new Error(txnErr.message);

      // Update stock
      const newStock = item.current_stock - quantity;
      const { error: updateErr } = await supabase
        .from("inventory_items")
        .update({
          current_stock: newStock,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (updateErr) throw new Error(updateErr.message);

      await fireAuditLog({ action: "CREATE", tableName: "inventory_transactions", recordId: itemId, description: "Stock Out", source: "server_action" });
      revalidatePath("/inventory");

      // Low stock warning (from V1)
      let warning: string | undefined;
      if (item.min_stock && newStock < item.min_stock) {
        warning = `⚠️ ${item.name} sắp hết! Còn ${newStock} (tối thiểu: ${item.min_stock})`;
      }

      return { success: true as const, warning };
    } catch (err) {
      console.error("[stockOut]", err);
      return { success: false as const, error: "Không thể xuất kho" };
    }
  });
}
