"use server";

import { withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { createCreditCardSchema, createDebtSchema, updateCreditCardSchema, updateDebtSchema } from "@/lib/validations/finance.schema";
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
  status?: "open" | "closed" | "partial" | "dang_no" | "da_thanh_toan"; // Keep dang_no/da_thanh_toan for retrocompatibility.
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
  credit_limit?: number | null;
}

function normalizeDebtStatus(status?: string | null) {
  if (!status || status === "dang_no") return "open";
  if (status === "da_thanh_toan") return "closed";
  return status;
}

function deriveDebtStatus(amount: number, paidAmount: number) {
  if (paidAmount <= 0) return "open";
  if (paidAmount >= amount) return "closed";
  return "partial";
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

    const initialStatus = normalizeDebtStatus(parsed.data.status);
    if (initialStatus === "partial") {
      throw new Error("Khong the tao cong no partial khi chua co so tien da thanh toan.");
    }
    const paidAmount = initialStatus === "closed" ? parsed.data.amount : 0;
    const remaining = Math.max(0, parsed.data.amount - paidAmount);

    const { data, error } = await supabase
      .from("debts")
      .insert({
        entity_name: parsed.data.entity_name,
        entity_type: parsed.data.entity_type,
        type: parsed.data.type === "Phải thu" ? "receivable" : "payable",
        amount: parsed.data.amount,
        due_date: parsed.data.due_date || null,
        notes: parsed.data.notes || null,
        entity_id: parsed.data.entity_id || null,
        paid_amount: paidAmount,
        remaining,
        created_by: userId,
        status: initialStatus,
        installment_total: parsed.data.installment_total || null,
        installment_paid: parsed.data.installment_total ? 0 : null,
        installment_amount: parsed.data.installment_amount || null,
        platform: parsed.data.platform || null,
        card_id: parsed.data.card_id || null,
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
      .select("amount, paid_amount, remaining, entity_name, type, due_date, status, updated_at")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!oldData) throw new Error("Không tìm thấy công nợ cần sửa.");

    // W3: Period lock check
    await checkPeriodLock(supabase, oldData.due_date || new Date().toISOString().split("T")[0]);
    if (updateData.due_date && updateData.due_date !== oldData.due_date) {
      await checkPeriodLock(supabase, updateData.due_date);
    }

    if (expectedUpdatedAt && oldData.updated_at !== expectedUpdatedAt) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang.");
    }

    // 3. Update
    const dbUpdateData: Record<string, unknown> = { ...updateData, updated_at: new Date().toISOString() };
    if (updateData.type) {
      dbUpdateData.type = updateData.type === "Phải thu" ? "receivable" : "payable";
    }
    const nextAmount = Number(updateData.amount ?? oldData.amount) || 0;
    const currentPaid = Number(oldData.paid_amount) || 0;
    const explicitStatus = updateData.status ? normalizeDebtStatus(updateData.status) : null;

    if (explicitStatus) {
      dbUpdateData.status = explicitStatus;
      if (explicitStatus === "closed") {
        dbUpdateData.paid_amount = nextAmount;
        dbUpdateData.remaining = 0;
        dbUpdateData.payment_date = new Date().toISOString().split("T")[0];
      } else if (explicitStatus === "open") {
        dbUpdateData.paid_amount = 0;
        dbUpdateData.remaining = nextAmount;
      } else if (explicitStatus === "partial") {
        if (currentPaid <= 0 || currentPaid >= nextAmount) {
          throw new Error("Trang thai partial can co so tien da thanh toan hop le.");
        }
        dbUpdateData.remaining = Math.max(0, nextAmount - currentPaid);
      }
    } else if (updateData.amount !== undefined) {
      dbUpdateData.remaining = Math.max(0, nextAmount - currentPaid);
      dbUpdateData.status = deriveDebtStatus(nextAmount, currentPaid);
    }

    const finalUpdateData = dbUpdateData;
    let query = supabase
      .from("debts")
      .update(finalUpdateData)
      .eq("id", id)
      .is("deleted_at", null);
    if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);

    const { error } = await query;

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
      .is("deleted_at", null)
      .single();

    if (!oldData) throw new Error("Không tìm thấy công nợ.");

    // W3: Period lock check
    await checkPeriodLock(supabase, oldData.due_date || new Date().toISOString().split("T")[0]);

    // C3 audit fix: Soft delete thay vì hard delete — bảo toàn audit trail
    const { error } = await supabase
      .from("debts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);
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
    if (!id?.trim()) throw new Error("Debt ID khong hop le");

    const { data: debt, error: fetchError } = await supabase
      .from("debts")
      .select("installment_paid, installment_total, installment_amount, amount, paid_amount, remaining, due_date, status")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !debt) throw new Error("Khong tim thay cong no");
    if (!debt.installment_total) throw new Error("Khong phai khoan tra gop");
    if (debt.status === "closed" || debt.status === "da_thanh_toan") {
      throw new Error("Cong no da tat toan.");
    }
    if ((debt.installment_paid || 0) >= debt.installment_total) {
      throw new Error("Cong no da du so ky tra gop.");
    }

    const paymentDate = new Date().toISOString().split("T")[0];
    await checkPeriodLock(supabase, paymentDate);

    const newPaid = (debt.installment_paid || 0) + 1;
    const totalAmount = Number(debt.amount) || 0;
    const installmentAmount = Number(debt.installment_amount) || Math.ceil(totalAmount / debt.installment_total);
    const newPaidAmount = Math.min(totalAmount, (Number(debt.paid_amount) || 0) + installmentAmount);
    const newRemaining = Math.max(0, totalAmount - newPaidAmount);
    const isComplete = newPaid >= debt.installment_total || newRemaining <= 0;

    const updateData: Record<string, unknown> = {
      installment_paid: newPaid,
      paid_amount: newPaidAmount,
      remaining: newRemaining,
      status: isComplete ? "closed" : "partial",
      updated_at: new Date().toISOString(),
    };
    if (isComplete) {
      updateData.payment_date = paymentDate;
    }

    const { error } = await supabase
      .from("debts")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(`Loi cap nhat tra gop: ${error.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "debts",
      recordId: id,
      description: `Tra gop: thanh toan ky ${newPaid}/${debt.installment_total}`,
    });

    revalidatePath("/finance");
    return { newPaid, isComplete };
  });
}
// ═══════════════ CREDIT CARDS ═══════════════

export async function createCreditCard(input: CreditCardInput) {
  return withAdmin(async (supabase) => {
    const parsed = createCreditCardSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Du lieu khong hop le: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    const { data, error } = await supabase
      .from("credit_cards")
      .insert({
        bank_name: parsed.data.bank_name,
        last_4: parsed.data.last_4,
        statement_day: parsed.data.statement_day,
        due_day: parsed.data.due_day,
        credit_limit: parsed.data.credit_limit ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Lỗi tạo thẻ tín dụng: ${error.message}`);

    await writeAuditLog({
      action: "CREATE",
      tableName: "credit_cards",
      recordId: data.id,
      description: `Thêm thẻ: ${input.bank_name}${input.last_4 ? ` *${input.last_4}` : ""}`
    });
    revalidatePath("/finance");
    revalidatePath("/settings/credit-cards");
    return { id: data.id };
  });
}

export async function updateCreditCard(
  id: string,
  input: Partial<CreditCardInput>,
  expectedUpdatedAt?: string | null,
) {
  return withAdmin(async (supabase) => {
    const parsed = updateCreditCardSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Du lieu khong hop le: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    const { data: oldData } = await supabase
      .from("credit_cards")
      .select("bank_name, last_4, updated_at")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!oldData) throw new Error("Khong tim thay the tin dung.");

    let query = supabase
      .from("credit_cards")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);
    if (expectedUpdatedAt) {
      query = query.eq("updated_at", expectedUpdatedAt);
    }

    const { data: updated, error } = await query.select("id").maybeSingle();
    if (error) throw new Error(`Lỗi cập nhật thẻ: ${error.message}`);

    if (!updated) {
      throw new Error("The da duoc cap nhat boi nguoi khac. Vui long tai lai trang.");
    }

    await writeAuditLog({
      action: "UPDATE",
      tableName: "credit_cards",
      recordId: id,
      oldData: oldData as Record<string, unknown>,
      newData: parsed.data as Record<string, unknown>,
      description: `Cập nhật thẻ #${id.substring(0, 8)}`
    });
    revalidatePath("/finance");
    revalidatePath("/settings/credit-cards");
    return null;
  });
}

export async function deleteCreditCard(id: string) {
  return withAdmin(async (supabase) => {
    const { data: oldData } = await supabase
      .from("credit_cards")
      .select("bank_name, last_4")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!oldData) throw new Error("Khong tim thay the tin dung.");

    const { count: linkedDebtCount, error: linkedDebtError } = await supabase
      .from("debts")
      .select("id", { count: "exact", head: true })
      .eq("card_id", id)
      .is("deleted_at", null);
    if (linkedDebtError) {
      throw new Error(`Loi kiem tra cong no lien ket: ${linkedDebtError.message}`);
    }
    if ((linkedDebtCount ?? 0) > 0) {
      throw new Error("Khong the xoa the dang duoc lien ket voi cong no tra gop.");
    }

    const deletedAt = new Date().toISOString();
    const { error } = await supabase
      .from("credit_cards")
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(`Lỗi xóa thẻ: ${error.message}`);

    await writeAuditLog({
      action: "DELETE",
      tableName: "credit_cards",
      recordId: id,
      oldData: oldData as Record<string, unknown>,
      description: `Xóa thẻ tín dụng #${id.substring(0, 8)}`
    });
    revalidatePath("/finance");
    revalidatePath("/settings/credit-cards");
    return null;
  });
}
