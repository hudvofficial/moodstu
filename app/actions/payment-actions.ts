"use server";

import { requireContractDestructiveAccess, requirePaymentRecordAccess, withAuth } from "@/lib/auth_utils";
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

interface VoidPaymentInput {
  paymentId: string;
  reason: string;
}

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];

async function validatePaymentPlanAmount(
  supabase: AdminSupabase,
  input: CreatePaymentInput,
) {
  if (!input.paymentPlanId) return;

  const { data: plan, error } = await supabase
    .from("payment_plans")
    .select("id, status")
    .eq("id", input.paymentPlanId)
    .eq("contract_id", input.contractId)
    .single();

  if (error || !plan) throw new Error("Đợt thanh toán không hợp lệ");
  if (plan.status === "paid") throw new Error("Đợt thanh toán này đã được thu");
  if (plan.status === "cancelled") throw new Error("Đợt thanh toán này đã bị hủy");
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
    await requirePaymentRecordAccess(supabase, userId);
    // W3: Period lock — TRƯỚC mutation (audit fix)
    await checkPeriodLock(supabase, paymentInput.paymentDate);
    await validatePaymentPlanAmount(supabase, paymentInput);

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
      throw new Error("Migration process_contract_payment_v2 chưa được chạy. Không dùng fallback vì có thể làm sai công nợ/báo cáo.");
    }

    if (error) throw new Error(`Lỗi thanh toán: ${error.message}`);

    const result = data as {
      payment_id: string;
      receipt_code?: string;
      adjustment_item_id?: string | null;
      new_paid: number;
      new_remaining: number;
      payment_status: string;
    };

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
    revalidatePath("/finance/receipts");
    revalidatePath("/finance/cashflow");
    revalidatePath("/reports");

    return { paymentId: result.payment_id, receiptCode: result.receipt_code || null };
  });
}

/** Void a contract payment through an atomic DB reversal. */
export async function voidContractPayment(input: VoidPaymentInput) {
  const paymentId = input.paymentId?.trim();
  const reason = input.reason?.trim();

  if (!paymentId) {
    return { success: false as const, error: "Payment ID không hợp lệ" };
  }

  if (!reason || reason.length < 5) {
    return { success: false as const, error: "Lý do hủy phiếu thu phải có ít nhất 5 ký tự" };
  }

  return withAuth(async (supabase, userId) => {
    await requireContractDestructiveAccess(supabase, userId);

    const { data, error } = await supabase.rpc("void_contract_payment_v2", {
      p_payment_id: paymentId,
      p_reason: reason,
      p_actor_id: userId,
    });

    if (error && isMissingRpcError(error)) {
      throw new Error("Migration void_contract_payment_v2 chưa được chạy. Chưa thể hủy phiếu thu hợp đồng.");
    }

    if (error) throw new Error(`Không thể hủy phiếu thu: ${error.message}`);

    const result = data as {
      payment_id: string;
      contract_id: string;
      voided_amount: number;
      restored_payment_plans: number;
      new_paid: number;
      new_remaining: number;
      payment_status: string;
    };

    await writeAuditLog({
      action: "DELETE",
      tableName: "payments",
      recordId: result.payment_id,
      oldData: { payment_id: result.payment_id, amount: result.voided_amount },
      newData: { reason, ...result },
      source: "server_action",
      severity: "WARNING",
      description: `Huy phieu thu hop dong #${result.payment_id.substring(0, 8)}: ${Number(result.voided_amount || 0).toLocaleString("vi-VN")} VND`,
    });

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${result.contract_id}`);
    revalidatePath("/finance");
    revalidatePath("/finance/receipts");
    revalidatePath("/finance/cashflow");
    revalidatePath("/reports");

    return result;
  });
}

/** Get transaction categories for receipt form */
export async function getTransactionCategories(type: "thu" | "chi" = "thu") {
  return withAuth(async (supabase, userId) => {
    await requirePaymentRecordAccess(supabase, userId);

    const { data, error } = await supabase
      .from("transaction_categories")
      .select("id, name, type, category_code")
      .eq("type", type)
      .order("name");

    if (error) throw new Error(`Lỗi lấy danh mục: ${error.message}`);
    return data || [];
  });
}
