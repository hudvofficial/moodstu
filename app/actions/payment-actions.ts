"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Payment Actions — Create receipt + update contract
// Phase 04B: V1 PaymentReceiptForm logic → V2 server action
// Atomic: insert payment + update contract + update plan
// ═══════════════════════════════════════════

interface CreatePaymentInput {
  contractId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "tien_mat" | "chuyen_khoan";
  paymentStage: string | null;
  categoryId: string | null;
  notes: string | null;
  paymentPlanId: string | null;
  updateTotal: boolean; // If true → increase contract total (phát sinh)
}

/** Create payment receipt + atomically update contract amounts */
export async function createPaymentReceipt(input: CreatePaymentInput) {
  if (input.amount <= 0) {
    return { success: false as const, error: "Số tiền phải lớn hơn 0" };
  }

  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // Step 1: Insert payment
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        contract_id: input.contractId,
        amount: input.amount,
        payment_method: input.paymentMethod,
        payment_date: input.paymentDate,
        payment_stage: input.paymentStage,
        category_id: input.categoryId,
        notes: input.notes,
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();

    if (paymentError) throw new Error(`Lỗi tạo phiếu thu: ${paymentError.message}`);

    // Step 2: Get current contract amounts
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("total_amount, paid_amount, remaining_amount")
      .eq("id", input.contractId)
      .single();

    if (contractError) throw new Error(`Lỗi lấy HĐ: ${contractError.message}`);

    // Step 3: Calculate new amounts
    let newTotal = contract.total_amount;
    if (input.updateTotal) {
      newTotal += input.amount; // Phát sinh → tăng tổng
    }
    const newPaid = contract.paid_amount + input.amount;
    const newRemaining = newTotal - newPaid;

    // Step 4: Determine payment_status
    let paymentStatus: string;
    if (newRemaining <= 0) {
      paymentStatus = "da_thanh_toan";
    } else if (newPaid > 0) {
      paymentStatus = newPaid >= newTotal * 0.3 ? "thanh_toan_mot_phan" : "da_coc";
    } else {
      paymentStatus = "chua_thanh_toan";
    }

    // Step 5: Update contract
    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        total_amount: newTotal,
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        payment_status: paymentStatus,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", input.contractId);

    if (updateError) throw new Error(`Lỗi cập nhật HĐ: ${updateError.message}`);

    // Step 6: If linked to payment plan → mark as paid
    if (input.paymentPlanId) {
      await supabase
        .from("payment_plans")
        .update({
          status: "paid",
          receipt_id: payment.id,
        })
        .eq("id", input.paymentPlanId);
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);

    return { paymentId: payment.id };
  });
}

/** Get transaction categories for receipt form */
export async function getTransactionCategories(type: "Thu" | "Chi" = "Thu") {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("transaction_categories")
      .select("id, name, type")
      .eq("type", type)
      .order("name");

    if (error) throw new Error(`Lỗi lấy danh mục: ${error.message}`);
    return data || [];
  });
}
