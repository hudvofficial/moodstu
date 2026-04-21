"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { isMissingRpcError, checkPeriodLock } from "@/lib/finance-utils";
import { createPaymentSchema } from "@/lib/validations/finance.schema";

// ═══════════════════════════════════════════
// Payment Actions — Create receipt + update contract
// Phase 04B / Phase 02 Hardened
// ═══════════════════════════════════════════

interface CreatePaymentInput {
  contractId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "tien_mat" | "chuyen_khoan";
  paymentStage?: string | null;
  categoryId?: string | null;
  notes?: string | null;
  paymentPlanId?: string | null;
  updateTotal: boolean; // If true → increase contract total (phát sinh)
}

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];
type PaymentResult = { payment_id: string; new_paid: number; new_remaining: number; payment_status: string };

async function processContractPaymentFallback(
  supabase: AdminSupabase,
  userId: string,
  input: CreatePaymentInput,
): Promise<PaymentResult> {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("total_amount, paid_amount")
    .eq("id", input.contractId)
    .single();

  if (contractError || !contract) throw new Error(`Khong tim thay hop dong: ${contractError?.message || ""}`);

  const totalAmount = (contract.total_amount || 0) + (input.updateTotal ? input.amount : 0);
  const newPaid = (contract.paid_amount || 0) + input.amount;
  const newRemaining = Math.max(0, totalAmount - newPaid);
  const paymentStatus = newRemaining <= 0 ? "da_thanh_toan" : "thanh_toan_mot_phan";

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      contract_id: input.contractId,
      amount: input.amount,
      payment_method: input.paymentMethod,
      payment_date: input.paymentDate,
      payment_stage: input.paymentStage || null,
      category_id: input.categoryId || null,
      notes: input.notes || null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (paymentError || !payment) throw new Error(`Khong the tao phieu thu hop dong: ${paymentError?.message || ""}`);

  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      total_amount: totalAmount,
      paid_amount: newPaid,
      remaining_amount: newRemaining,
      payment_status: paymentStatus,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.contractId);

  if (updateError) throw new Error(`Khong the cap nhat cong no hop dong: ${updateError.message}`);

  if (input.paymentPlanId) {
    const { error: planError } = await supabase
      .from("payment_plans")
      .update({ status: "paid", receipt_id: payment.id })
      .eq("id", input.paymentPlanId)
      .eq("contract_id", input.contractId);
    if (planError) throw new Error(`Khong the cap nhat dot thanh toan: ${planError.message}`);
  }

  return {
    payment_id: payment.id,
    new_paid: newPaid,
    new_remaining: newRemaining,
    payment_status: paymentStatus,
  };
}

/** Create payment receipt + atomically update contract amounts (Atomic RPC) */
export async function createPaymentReceipt(input: CreatePaymentInput) {
  // W2: Zod validation
  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  const paymentInput = parsed.data;

  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);
    // W3: Period lock — TRƯỚC mutation (audit fix)
    await checkPeriodLock(supabase, paymentInput.paymentDate);

    // Single atomic RPC: lock contract → insert payment → update totals
    const { data, error } = await supabase.rpc("process_contract_payment_v2", {
      p_contract_id: paymentInput.contractId,
      p_amount: paymentInput.amount,
      p_payment_method: paymentInput.paymentMethod,
      p_payment_date: paymentInput.paymentDate,
      p_payment_stage: paymentInput.paymentStage || null,
      p_category_id: paymentInput.categoryId || null,
      p_notes: paymentInput.notes || null,
      p_payment_plan_id: paymentInput.paymentPlanId || null,
      p_update_total: paymentInput.updateTotal,
      p_created_by: userId,
    });

    if (error && isMissingRpcError(error)) {
      const fallbackResult = await processContractPaymentFallback(supabase, userId, paymentInput);
      await writeAuditLog({
        action: "CREATE",
        tableName: "payments",
        recordId: fallbackResult.payment_id,
        newData: paymentInput as unknown as Record<string, unknown>,
        source: "server_action",
        description: `Thu tien hop dong #${paymentInput.contractId.substring(0, 8)}: ${paymentInput.amount.toLocaleString("vi-VN")} VND`,
      });

      revalidatePath("/contracts");
      revalidatePath(`/contracts/${paymentInput.contractId}`);
      revalidatePath("/finance");

      return { paymentId: fallbackResult.payment_id };
    }

    if (error) throw new Error(`Lỗi thanh toán: ${error.message}`);

    const result = data as { payment_id: string; new_paid: number; new_remaining: number; payment_status: string };

    // Audit log
    await writeAuditLog({
      action: "CREATE",
      tableName: "payments",
      recordId: result.payment_id,
      newData: paymentInput as unknown as Record<string, unknown>,
      source: "server_action",
      description: `Thu tiền hợp đồng #${paymentInput.contractId.substring(0, 8)}: ${paymentInput.amount.toLocaleString("vi-VN")} VND`,
    });

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${paymentInput.contractId}`);
    revalidatePath("/finance");

    return { paymentId: result.payment_id };
  });
}

/** Get transaction categories for receipt form */
export async function getTransactionCategories(type: "thu" | "chi" = "thu") {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("transaction_categories")
      .select("id, name, type")
      .eq("type", type)
      .order("name");

    if (error) throw new Error(`Lỗi lấy danh mục: ${error.message}`);
    return data || [];
  });
}
