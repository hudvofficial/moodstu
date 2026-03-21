"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Receipt Actions — CRUD + Sale Receipt (Atomic)
// V1 ref: finance.ts (receipt fns)
// V2: withAuth + fireAuditLog
// ═══════════════════════════════════════════

function getReceiptStatus(type: string): string {
  if (type === "Thu khác") return "pending";
  return "confirmed";
}

// ─── TYPES ────────────────────────────────────

interface CreateReceiptInput {
  receipt_date: string;
  receipt_type: string;
  payment_type: string;
  contract_id?: string;
  contract_code?: string;
  receipt_amount: number;
  previous_paid?: number;
  total_amount?: number;
  notes?: string;
  category_id?: string;
  category_name?: string;
}

export interface SaleItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit_cost: number;
}

// ─── DELETE RECEIPT ───────────────────────────

export async function deleteReceipt(id: string) {
  return withAuth(async (supabase) => {
    const { data: receipt } = await supabase
      .from("receipts")
      .select("receipt_amount, contract_id, contract_code, receipt_date")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa phiếu thu: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "receipts", recordId: id, oldData: receipt ?? undefined, description: `Xóa phiếu thu #${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/finance/receipts");
    revalidatePath("/finance");
    return null;
  });
}

// ─── CREATE RECEIPT ──────────────────────────

export async function createReceipt(input: CreateReceiptInput) {
  return withAuth(async (supabase) => {
    if (!input.receipt_amount || input.receipt_amount <= 0) throw new Error("Số tiền thu phải lớn hơn 0");

    const status = getReceiptStatus(input.receipt_type);
    const totalAmount = input.total_amount || 0;
    const previousPaid = input.previous_paid || 0;
    const remaining = Math.max(0, totalAmount - previousPaid - input.receipt_amount);

    const { error } = await supabase.from("receipts").insert({
      receipt_date: input.receipt_date,
      receipt_type: input.receipt_type,
      payment_type: input.payment_type,
      contract_id: input.contract_id || null,
      contract_code: input.contract_code || null,
      receipt_amount: input.receipt_amount,
      previous_paid: previousPaid,
      total_amount: totalAmount,
      remaining_amount: remaining,
      notes: input.notes || "",
      status,
      category_id: input.category_id || null,
      category_name: input.category_name || "",
    });
    if (error) throw new Error(`Lỗi tạo phiếu thu: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "receipts", description: `Tạo phiếu thu ${input.receipt_amount.toLocaleString("vi-VN")}₫${input.contract_code ? ` [${input.contract_code}]` : ""}` });
    revalidatePath("/finance/receipts");
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
  return withAuth(async (supabase) => {
    if (!input.receipt_amount || input.receipt_amount <= 0) throw new Error("Số tiền thu phải lớn hơn 0");
    if (!input.sale_items || input.sale_items.length === 0) throw new Error("Vui lòng thêm ít nhất 1 vật tư");
    for (const item of input.sale_items) {
      if (!item.item_id) throw new Error("Có vật tư chưa được chọn");
      if (!item.quantity || item.quantity <= 0) throw new Error(`${item.item_name}: Số lượng phải lớn hơn 0`);
    }

    const { data, error } = await supabase.rpc("create_sale_receipt_atomic", {
      p_receipt: {
        receipt_date: input.receipt_date, receipt_type: input.receipt_type, payment_type: input.payment_type,
        receipt_amount: input.receipt_amount, notes: input.notes || "",
        category_id: input.category_id || "", category_name: input.category_name || "",
        customer_name: input.customer_name?.trim() || "", customer_phone: input.customer_phone?.trim() || "",
      },
      p_items: input.sale_items.map((i) => ({ item_id: i.item_id, item_name: i.item_name, quantity: i.quantity, unit_cost: i.unit_cost || 0 })),
    });
    if (error) throw new Error(error.message);

    const receiptId = (data as { receipt_id: string }).receipt_id;
    fireAuditLog({ action: "CREATE", tableName: "receipts", recordId: receiptId, description: `Bán vật tư ${input.receipt_amount.toLocaleString("vi-VN")}₫` });
    revalidatePath("/finance/receipts");
    revalidatePath("/inventory");
    return { receipt_id: receiptId };
  });
}
