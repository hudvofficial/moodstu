"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { z } from "zod";
import { fireAuditLog } from "@/lib/audit";
import { withInventoryAccess, withAuth, requireInventoryAccess } from "@/lib/auth_utils";
import { checkPeriodLock, isMissingRpcError } from "@/lib/finance-utils";
import {
  inventoryContractAddonSaleSchema,
  inventoryRetailSaleSchema,
  inventoryCreateSchema,
  inventoryUpdateSchema,
  stockInSchema,
  stockOutSchema,
} from "@/lib/validations/inventory.schema";

const uuidSchema = z.string().uuid("ID vật tư không hợp lệ");

async function generateNextInventoryCode(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .rpc("nextval_inventory_code");

  if (error) {
    throw new Error(`Không thể tạo mã vật tư: ${error.message}`);
  }

  return String(data);
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

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
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
        let initialStockResult: unknown = null;

        if (data.initial_stock > 0) {
          const initialUnitCost = data.initial_unit_cost || data.purchase_price || 0;
          const { data: stockData, error: stockError } = await supabase.rpc(
            "inventory_stock_in_atomic",
            {
              p_item_id: created.id,
              p_quantity: data.initial_stock,
              p_unit_cost: initialUnitCost,
              // 3 tham số text KHÔNG có DEFAULT → generator khai bắt buộc, Postgres vẫn nhận NULL
              p_supplier: (normalizeOptionalText(data.supplier) ?? null) as string,
              p_reason: "Nhập kho ban đầu",
              p_notes: (normalizeOptionalText(data.notes) ?? null) as string,
              p_user_id: userId,
              // Khai báo vật tư mới: tồn ban đầu là số dư kê khai, không phải lô mua mới → không tạo phiếu chi
              p_paid: false,
            },
          );

          if (stockError && isMissingRpcError(stockError)) {
            throw new Error(
              "Migration inventory_stock_in_atomic chưa được chạy. Vui lòng push migration trước khi tạo vật tư có tồn đầu kỳ.",
            );
          }
          if (stockError) {
            throw new Error(`Không thể nhập tồn đầu kỳ: ${stockError.message}`);
          }
          initialStockResult = stockData;
        }

        await fireAuditLog({
          action: "CREATE",
          tableName: "inventory_items",
          recordId: created.id,
          description: `Tạo vật tư: ${created.name} (${created.item_code})`,
          newData: {
            ...created,
            initial_stock: data.initial_stock,
            initial_stock_result: initialStockResult,
          },
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

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { id, updated_at, data } = parsed.data;
    // initial_stock/initial_unit_cost là field của form, không phải cột inventory_items
    const { initial_stock, initial_unit_cost, ...updatableFields } = data;
    void initial_stock;
    void initial_unit_cost;
    const updatePayload: Database["public"]["Tables"]["inventory_items"]["Update"] = { ...updatableFields };

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

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { data: existing, error: existingError } = await supabase
      .from("inventory_items")
      .select("id, name, item_code, current_stock")
      .eq("id", parsedId.data)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Không thể kiểm tra vật tư: ${existingError.message}`);
    }
    if (!existing) {
      throw new Error("Vật tư không tồn tại hoặc đã bị xóa");
    }
    if ((existing.current_stock || 0) > 0) {
      throw new Error(
        "Không thể xóa vật tư đang còn tồn kho. Hãy xuất hết tồn hoặc chuyển trạng thái Ngưng.",
      );
    }

    const { count: transactionCount, error: transactionError } = await supabase
      .from("inventory_transactions")
      .select("id", { count: "exact", head: true })
      .eq("item_id", parsedId.data);

    if (transactionError) {
      throw new Error(`Không thể kiểm tra lịch sử kho: ${transactionError.message}`);
    }
    if ((transactionCount || 0) > 0) {
      throw new Error(
        "Không thể xóa vật tư đã có lịch sử giao dịch. Hãy chuyển trạng thái sang Ngưng.",
      );
    }

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

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { itemId, quantity, unitCost, supplier, reason, notes, supplierId, paid, paymentMethod, paidDate } = parsed.data;
    const { data, error } = await supabase.rpc("inventory_stock_in_atomic", {
      p_item_id: itemId,
      p_quantity: quantity,
      p_unit_cost: unitCost,
      // 3 tham số text KHÔNG có DEFAULT → generator khai bắt buộc, Postgres vẫn nhận NULL
      p_supplier: (supplier?.trim() || null) as string,
      p_reason: (reason?.trim() || null) as string,
      p_notes: (notes?.trim() || null) as string,
      p_user_id: userId,
      // ADR-016: phôi trả ngay → phiếu chi payee=supplier + phân bổ vào lô nhập
      p_supplier_id: supplierId ?? undefined,
      p_paid: paid,
      p_payment_method: paymentMethod,
      p_paid_date: paidDate ?? undefined,
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
    if (paid) {
      revalidatePath("/finance");
      revalidatePath("/finance/expenses");
    }
    return data as { current_stock?: number; expense_id?: string | null };
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

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const {
      itemId,
      quantity,
      contractId,
      reason,
      customerName,
      customerPhone,
      notes,
    } = parsed.data;
    const hasWalkInRecipient = !contractId && Boolean(customerName?.trim() || customerPhone?.trim());

    if (hasWalkInRecipient) {
      throw new Error("Bán lẻ vật tư phải tạo phiếu bán để ghi nhận giá bán và doanh thu.");
    }

    if (!contractId && !reason?.trim()) {
      throw new Error("Xuất nội bộ/hao hụt bắt buộc nhập lý do.");
    }

    const { data, error } = await supabase.rpc("inventory_stock_out_atomic", {
      p_item_id: itemId,
      p_quantity: quantity,
      p_contract_id: contractId || undefined,
      p_reason: reason?.trim() || undefined,
      p_customer_name: customerName?.trim() || undefined,
      p_customer_phone: customerPhone?.trim() || undefined,
      p_notes: notes?.trim() || undefined,
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
    if (contractId) {
      // M3b: xuất cho HĐ đổi giá vốn HĐ (contract_financials.cogs) → trang HĐ + báo cáo phải tươi
      revalidatePath("/contracts");
      revalidatePath(`/contracts/${contractId}`);
      revalidatePath("/finance");
    }
    return data as { current_stock?: number; warning?: string | null };
  });
}

export async function createInventoryRetailSale(rawData: unknown) {
  const parsed = inventoryRetailSaleSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Dữ liệu bán vật tư không hợp lệ",
    };
  }

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const input = parsed.data;
    const receiptAmount = input.quantity * input.saleUnitPrice;
    const customerAddress = normalizeOptionalText(input.customerAddress);
    const receiptNotes = [
      customerAddress ? `Địa chỉ khách lẻ: ${customerAddress}` : "",
      normalizeOptionalText(input.notes) || "",
    ].filter(Boolean).join("\n");

    await checkPeriodLock(supabase, input.receiptDate);

    const { data, error } = await supabase.rpc("create_sale_receipt_atomic", {
      p_receipt: {
        receipt_date: input.receiptDate,
        receipt_type: "sale_receipt",
        payment_type: input.paymentMethod,
        receipt_amount: receiptAmount,
        notes: receiptNotes,
        category_id: input.categoryId || "",
        category_name: input.categoryName || "Bán vật tư",
        customer_name: input.customerName?.trim() || "Khách lẻ",
        customer_phone: input.customerPhone?.trim() || "",
        created_by: userId,
      },
      p_items: [{
        item_id: input.itemId,
        item_name: input.itemName || "",
        quantity: input.quantity,
        sale_unit_price: input.saleUnitPrice,
        unit_cost: input.saleUnitPrice,
      }],
    });

    if (error && isMissingRpcError(error)) {
      throw new Error("Migration create_sale_receipt_atomic chưa được chạy. Vui lòng push migration trước khi bán vật tư.");
    }
    if (error) throw new Error(error.message);

    const receiptId = (data as { receipt_id?: string } | null)?.receipt_id || null;

    await fireAuditLog({
      action: "CREATE",
      tableName: "receipts",
      recordId: receiptId || input.itemId,
      description: `Bán vật tư: ${input.quantity} x ${input.itemName || input.itemId}`,
      newData: {
        ...input,
        receipt_amount: receiptAmount,
        receipt_id: receiptId,
      },
      source: "server_action",
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${input.itemId}`);
    revalidatePath("/finance");
    revalidatePath("/finance/receipts");
    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return { receipt_id: receiptId, receipt_amount: receiptAmount };
  });
}

export async function createInventoryContractAddonSale(rawData: unknown) {
  const parsed = inventoryContractAddonSaleSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message || "Dữ liệu bán thêm hợp đồng không hợp lệ",
    };
  }

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const input = parsed.data;
    const totalAmount = input.quantity * input.saleUnitPrice;
    const noteLines = [
      `Bán thêm vật tư: ${input.itemName || input.itemId}`,
      normalizeOptionalText(input.notes) || "",
    ].filter(Boolean);

    await checkPeriodLock(supabase, input.receiptDate);

    const { data, error } = await supabase.rpc("create_contract_inventory_addon_sale_atomic", {
      p_contract_id: input.contractId,
      p_item_id: input.itemId,
      p_quantity: input.quantity,
      p_sale_unit_price: input.saleUnitPrice,
      p_payment_method: input.paymentMethod,
      p_payment_date: input.receiptDate,
      p_notes: noteLines.join("\n"),
      p_user_id: userId,
    });

    if (error && isMissingRpcError(error)) {
      throw new Error("Migration create_contract_inventory_addon_sale_atomic chưa được chạy. Vui lòng push migration trước khi bán thêm vật tư cho hợp đồng.");
    }
    if (error) throw new Error(error.message);

    const result = (data || {}) as {
      payment_id?: string;
      receipt_code?: string | null;
      contract_item_id?: string | null;
      current_stock?: number;
    };

    await fireAuditLog({
      action: "CREATE",
      tableName: "payments",
      recordId: result.payment_id || input.contractId,
      description: `Bán thêm vật tư cho HĐ: ${input.quantity} x ${input.itemName || input.itemId}`,
      newData: {
        ...input,
        total_amount: totalAmount,
        payment_id: result.payment_id || null,
        receipt_code: result.receipt_code || null,
        contract_item_id: result.contract_item_id || null,
      },
      source: "server_action",
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${input.itemId}`);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
    revalidatePath("/finance");
    revalidatePath("/finance/receipts");
    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return {
      payment_id: result.payment_id || null,
      receipt_code: result.receipt_code || null,
      contract_item_id: result.contract_item_id || null,
      receipt_amount: totalAmount,
      current_stock: result.current_stock,
    };
  });
}

/**
 * Add a fulfillment transaction (phát sinh) to an existing transaction order.
 */
export async function addFulfillmentTransaction(input: {
  parentTxnId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  paymentMethod: "cash" | "transfer" | "card";
}) {
  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const paymentDate = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase.rpc("add_fulfillment_transaction_atomic", {
      p_parent_txn_id: input.parentTxnId,
      p_new_item_id: input.itemId,
      p_quantity: input.quantity,
      p_sale_unit_price: input.unitCost,
      // cột enum payment_method_enum chỉ có tien_mat/chuyen_khoan — quy về 2 nhóm
      p_payment_method: input.paymentMethod === "cash" ? "tien_mat" : "chuyen_khoan",
      p_payment_date: paymentDate,
      p_user_id: userId,
    });

    if (error && isMissingRpcError(error)) {
      throw new Error(
        "Migration add_fulfillment_transaction_atomic chưa được chạy. Vui lòng push migration trước khi bổ sung."
      );
    }

    if (error) {
      throw new Error(error.message);
    }

    // Revalidate paths
    revalidatePath("/inventory");
    revalidatePath(`/inventory/${input.itemId}`);
    revalidatePath("/contracts");
    revalidatePath("/finance");
    revalidatePath("/finance/receipts");

    return { success: true, transaction: data };
  });
}

/**
 * Delete an inventory transaction (WARNING: destructive action)
 * Only manual transactions (stock_in/stock_out without source) can be deleted.
 */
export async function deleteInventoryTransaction(transactionId: string) {
  const parsedId = uuidSchema.safeParse(transactionId);
  if (!parsedId.success) {
    return { success: false as const, error: parsedId.error.issues[0]?.message };
  }

  return withInventoryAccess(async (supabase: SupabaseClient<Database>, userId) => {
    // Fetch transaction details
    const { data: txn, error: fetchError } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("id", parsedId.data)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Không thể kiểm tra giao dịch: ${fetchError.message}`);
    }
    if (!txn) {
      throw new Error("Giao dịch không tồn tại");
    }

    // Only allow deleting manual transactions (no source_type or source_type is null)
    // Transactions from receipts/contracts cannot be deleted
    if (txn.source_type && txn.source_type !== 'manual') {
      throw new Error(
        "Không thể xóa giao dịch từ hệ thống (phiếu thu, hợp đồng). Hãy xóa phiếu/hợp đồng gốc."
      );
    }

    // Check for child fulfillments
    const { count: childCount, error: childError } = await supabase
      .from("inventory_transactions")
      .select("id", { count: "exact", head: true })
      .eq("parent_transaction_id", parsedId.data);

    if (childError) {
      throw new Error(`Không thể kiểm tra giao dịch con: ${childError.message}`);
    }
    if ((childCount || 0) > 0) {
      throw new Error("Không thể xóa giao dịch có phát sinh con. Hãy xóa các phát sinh trước.");
    }

    // Delete transaction
    const { error: deleteError } = await supabase
      .from("inventory_transactions")
      .delete()
      .eq("id", parsedId.data);

    if (deleteError) {
      throw new Error(`Không thể xóa giao dịch: ${deleteError.message}`);
    }

    // Update inventory item stock
    // Note: This is a simplified approach. Ideally we should recalculate from all transactions.
    const adjustmentQty = txn.transaction_type === "stock_in" ? -txn.quantity : txn.quantity;

    // Fetch current stock first
    const { data: itemData } = await supabase
      .from("inventory_items")
      .select("current_stock, name")
      .eq("id", txn.item_id)
      .single();

    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({
        current_stock: (itemData?.current_stock || 0) + adjustmentQty,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", txn.item_id);

    if (updateError) {
      throw new Error(`Không thể cập nhật tồn kho: ${updateError.message}`);
    }

    await fireAuditLog({
      action: "DELETE",
      tableName: "inventory_transactions",
      recordId: parsedId.data,
      oldData: txn,
      description: `Xóa giao dịch kho: ${itemData?.name || txn.item_id}`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidatePath("/inventory");
    revalidatePath(`/inventory/${txn.item_id}`);
    return { id: parsedId.data };
  });
}

/** Payload của yêu cầu sửa phát sinh — lưu jsonb nên phải tự khai kiểu khi đọc lại. */
type FulfillmentUpdatePayload = { quantity?: number; sale_unit_price?: number };

const approvalRequestSchema = z.object({
  target_id: z.string().uuid(),
  action_type: z.enum(["delete_fulfillment", "update_fulfillment"]),
  payload: z.any().optional(),
  reason: z.string().min(1, "Vui lòng nhập lý do"),
});

export async function requestFulfillmentAction(input: z.infer<typeof approvalRequestSchema>) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { role } = await requireInventoryAccess(supabase, userId);
    
    // If Admin/Manager -> execute directly
    if (role === "admin" || role === "manager") {
      if (input.action_type === "delete_fulfillment") {
        const { error } = await supabase.rpc("delete_fulfillment_transaction_atomic", {
          p_txn_id: input.target_id,
          p_user_id: userId
        });
        if (error) throw new Error(`Lỗi xoá phát sinh: ${error.message}`);
      } else {
        const payload = (input.payload ?? {}) as FulfillmentUpdatePayload;
        if (payload.quantity == null || payload.sale_unit_price == null) {
          throw new Error("Thiếu số lượng / đơn giá để sửa phát sinh.");
        }
        const { error } = await supabase.rpc("update_fulfillment_transaction_atomic", {
          p_txn_id: input.target_id,
          p_new_quantity: payload.quantity,
          p_new_unit_price: payload.sale_unit_price,
          p_user_id: userId
        });
        if (error) throw new Error(`Lỗi sửa phát sinh: ${error.message}`);
      }
      
      await fireAuditLog({
        action: "UPDATE",
        tableName: "inventory_transactions",
        recordId: input.target_id,
        newData: { action: input.action_type, by: "admin_direct" },
        description: `Direct action ${input.action_type} on fulfillment ${input.target_id}`,
        severity: "WARNING",
        source: "server_action",
      });

      revalidatePath("/inventory");
      return { success: true, direct: true };
    }

    // If Sale/Staff -> create approval request
    const { error } = await supabase.from("approval_requests").insert({
      module: "inventory",
      action_type: input.action_type,
      target_id: input.target_id,
      payload: input.payload,
      reason: input.reason,
      status: "pending",
      requested_by: userId,
    });

    if (error) throw new Error(`Lỗi tạo yêu cầu duyệt: ${error.message}`);

    await fireAuditLog({
      action: "CREATE",
      tableName: "approval_requests",
      recordId: input.target_id,
      newData: { target: input.target_id, action: input.action_type },
      description: `Yêu cầu duyệt ${input.action_type} cho phiếu ${input.target_id}`,
      severity: "INFO",
      source: "server_action",
    });

    revalidatePath("/inventory");
    return { success: true, direct: false };
  });
}

export async function approveFulfillmentRequest(requestId: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { role } = await requireInventoryAccess(supabase, userId);
    
    if (role !== "admin" && role !== "manager") {
      throw new Error("Chỉ Quản lý mới có quyền duyệt yêu cầu");
    }

    const { data: request, error: reqError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqError || !request) throw new Error("Không tìm thấy yêu cầu");
    if (request.status !== "pending") throw new Error("Yêu cầu này đã được xử lý");

    if (request.action_type === "delete_fulfillment") {
      const { error } = await supabase.rpc("delete_fulfillment_transaction_atomic", {
        p_txn_id: request.target_id,
        p_user_id: userId
      });
      if (error) throw new Error(`Lỗi duyệt xoá phát sinh: ${error.message}`);
    } else if (request.action_type === "update_fulfillment") {
      const payload = (request.payload ?? {}) as FulfillmentUpdatePayload;
      if (payload.quantity == null || payload.sale_unit_price == null) {
        throw new Error("Yêu cầu thiếu số lượng / đơn giá, không duyệt được.");
      }
      const { error } = await supabase.rpc("update_fulfillment_transaction_atomic", {
        p_txn_id: request.target_id,
        p_new_quantity: payload.quantity,
        p_new_unit_price: payload.sale_unit_price,
        p_user_id: userId
      });
      if (error) throw new Error(`Lỗi duyệt sửa phát sinh: ${error.message}`);
    }

    const { error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: "approved",
        reviewed_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (updateError) throw new Error(`Lỗi cập nhật trạng thái đơn: ${updateError.message}`);

    await fireAuditLog({
      action: "UPDATE",
      tableName: "approval_requests",
      recordId: requestId,
      newData: { status: "approved" },
      description: `Đã duyệt yêu cầu ${request.action_type} cho phiếu ${request.target_id}`,
      severity: "WARNING",
      source: "server_action",
    });

    // Notify requester
    if (request.requested_by) {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", request.requested_by)
        .single();

      if (employee?.id) {
        await supabase.from("notification_queue").insert({
          employee_id: employee.id,
          type: "system_alerts",
          title: "Yêu cầu đã được duyệt",
          content: `Yêu cầu ${request.action_type === 'delete_fulfillment' ? 'xoá' : 'sửa'} phát sinh #${request.target_id.slice(0, 8)} đã được duyệt.`,
          status: "pending",
          resource_type: "inventory_approval",
          resource_id: requestId,
        });
      }
    }

    revalidatePath("/inventory");
    return { success: true };
  });
}

export async function rejectFulfillmentRequest(requestId: string, reviewNotes: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    const { role } = await requireInventoryAccess(supabase, userId);
    
    if (role !== "admin" && role !== "manager") {
      throw new Error("Chỉ Quản lý mới có quyền duyệt yêu cầu");
    }

    const { data: request, error: reqError } = await supabase
      .from("approval_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqError || !request) throw new Error("Không tìm thấy yêu cầu");

    const { error: updateError } = await supabase
      .from("approval_requests")
      .update({
        status: "rejected",
        reviewed_by: userId,
        review_notes: reviewNotes,
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId);

    if (updateError) throw new Error(`Lỗi từ chối đơn: ${updateError.message}`);

    // Notify requester
    if (request.requested_by) {
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("auth_user_id", request.requested_by)
        .single();

      if (employee?.id) {
        await supabase.from("notification_queue").insert({
          employee_id: employee.id,
          type: "system_alerts",
          title: "Yêu cầu bị từ chối",
          content: `Yêu cầu ${request.action_type === 'delete_fulfillment' ? 'xoá' : 'sửa'} phát sinh #${request.target_id.slice(0, 8)} đã bị từ chối với lý do: "${reviewNotes}".`,
          status: "pending",
          resource_type: "inventory_approval",
          resource_id: requestId,
        });
      }
    }

    revalidatePath("/inventory");
    return { success: true };
  });
}
