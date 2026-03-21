"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Debt + Credit Card Actions
// V1 ref: debts.ts + creditCards.ts
// V2: withAuth + fireAuditLog (V1 debts lacked audit!)
// ═══════════════════════════════════════════

// ─── TYPES ────────────────────────────────────

interface DebtInput {
  debt_name: string;
  debt_type: string;
  debtor?: string | null;
  creditor?: string | null;
  debt_amount: number;
  debt_date: string;
  due_date?: string | null;
  payment_date?: string | null;
  status: string;
  notes?: string | null;
  installment_total?: number | null;
  installment_paid?: number | null;
  installment_amount?: number | null;
  platform?: string | null;
  card_id?: string | null;
  contract_id?: string | null;
}

interface CreditCardInput {
  bank_name: string;
  card_label?: string;
  last_4?: string;
  statement_day: number;
  due_day: number;
  due_next_month?: boolean;
  credit_limit?: number;
}

// ═══════════════════ DEBTS ═══════════════════

export async function createDebt(input: DebtInput) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("debts")
      .insert([{ ...input, debt_amount: Number(input.debt_amount), installment_amount: input.installment_amount ? Number(input.installment_amount) : null }])
      .select("id")
      .single();
    if (error) throw new Error(`Lỗi tạo công nợ: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "debts", recordId: data.id, description: `Tạo công nợ: ${input.debt_name}` });
    revalidatePath("/finance/debts");
    return { id: data.id };
  });
}

export async function updateDebt(id: string, input: Partial<DebtInput>) {
  return withAuth(async (supabase) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { ...input, updated_at: new Date().toISOString() };
    if (input.debt_amount !== undefined) updateData.debt_amount = Number(input.debt_amount);
    if (input.installment_amount !== undefined) updateData.installment_amount = input.installment_amount ? Number(input.installment_amount) : null;

    const { error } = await supabase.from("debts").update(updateData).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật công nợ: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "debts", recordId: id, description: `Cập nhật công nợ #${id.substring(0, 8)}` });
    revalidatePath("/finance/debts");
    return null;
  });
}

export async function deleteDebt(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa công nợ: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "debts", recordId: id, description: `Xóa công nợ #${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/finance/debts");
    return null;
  });
}

export async function markInstallmentPaid(id: string) {
  return withAuth(async (supabase) => {
    const { data: debt, error: fetchError } = await supabase
      .from("debts")
      .select("installment_paid, installment_total")
      .eq("id", id)
      .single();
    if (fetchError || !debt) throw new Error("Không tìm thấy công nợ");
    if (!debt.installment_total) throw new Error("Không phải khoản trả góp");

    const newPaid = (debt.installment_paid || 0) + 1;
    const isComplete = newPaid >= debt.installment_total;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { installment_paid: newPaid, updated_at: new Date().toISOString() };
    if (isComplete) { updateData.status = "Đã thanh toán"; updateData.payment_date = new Date().toISOString().split("T")[0]; }

    const { error } = await supabase.from("debts").update(updateData).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật trả góp: ${error.message}`);

    revalidatePath("/finance/debts");
    return { newPaid, isComplete };
  });
}

// ═══════════════ CREDIT CARDS ═══════════════

export async function createCreditCard(input: CreditCardInput) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.from("credit_cards").insert([input]).select("id").single();
    if (error) throw new Error(`Lỗi tạo thẻ tín dụng: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "credit_cards", recordId: data.id, description: `Thêm thẻ: ${input.bank_name}${input.last_4 ? ` *${input.last_4}` : ""}` });
    revalidatePath("/finance/debts");
    return { id: data.id };
  });
}

export async function updateCreditCard(id: string, input: Partial<CreditCardInput>) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("credit_cards").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật thẻ: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "credit_cards", recordId: id, description: `Cập nhật thẻ #${id.substring(0, 8)}` });
    revalidatePath("/finance/debts");
    return null;
  });
}

export async function deleteCreditCard(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("credit_cards").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa thẻ: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "credit_cards", recordId: id, description: `Xóa thẻ tín dụng #${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/finance/debts");
    return null;
  });
}
