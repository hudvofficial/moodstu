"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fireAuditLog } from "@/lib/audit";
import { withAdmin } from "@/lib/auth_utils";
import { isMissingRpcError } from "@/lib/finance-utils";
import {
  inventoryCreateSchema,
  inventoryUpdateSchema,
  stockInSchema,
  stockOutSchema,
} from "@/lib/validations/inventory.schema";

const uuidSchema = z.string().uuid("ID vật tư không hợp lệ");

async function generateNextInventoryCode(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("item_code")
    .ilike("item_code", "VT-%")
    .range(0, 4999);

  if (error) {
    throw new Error(`Không thể tạo mã vật tư: ${error.message}`);
  }

  const maxNumber = (data || []).reduce((max, row) => {
    const match = String(row.item_code || "").match(/^VT-(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);

  return `VT-${String(maxNumber + 1).padStart(3, "0")}`;
}

function normalizeOptionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

export async function createInventoryItem(rawData: unknown) {
  const parsed = inventoryCreateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ",
    };
  }

  return withAdmin(async (supabase, userId) => {
    const data = parsed.data;
    const hasManualCode = Boolean(data.item_code?.trim());
    let lastError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const itemCode = hasManualCode
        ? data.item_code!.trim()
        : await generateNextInventoryCode(supabase);

      const { data: created, error } = await supabase
        .from("inventory_items")
        .insert({
          name: data.name.trim(),
          item_code: itemCode,
          category: data.category,
          unit: data.unit,
          min_stock: data.min_stock || 0,
          purchase_price: data.purchase_price || 0,
          sale_price: data.sale_price || 0,
          supplier: normalizeOptionalText(data.supplier),
          image_url: normalizeOptionalText(data.image_url),
          notes: normalizeOptionalText(data.notes),
          status: "active",
          current_stock: 0,
          average_unit_price: 0,
          created_by: userId,
          updated_by: userId,
        })
        .select("id, item_code, name")
        .single();

      if (!error && created) {
        await fireAuditLog({
          action: "CREATE",
          tableName: "inventory_items",
          recordId: created.id,
          description: `Tạo vật tư: ${created.name} (${created.item_code})`,
          newData: created,
          source: "server_action",
        });

        revalidatePath("/inventory");
        return { id: created.id, item_code: created.item_code };
      }

      lastError = error;
      if (hasManualCode || error?.code !== "23505") break;
    }

    if (lastError?.code === "23505") {
      throw new Error("Mã vật tư đã tồn tại. Vui lòng thử lại.");
    }

    throw new Error(
      `Không thể tạo vật tư: ${lastError?.message || "Không xác định"}`,
    );
  });
}

export async function updateInventoryItem(rawData: unknown) {
  const parsed = inventoryUpdateSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ",
    };
  }

  return withAdmin(async (supabase, userId) => {
    const { id, updated_at, data } = parsed.data;
    const updatePayload: Record<string, unknown> = { ...data };

    if ("name" in data && typeof data.name === "string") {
      updatePayload.name = data.name.trim();
    }
    if ("item_code" in data && typeof data.item_code === "string") {
      updatePayload.item_code = data.item_code.trim();
    }
    if ("supplier" in data) {
      updatePayload.supplier = normalizeOptionalText(data.supplier);
    }
    if ("image_url" in data) {
      updatePayload.image_url = normalizeOptionalText(data.image_url);
    }
    if ("notes" in data) {
      updatePayload.notes = normalizeOptionalText(data.notes);
    }

    updatePayload.updated_by = userId;
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("inventory_items")
      .update(updatePayload)
      .eq("id", id)
      .eq("updated_at", updated_at)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(`Không thể cập nhật vật tư: ${error.message}`);
    if (!updated) {
      throw new Error(
        "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng làm mới và thử lại.",
      );
    }

    await fireAuditLog({
      action: "UPDATE",
      tableName: "inventory_items",
      recordId: id,
      newData: updatePayload,
      source: "server_action",
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${id}`);
    return { id };
  });
}

export async function deleteInventoryItem(id: string) {
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  return withAdmin(async (supabase, userId) => {
    const { data: deleted, error } = await supabase
      .from("inventory_items")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsedId.data)
      .is("deleted_at", null)
      .select("id, name, item_code")
      .maybeSingle();

    if (error) throw new Error(`Không thể xóa vật tư: ${error.message}`);
    if (!deleted) throw new Error("Vật tư không tồn tại hoặc đã bị xóa");

    await fireAuditLog({
      action: "DELETE",
      tableName: "inventory_items",
      recordId: parsedId.data,
      oldData: deleted,
      description: `Xóa vật tư: ${deleted.name} (${deleted.item_code})`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${parsedId.data}`);
    return { id: parsedId.data };
  });
}

export async function stockIn(rawData: unknown) {
  const parsed = stockInSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ",
    };
  }

  return withAdmin(async (supabase, userId) => {
    const { itemId, quantity, unitCost, supplier, reason, notes } = parsed.data;
    const { data, error } = await supabase.rpc("inventory_stock_in_atomic", {
      p_item_id: itemId,
      p_quantity: quantity,
      p_unit_cost: unitCost,
      p_supplier: supplier?.trim() || null,
      p_reason: reason?.trim() || null,
      p_notes: notes?.trim() || null,
      p_user_id: userId,
    });

    if (error && isMissingRpcError(error)) {
      throw new Error(
        "Migration inventory_stock_in_atomic chưa được chạy. Vui lòng push migration trước khi nhập kho.",
      );
    }
    if (error) throw new Error(error.message);

    await fireAuditLog({
      action: "CREATE",
      tableName: "inventory_transactions",
      recordId: itemId,
      description: "Nhập kho",
      newData: data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${itemId}`);
    return data as { current_stock?: number };
  });
}

export async function stockOut(rawData: unknown) {
  const parsed = stockOutSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ",
    };
  }

  return withAdmin(async (supabase, userId) => {
    const {
      itemId,
      quantity,
      contractId,
      reason,
      customerName,
      customerPhone,
      notes,
    } = parsed.data;

    const { data, error } = await supabase.rpc("inventory_stock_out_atomic", {
      p_item_id: itemId,
      p_quantity: quantity,
      p_contract_id: contractId || null,
      p_reason: reason?.trim() || null,
      p_customer_name: customerName?.trim() || null,
      p_customer_phone: customerPhone?.trim() || null,
      p_notes: notes?.trim() || null,
      p_user_id: userId,
    });

    if (error && isMissingRpcError(error)) {
      throw new Error(
        "Migration inventory_stock_out_atomic chưa được chạy. Vui lòng push migration trước khi xuất kho.",
      );
    }
    if (error) throw new Error(error.message);

    await fireAuditLog({
      action: "CREATE",
      tableName: "inventory_transactions",
      recordId: itemId,
      description: "Xuất kho",
      newData: data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${itemId}`);
    return data as { current_stock?: number; warning?: string | null };
  });
}
