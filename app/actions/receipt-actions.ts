"use server";

import { withAdmin } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { checkPeriodLock, isMissingRpcError } from "@/lib/finance-utils";
import { createReceiptSchema, updateReceiptWithLockSchema } from "@/lib/validations/finance.schema";
import { formatVnd } from "@/lib/utils";
import { z } from "zod";
// ═══════════════════════════════════════════
// Receipt Actions — CRUD + Sale Receipt (Atomic)
// Phase 02 Hardened
// ═══════════════════════════════════════════

function getReceiptStatus(type: string): string {
  if (type === "other_income") return "pending";
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
  sale_unit_price: number;
  unit_cost?: number;
}

// ─── DELETE RECEIPT ───────────────────────────

export async function deleteReceipt(id: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    if (id.startsWith("payment:")) {
      throw new Error("Phieu thu hop dong duoc tao tu thanh toan hop dong. Vui long xu ly tu chi tiet hop dong.");
    }

    const { data: receipt } = await supabase
      .from("receipts")
      .select("receipt_amount, contract_id, contract_code, receipt_date, receipt_type")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (receipt?.contract_id) {
      throw new Error("Khong the xoa phieu thu hop dong trong danh sach receipts. Vui long xu ly thanh toan tu chi tiet hop dong.");
    }

    if (!receipt) throw new Error("Không tìm thấy phiếu thu");

    await checkPeriodLock(supabase, receipt.receipt_date);

    const { error } = await supabase
      .from("receipts")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("deleted_at", null);
      
    if (error) throw new Error(`Lỗi xóa phiếu thu: ${error.message}`);

    await writeAuditLog({ 
      action: "DELETE", 
      tableName: "receipts", 
      recordId: id, 
      oldData: receipt as unknown as Record<string, unknown>, 
      description: `Xóa phiếu thu #${id.substring(0, 8)}`,
      source: "server_action",
    });
    
    revalidatePath("/finance");
    if (receipt.receipt_type === "sale_receipt") {
      revalidatePath("/inventory");
      revalidatePath("/reports");
    }
    return null;
  });
}

// ─── CREATE RECEIPT ──────────────────────────

export async function createReceipt(input: CreateReceiptInput) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    // 1. Validate
    const parsed = createReceiptSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    // 2. Lock check
    await checkPeriodLock(supabase, parsed.data.receipt_date);

    const isContractType =
      parsed.data.receipt_type === "contract_payment" || parsed.data.receipt_type === "contract_deposit";

    if (isContractType && !parsed.data.contract_id) {
      throw new Error("Thu hop dong bat buoc phai chon hop dong.");
    }

    if (isContractType) {
      if (parsed.data.payment_type !== "tien_mat" && parsed.data.payment_type !== "chuyen_khoan") {
        throw new Error("Thu hop dong chi ho tro tien mat hoac chuyen khoan.");
      }

      const { createPaymentReceipt } = await import("./payment-actions");
      const result = await createPaymentReceipt({
        contractId: parsed.data.contract_id!,
        amount: parsed.data.receipt_amount,
        paymentDate: parsed.data.receipt_date,
        paymentMethod: parsed.data.payment_type,
        paymentStage: parsed.data.receipt_type === "contract_deposit" ? "coc" : "thanh_toan",
        categoryId: parsed.data.category_id || null,
        notes: parsed.data.notes || null,
        paymentPlanId: null,
        updateTotal: false,
      });

      if (!result.success) {
        throw new Error(result.error || "Khong the tao thanh toan hop dong.");
      }

      return result.data;
    }

    if (parsed.data.contract_id) {
      throw new Error("Gan hop dong chi duoc tao qua loai thu hop dong hoac coc hop dong.");
    }

    const status = getReceiptStatus(parsed.data.receipt_type);

    const insertData = {
      receipt_date: parsed.data.receipt_date,
      receipt_type: parsed.data.receipt_type,
      payment_type: parsed.data.payment_type,
      contract_id: null,
      contract_code: null,
      receipt_amount: parsed.data.receipt_amount,
      previous_paid: 0,
      total_amount: 0,
      remaining_amount: 0,
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
      description: `Tạo phiếu thu ${formatVnd(parsed.data.receipt_amount)}`,
      source: "server_action",
    });
    
    revalidatePath("/finance");
    return null;
  });
}

// ─── UPDATE RECEIPT ──────────────────────────

export async function updateReceipt(input: z.infer<typeof updateReceiptWithLockSchema>) {
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    if (String(input.id || "").startsWith("payment:")) {
      throw new Error("Phieu thu hop dong duoc tao tu thanh toan hop dong. Vui long xu ly tu chi tiet hop dong.");
    }

    // 1. Validate
    const parsed = updateReceiptWithLockSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    const data = parsed.data;

    // 2. Fetch current & check optimistic lock
    const { data: currentReceipt, error: fetchError } = await supabase
      .from("receipts")
      .select("receipt_date, receipt_type, updated_at, contract_id")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !currentReceipt) throw new Error("Không tìm thấy phiếu thu hoặc phiếu thu đã bị xóa.");
    if (currentReceipt.receipt_type === "sale_receipt") {
      throw new Error("Phiếu bán vật tư phải được xử lý từ luồng kho để giữ khớp giá bán, tồn kho và giá vốn.");
    }

    if (currentReceipt.updated_at && data.updated_at && currentReceipt.updated_at !== data.updated_at) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng làm mới trang và thử lại.");
    }

    if (data.contract_id && (!currentReceipt.contract_id || data.contract_id !== currentReceipt.contract_id)) {
      throw new Error("Khong the gan hop dong truc tiep vao receipts. Vui long tao thanh toan tu hop dong.");
    }

    // 3. Check locks on dates
    await checkPeriodLock(supabase, currentReceipt.receipt_date);
    if (data.receipt_date && data.receipt_date !== currentReceipt.receipt_date) {
      await checkPeriodLock(supabase, data.receipt_date);
    }

    // 4. Determine status
    let status = undefined;
    if (data.receipt_type) {
      status = getReceiptStatus(data.receipt_type);
    }

    // Prepare update payload
    const updatePayload: Database["public"]["Tables"]["receipts"]["Update"] = {
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    if (data.receipt_date) updatePayload.receipt_date = data.receipt_date;
    if (data.receipt_type) updatePayload.receipt_type = data.receipt_type;
    if (data.payment_type) updatePayload.payment_type = data.payment_type;
    if (data.receipt_amount !== undefined) updatePayload.receipt_amount = data.receipt_amount;
    if (data.notes !== undefined) updatePayload.notes = data.notes || "";
    if (data.category_id !== undefined) updatePayload.category_id = data.category_id || null;
    if (data.category_name !== undefined) updatePayload.category_name = data.category_name || "";
    if (status) updatePayload.status = status;
    
    if (data.contract_id !== undefined && currentReceipt.contract_id) updatePayload.contract_id = data.contract_id || null;

    let query = supabase.from("receipts").update(updatePayload).eq("id", data.id);
    if (currentReceipt.updated_at) {
      query = query.eq("updated_at", currentReceipt.updated_at);
    } else {
      query = query.is("updated_at", null);
    }

    const { data: updatedRows, error: updateError } = await query.select("id");

    if (updateError) throw new Error(`Lỗi cập nhật phiếu thu: ${updateError.message}`);
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác. Vui lòng làm mới trang và thử lại.");
    }

    await writeAuditLog({ 
      action: "UPDATE", 
      tableName: "receipts", 
      recordId: data.id,
      oldData: currentReceipt as unknown as Record<string, unknown>,
      newData: updatePayload,
      description: `Cập nhật phiếu thu #${data.id.substring(0, 8)}`,
      source: "server_action",
    });
    
    revalidatePath("/finance");
    return { success: true };
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
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    if (!input.receipt_amount || input.receipt_amount <= 0) throw new Error("Số tiền thu phải lớn hơn 0");
    if (!input.sale_items || input.sale_items.length === 0) throw new Error("Vui lòng thêm ít nhất 1 vật tư");
    
    for (const item of input.sale_items) {
      if (!item.item_id) throw new Error("Có vật tư chưa được chọn");
      if (!item.quantity || item.quantity <= 0) throw new Error(`${item.item_name}: Số lượng phải lớn hơn 0`);
      const saleUnitPrice = item.sale_unit_price ?? item.unit_cost ?? 0;
      if (saleUnitPrice <= 0) throw new Error(`${item.item_name}: Giá bán phải lớn hơn 0`);
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
        created_by: userId,
      },
      p_items: input.sale_items.map((i) => ({ 
        item_id: i.item_id, 
        item_name: i.item_name, 
        quantity: i.quantity, 
        sale_unit_price: i.sale_unit_price ?? i.unit_cost ?? 0,
        unit_cost: i.sale_unit_price ?? i.unit_cost ?? 0 
      })),
    });

    if (error && isMissingRpcError(error)) {
      throw new Error("Migration create_sale_receipt_atomic chua duoc chay. Vui long chay migration truoc khi tao phieu ban vat tu.");
    }
    
    if (error) throw new Error(error.message);

    const receiptId = (data as { receipt_id: string }).receipt_id;
    
    await writeAuditLog({ 
      action: "CREATE", 
      tableName: "receipts", 
      recordId: receiptId, 
      newData: input as unknown as Record<string, unknown>,
      source: "server_action",
      description: `Bán vật tư ${formatVnd(input.receipt_amount)}` 
    });
    
    revalidatePath("/finance");
    revalidatePath("/finance/receipts");
    revalidatePath("/inventory");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { receipt_id: receiptId };
  });
}
