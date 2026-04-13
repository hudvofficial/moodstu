"use server";

import { withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { createDebtSchema, updateDebtSchema } from "@/lib/validations/finance.schema";
import { checkPeriodLock } from "@/lib/finance-utils";

// ═══════════════════════════════════════════
// Debt + Credit Card Actions (Hardened V2)
// ═══════════════════════════════════════════

export interface DebtInput {
  entity_name: string;
  entity_type: "nha_cung_cap" | "khach_hang" | "nhan_vien" | "khac";
  type: "Phải thu" | "Phải trả";
  amount: number;
  due_date?: string | null;
  status?: "dang_no" | "da_thanh_toan";
  notes?: string | null;
  entity_id?: string | null;
  // Legacy / other fields if needed:
  payment_date?: string | null;
  debt_date?: string | null; // Keep for now in case of DB constraints
  installment_total?: number | null;
  installment_paid?: number | null;
  installment_amount?: number | null;
  platform?: string | null;
  card_id?: string | null;
  contract_id?: string | null;
}

export interface CreditCardInput {
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
  return withAdmin(async (supabase, userId) => {
    // 1. Zod validation
    const parsed = createDebtSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    // W3: Period lock check
    await checkPeriodLock(supabase, parsed.data.due_date || new Date().toISOString().split("T")[0]);

    const { data, error } = await supabase
      .from("debts")
      .insert({
        entity_name: parsed.data.entity_name,
        entity_type: parsed.data.entity_type,
        type: parsed.data.type,
        amount: parsed.data.amount,
        due_date: parsed.data.due_date || null,
        notes: parsed.data.notes || null,
        entity_id: parsed.data.entity_id || null,
        paid_amount: 0,
        remaining: parsed.data.amount,
        created_by: userId,
        status: parsed.data.status,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Lỗi tạo công nợ: ${error.message}`);

    // 2. Audit
    await writeAuditLog({
      action: "CREATE",
      tableName: "debts",
      recordId: data.id,
      newData: input as unknown as Record<string, unknown>,
      description: `Tạo công nợ ${input.type}: ${input.entity_name} (${input.amount?.toLocaleString("vi-VN")}₫)`
    });

    revalidatePath("/finance");
    return { id: data.id };
  });
}

export async function updateDebt(
  id: string,
  input: Partial<DebtInput>,
  expectedUpdatedAt?: string
) {
  return withAdmin(async (supabase) => {
    // 1. Zod partial validation
    const parsed = updateDebtSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu sửa không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    const updateData = parsed.data;

    // 2. Fetch old data + lock logic
    const { data: oldData } = await supabase
      .from("debts")
      .select("amount, entity_name, type, updated_at")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Không tìm thấy công nợ cần sửa.");

    // W3: Period lock check
    await checkPeriodLock(supabase, oldData.updated_at?.split("T")[0] || new Date().toISOString().split("T")[0]);
    
    if (expectedUpdatedAt && oldData.updated_at !== expectedUpdatedAt) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang.");
    }

    // 3. Update
    const finalUpdateData = { ...updateData, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("debts")
      .update(finalUpdateData)
      .eq("id", id);
      
    if (error) throw new Error(`Lỗi cập nhật công nợ: ${error.message}`);

    // 4. Audit
    await writeAuditLog({
      action: "UPDATE",
      tableName: "debts",
      recordId: id,
      oldData: oldData as unknown as Record<string, unknown>,
      newData: finalUpdateData as unknown as Record<string, unknown>,
      description: `Cập nhật công nợ #${id.substring(0, 8)}`
    });

    revalidatePath("/finance");
    return null;
  });
}

export async function deleteDebt(id: string) {
  return withAdmin(async (supabase) => {
    const { data: oldData } = await supabase
      .from("debts")
      .select("amount, entity_name, type, due_date")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Không tìm thấy công nợ.");

    // W3: Period lock check
    await checkPeriodLock(supabase, oldData.due_date || new Date().toISOString().split("T")[0]);

    // C3 audit fix: Soft delete thay vì hard delete — bảo toàn audit trail
    const { error } = await supabase
      .from("debts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Lỗi xóa công nợ: ${error.message}`);

    await writeAuditLog({
      action: "DELETE",
      tableName: "debts",
      recordId: id,
      oldData: oldData as unknown as Record<string, unknown>,
      description: `Xóa công nợ #${id.substring(0, 8)}`
    });

    revalidatePath("/finance");
    return null;
  });
}

export async function markInstallmentPaid(id: string) {
  return withAdmin(async (supabase) => {
    const { data: debt, error: fetchError } = await supabase
      .from("debts")
      .select("installment_paid, installment_total, amount")
      .eq("id", id)
      .single();
      
    if (fetchError || !debt) throw new Error("Không tìm thấy công nợ");
    if (!debt.installment_total) throw new Error("Không phải khoản trả góp");

    const newPaid = (debt.installment_paid || 0) + 1;
    const isComplete = newPaid >= debt.installment_total;
    
    const updateData: Record<string, unknown> = { installment_paid: newPaid, updated_at: new Date().toISOString() };
    if (isComplete) {
      updateData.status = "da_thanh_toan"; // spec fix
      updateData.payment_date = new Date().toISOString().split("T")[0];
    }

    const { error } = await supabase.from("debts").update(updateData).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật trả góp: ${error.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "debts",
      recordId: id,
      description: `Trả góp: thanh toán kỳ ${newPaid}/${debt.installment_total}`
    });

    revalidatePath("/finance");
    return { newPaid, isComplete };
  });
}

// ═══════════════ CREDIT CARDS ═══════════════

export async function createCreditCard(input: CreditCardInput) {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase.from("credit_cards").insert([input]).select("id").single();
    if (error) throw new Error(`Lỗi tạo thẻ tín dụng: ${error.message}`);

    await writeAuditLog({
      action: "CREATE",
      tableName: "credit_cards",
      recordId: data.id,
      description: `Thêm thẻ: ${input.bank_name}${input.last_4 ? ` *${input.last_4}` : ""}`
    });
    revalidatePath("/finance");
    return { id: data.id };
  });
}

export async function updateCreditCard(id: string, input: Partial<CreditCardInput>) {
  return withAdmin(async (supabase) => {
    const { error } = await supabase
      .from("credit_cards")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật thẻ: ${error.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "credit_cards",
      recordId: id,
      description: `Cập nhật thẻ #${id.substring(0, 8)}`
    });
    revalidatePath("/finance");
    return null;
  });
}

export async function deleteCreditCard(id: string) {
  return withAdmin(async (supabase) => {
    const { error } = await supabase.from("credit_cards").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa thẻ: ${error.message}`);

    await writeAuditLog({
      action: "DELETE",
      tableName: "credit_cards",
      recordId: id,
      description: `Xóa thẻ tín dụng #${id.substring(0, 8)}`
    });
    revalidatePath("/finance");
    return null;
  });
}
