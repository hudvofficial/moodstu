"use server";

import { withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { checkPeriodLock, isMissingRpcError } from "@/lib/finance-utils";
import { createReceiptSchema } from "@/lib/validations/finance.schema";

// ═══════════════════════════════════════════
// Receipt Actions — CRUD + Sale Receipt (Atomic)
// Phase 02 Hardened
// ═══════════════════════════════════════════

function getReceiptStatus(type: string): string {
  if (type === "Thu khác") return "pending";
  return "confirmed";
}

export interface CreateReceiptInput {
  receipt_date: string;
  receipt_type: string;
  payment_type: string;
  contract_id?: string | null;
  contract_code?: string | null;
  receipt_amount: number;
  previous_paid?: number;
  total_amount?: number;
  notes?: string | null;
  category_id?: string | null;
  category_name?: string | null;
}

export interface SaleItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
}

// ─── DELETE RECEIPT ───────────────────────────

export async function deleteReceipt(id: string) {
  return withAdmin(async (supabase) => {
    const { data: receipt } = await supabase
      .from("receipts")
      .select("receipt_amount, contract_id, contract_code, receipt_date")
      .eq("id", id)
      .single();

    if (!receipt) throw new Error("Không tìm thấy phiếu thu");

    await checkPeriodLock(supabase, receipt.receipt_date);

    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa phiếu thu: ${error.message}`);

    await writeAuditLog({ 
      action: "DELETE", 
      tableName: "receipts", 
      recordId: id, 
      oldData: receipt as unknown as Record<string, unknown>, 
      description: `Xóa phiếu thu #${id.substring(0, 8)}` 
    });
    
    revalidatePath("/finance");
    return null;
  });
}

// ─── CREATE RECEIPT ──────────────────────────

export async function createReceipt(input: CreateReceiptInput) {
  return withAdmin(async (supabase) => {
    // 1. Validate
    const parsed = createReceiptSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    // 2. Lock check
    await checkPeriodLock(supabase, parsed.data.receipt_date);

    const status = getReceiptStatus(parsed.data.receipt_type);
    const totalAmount = input.total_amount || 0;
    const previousPaid = input.previous_paid || 0;
    const remaining = Math.max(0, totalAmount - previousPaid - parsed.data.receipt_amount);

    const insertData = {
      receipt_date: parsed.data.receipt_date,
      receipt_type: parsed.data.receipt_type,
      payment_type: parsed.data.payment_type,
      contract_id: parsed.data.contract_id || null,
      contract_code: input.contract_code || null,
      receipt_amount: parsed.data.receipt_amount,
      previous_paid: previousPaid,
      total_amount: totalAmount,
      remaining_amount: remaining,
      notes: parsed.data.notes || "",
      status,
      category_id: parsed.data.category_id || null,
      category_name: input.category_name || "",
    };

    const { data, error } = await supabase
      .from("receipts")
      .insert(insertData)
      .select("id")
      .single();
      
    if (error) throw new Error(`Lỗi tạo phiếu thu: ${error.message}`);

    await writeAuditLog({ 
      action: "CREATE", 
      tableName: "receipts", 
      recordId: data?.id,
      newData: insertData as unknown as Record<string, unknown>,
      description: `Tạo phiếu thu ${parsed.data.receipt_amount.toLocaleString("vi-VN")}₫${input.contract_code ? ` [${input.contract_code}]` : ""}` 
    });
    
    revalidatePath("/finance");
    return null;
  });
}

// ─── SALE RECEIPT (Atomic: receipt + inventory) ─

export async function createSaleReceipt(input: {
  receipt_date: string;
  receipt_type: string;
  payment_type: string;
  receipt_amount: number;
  notes?: string;
  category_id: string;
  category_name: string;
  sale_items: SaleItem[];
  customer_name?: string;
  customer_phone?: string;
}) {
  return withAdmin(async (supabase, userId) => {
    if (!input.receipt_amount || input.receipt_amount <= 0) throw new Error("Số tiền thu phải lớn hơn 0");
    if (!input.sale_items || input.sale_items.length === 0) throw new Error("Vui lòng thêm ít nhất 1 vật tư");
    
    for (const item of input.sale_items) {
      if (!item.item_id) throw new Error("Có vật tư chưa được chọn");
      if (!item.quantity || item.quantity <= 0) throw new Error(`${item.item_name}: Số lượng phải lớn hơn 0`);
    }

    await checkPeriodLock(supabase, input.receipt_date);

    const { data, error } = await supabase.rpc("create_sale_receipt_atomic", {
      p_receipt: {
        receipt_date: input.receipt_date, 
        receipt_type: input.receipt_type, 
        payment_type: input.payment_type,
        receipt_amount: input.receipt_amount, 
        notes: input.notes || "",
        category_id: input.category_id || "", 
        category_name: input.category_name || "",
        customer_name: input.customer_name?.trim() || "", 
        customer_phone: input.customer_phone?.trim() || "",
      },
      p_items: input.sale_items.map((i) => ({ 
        item_id: i.item_id, 
        item_name: i.item_name, 
        quantity: i.quantity, 
        unit_cost: i.unit_cost || 0 
      })),
    });

    if (error && isMissingRpcError(error)) {
      const { data: receipt, error: receiptError } = await supabase
        .from("receipts")
        .insert({
          receipt_date: input.receipt_date,
          receipt_type: input.receipt_type,
          payment_type: input.payment_type,
          receipt_amount: input.receipt_amount,
          notes: input.notes || "",
          category_id: input.category_id || null,
          category_name: input.category_name || "",
          customer_name: input.customer_name?.trim() || null,
          customer_phone: input.customer_phone?.trim() || null,
          status: getReceiptStatus(input.receipt_type),
        })
        .select("id")
        .single();

      if (receiptError || !receipt) throw new Error(`Khong the tao phieu thu ban vat tu: ${receiptError?.message || ""}`);

      for (const item of input.sale_items) {
        const { data: inventoryItem, error: itemError } = await supabase
          .from("inventory_items")
          .select("name, current_stock, average_unit_price")
          .eq("id", item.item_id)
          .is("deleted_at", null)
          .single();
        if (itemError || !inventoryItem) throw new Error(`Khong tim thay vat tu ${item.item_name}: ${itemError?.message || ""}`);
        if ((inventoryItem.current_stock || 0) < item.quantity) {
          throw new Error(`${inventoryItem.name} khong du ton kho. Con ${inventoryItem.current_stock || 0}.`);
        }

        const unitCost = item.unit_cost || inventoryItem.average_unit_price || 0;
        const { error: transactionError } = await supabase.from("inventory_transactions").insert({
          item_id: item.item_id,
          transaction_type: "stock_out",
          quantity: item.quantity,
          unit_cost: unitCost,
          total_cost: item.quantity * unitCost,
          reason: "Ban vat tu",
          customer_name: input.customer_name?.trim() || null,
          customer_phone: input.customer_phone?.trim() || null,
          notes: input.notes || null,
          performed_by: userId,
          created_by: userId,
        });
        if (transactionError) throw new Error(`Khong the ghi nhan xuat kho: ${transactionError.message}`);

        const { error: stockError } = await supabase
          .from("inventory_items")
          .update({
            current_stock: (inventoryItem.current_stock || 0) - item.quantity,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.item_id);
        if (stockError) throw new Error(`Khong the cap nhat ton kho: ${stockError.message}`);
      }

      await writeAuditLog({
        action: "CREATE",
        tableName: "receipts",
        recordId: receipt.id,
        newData: input as unknown as Record<string, unknown>,
        description: `Ban vat tu ${input.receipt_amount.toLocaleString("vi-VN")} VND`,
      });

      revalidatePath("/finance");
      revalidatePath("/dresses");
      return { receipt_id: receipt.id };
    }
    
    if (error) throw new Error(error.message);

    const receiptId = (data as { receipt_id: string }).receipt_id;
    
    await writeAuditLog({ 
      action: "CREATE", 
      tableName: "receipts", 
      recordId: receiptId, 
      newData: input as unknown as Record<string, unknown>,
      description: `Bán vật tư ${input.receipt_amount.toLocaleString("vi-VN")}₫` 
    });
    
    revalidatePath("/finance");
    revalidatePath("/dresses");
    return { receipt_id: receiptId };
  });
}
