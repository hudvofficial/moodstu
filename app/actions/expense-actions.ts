"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth_utils";
import { writeAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Expense Actions — V2 port from V1 finance.ts + expenses.ts
// V2 DB mapping: amount (not expense_amount), payment_method (enum)
// ═══════════════════════════════════════════

// ─── Types ────────────────────────────────
export interface CreateExpenseInput {
  expense_date: string;
  payment_method: "tien_mat" | "chuyen_khoan";
  category_id?: string;
  amount: number;
  description?: string;
  recipient?: string;
  contract_id?: string;
  image_url?: string;
}

// ─── APPROVE EXPENSE ─────────────────────
export async function approveExpense(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("expenses")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) throw new Error(`Lỗi duyệt chi phí: ${error.message}`);

    await writeAuditLog({ action: "UPDATE", tableName: "expenses", recordId: id, description: `Duyệt chi phí #${id.substring(0, 8)}` });
    revalidatePath("/finance");
    return null;
  });
}

// ─── CREATE EXPENSE ──────────────────────
export async function createExpense(input: CreateExpenseInput) {
  return withAuth(async (supabase, userId) => {
    if (!input.amount || input.amount <= 0) {
      throw new Error("Số tiền chi phải lớn hơn 0");
    }

    const { error } = await supabase.from("expenses").insert({
      expense_date: input.expense_date,
      payment_method: input.payment_method,
      category_id: input.category_id || null,
      amount: input.amount,
      description: input.description || null,
      recipient: input.recipient || null,
      contract_id: input.contract_id || null,
      image_url: input.image_url || null,
      created_by: userId,
    });

    if (error) throw error;

    await writeAuditLog({
      action: "CREATE",
      tableName: "expenses",
      newData: input as unknown as Record<string, unknown>,
      description: `Tạo phiếu chi ${input.amount.toLocaleString("vi-VN")}₫${input.recipient ? ` cho ${input.recipient}` : ""}`,
    });

    revalidatePath("/finance");
    revalidatePath("/contracts");
    return null;
  });
}

// ─── UPDATE EXPENSE ──────────────────────
export async function updateExpense(
  id: string,
  input: Partial<CreateExpenseInput>,
) {
  return withAuth(async (supabase) => {
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error("Số tiền chi phải lớn hơn 0");
    }

    const updateData: Record<string, unknown> = {};
    if (input.expense_date !== undefined)
      updateData.expense_date = input.expense_date;
    if (input.payment_method !== undefined)
      updateData.payment_method = input.payment_method;
    if (input.category_id !== undefined)
      updateData.category_id = input.category_id || null;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.description !== undefined)
      updateData.description = input.description || null;
    if (input.recipient !== undefined)
      updateData.recipient = input.recipient || null;
    if (input.contract_id !== undefined)
      updateData.contract_id = input.contract_id || null;

    const { error } = await supabase
      .from("expenses")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "expenses",
      recordId: id,
      newData: updateData,
      description: `Cập nhật phiếu chi #${id.substring(0, 8)}`,
    });

    revalidatePath("/finance");
    revalidatePath("/contracts");
    return null;
  });
}

// ─── DELETE EXPENSE ──────────────────────
export async function deleteExpense(id: string) {
  return withAuth(async (supabase) => {
    // Fetch old data for audit trail
    const { data: oldData } = await supabase
      .from("expenses")
      .select("amount, recipient, expense_date")
      .eq("id", id)
      .single();

    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;

    await writeAuditLog({
      action: "DELETE",
      tableName: "expenses",
      recordId: id,
      oldData: (oldData as Record<string, unknown>) || undefined,
      description: `Xóa phiếu chi #${id.substring(0, 8)}${oldData ? ` (${oldData.amount?.toLocaleString("vi-VN")}₫)` : ""}`,
    });

    revalidatePath("/finance");
    revalidatePath("/contracts");
    return null;
  });
}

// ─── GET EXPENSES BY CONTRACT ────────────
export async function getExpensesByContract(contractId: string) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("expenses")
      .select(
        "id, expense_date, payment_method, amount, description, recipient, category:category_id(id, name), created_at",
      )
      .eq("contract_id", contractId)
      .is("deleted_at", null)
      .order("expense_date", { ascending: false });

    if (error) throw error;
    return data || [];
  });
}

// ─── GENERATE MONTHLY FIXED COSTS ───────
// Port from V1 expenses.ts: generateMonthlyFixedCosts
interface GenerateResult {
  total: number;
  created: number;
  skipped: number;
  totalAmount: number;
}

export async function generateMonthlyFixedCosts(
  month: number,
  year: number,
) {
  return withAuth(async (supabase, userId) => {
    // 1. Get active fixed costs
    const { data: costs, error: costError } = await supabase
      .from("fixed_costs")
      .select(
        "id, cost_code, cost_name, cost_type, monthly_amount, start_date, end_date",
      );

    if (costError || !costs)
      throw new Error("Không thể lấy danh sách chi phí cố định");

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

    // Filter active costs within the month range
    const activeCosts = costs.filter((c) => {
      const start = c.start_date ? new Date(c.start_date) : null;
      const end = c.end_date ? new Date(c.end_date) : null;
      if (start && start > lastDayOfMonth) return false;
      if (end && end < firstDayOfMonth) return false;
      return true;
    });

    if (activeCosts.length === 0) {
      return { total: 0, created: 0, skipped: 0, totalAmount: 0 } as GenerateResult;
    }

    // 2. Get expense categories (type = "Chi")
    const { data: categories } = await supabase
      .from("transaction_categories")
      .select("id, name")
      .eq("type", "Chi");

    // 3. Anti-duplicate check via description tag pattern
    const pattern = `%[Auto-Fixed]%Tháng ${month}/${year}%`;
    const { data: existingExpenses } = await supabase
      .from("expenses")
      .select("description")
      .ilike("description", pattern);

    const existingTags = new Set(
      existingExpenses?.map((e) => e.description) || [],
    );

    let createdCount = 0;
    let skippedCount = 0;
    let totalAmount = 0;
    const newExpenses: Record<string, unknown>[] = [];

    for (const cost of activeCosts) {
      const tag = `[Auto-Fixed] ${cost.cost_code} - Tháng ${month}/${year}`;

      if (existingTags.has(tag)) {
        skippedCount++;
        continue;
      }

      // Map cost_type to category
      const category =
        categories?.find((cat) => cat.name === cost.cost_type) ||
        categories?.[0];

      newExpenses.push({
        expense_date: new Date().toISOString().split("T")[0],
        payment_method: "tien_mat",
        category_id: category?.id || null,
        amount: cost.monthly_amount,
        recipient: "Chi phí cố định",
        description: tag,
        created_by: userId,
      });

      totalAmount += cost.monthly_amount;
      createdCount++;
    }

    if (newExpenses.length > 0) {
      const { error: insertError } = await supabase
        .from("expenses")
        .insert(newExpenses);
      if (insertError) throw insertError;
    }

    await writeAuditLog({
      action: "CREATE",
      tableName: "expenses",
      description: `Auto-generate ${createdCount} chi phí cố định tháng ${month}/${year} (${totalAmount.toLocaleString("vi-VN")}₫)`,
      newData: { month, year, created: createdCount, skipped: skippedCount },
    });

    revalidatePath("/finance");
    return {
      total: activeCosts.length,
      created: createdCount,
      skipped: skippedCount,
      totalAmount,
    } as GenerateResult;
  });
}
