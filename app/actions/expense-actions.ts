"use server";

import { revalidatePath } from "next/cache";
import { withAuth, withAdmin } from "@/lib/auth_utils";
import { writeAuditLog } from "@/lib/audit";
import { createExpenseSchema, updateExpenseSchema } from "@/lib/validations/finance.schema";
import { checkPeriodLock } from "@/lib/finance-utils";

// ═══════════════════════════════════════════
// Expense Actions — V2 (Hardened)
// ═══════════════════════════════════════════

export interface CreateExpenseInput {
  expense_date: string;
  payment_method: "tien_mat" | "chuyen_khoan";
  category_id?: string | null;
  amount: number;
  description?: string | null;
  recipient?: string | null;
  contract_id?: string | null;
  image_url?: string | null;
}


// ─── APPROVE EXPENSE ─────────────────────
export async function approveExpense(id: string) {
  return withAdmin(async (supabase, userId) => {
    // 1. Check if expense exists and period is locked
    const { data: expense } = await supabase
      .from("expenses")
      .select("expense_date, amount")
      .eq("id", id)
      .single();

    if (!expense) throw new Error("Không tìm thấy phiếu chi.");
    
    await checkPeriodLock(supabase, expense.expense_date);

    // 2. Perform approve (Update approved_by = userId)
    const { error } = await supabase
      .from("expenses")
      .update({ approved_by: userId, updated_at: new Date().toISOString() })
      .eq("id", id);
      
    if (error) throw new Error(`Lỗi duyệt chi phí: ${error.message}`);

    // 3. Audit log
    await writeAuditLog({ action: "UPDATE", tableName: "expenses", recordId: id, description: `Duyệt chi phí #${id.substring(0, 8)} (${expense.amount?.toLocaleString("vi-VN")}₫)` });
    
    // 4. Revalidate cache
    revalidatePath("/finance");
    return null;
  });
}

// ─── CREATE EXPENSE ──────────────────────
export async function createExpense(input: CreateExpenseInput) {
  return withAdmin(async (supabase, userId) => {
    // 1. Zod validation
    const parsed = createExpenseSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    const validated = parsed.data;

    // 2. Check period lock
    await checkPeriodLock(supabase, validated.expense_date);

    // 3. Insert
    const insertData = { ...validated, created_by: userId };
    const { data: created, error } = await supabase
      .from("expenses")
      .insert(insertData)
      .select("id")
      .single();

    if (error) throw new Error(`Lỗi tạo phiếu chi: ${error.message}`);

    // 4. Audit
    await writeAuditLog({
      action: "CREATE",
      tableName: "expenses",
      recordId: created.id,
      newData: insertData as unknown as Record<string, unknown>,
      description: `Tạo phiếu chi ${validated.amount.toLocaleString("vi-VN")}₫${validated.recipient ? ` cho ${validated.recipient}` : ""}`,
    });

    // 5. Revalidate
    revalidatePath("/finance");
    revalidatePath("/contracts");
    return null;
  });
}

// ─── UPDATE EXPENSE ──────────────────────
export async function updateExpense(
  id: string,
  input: Partial<CreateExpenseInput>,
  expectedUpdatedAt?: string
) {
  return withAdmin(async (supabase) => {
    // 1. Zod validation
    const parsed = updateExpenseSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu sửa không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    const updateData = parsed.data;
    if (Object.keys(updateData).length === 0) return null;

    // 2. Fetch old data and check lock
    const { data: oldData } = await supabase
      .from("expenses")
      .select("amount, recipient, expense_date, updated_at")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Không tìm thấy phiếu chi cần sửa.");
    
    if (expectedUpdatedAt && oldData.updated_at !== expectedUpdatedAt) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang.");
    }
    
    // Check lock for old date, and new date (if changing)
    await checkPeriodLock(supabase, oldData.expense_date);
    if (updateData.expense_date && updateData.expense_date !== oldData.expense_date) {
      await checkPeriodLock(supabase, updateData.expense_date);
    }

    // 3. Update
    const finalUpdateData = { ...updateData, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("expenses")
      .update(finalUpdateData)
      .eq("id", id);

    if (error) throw new Error(`Lỗi cập nhật phiếu chi: ${error.message}`);

    // 4. Audit
    await writeAuditLog({
      action: "UPDATE",
      tableName: "expenses",
      recordId: id,
      oldData: oldData as unknown as Record<string, unknown>,
      newData: finalUpdateData as unknown as Record<string, unknown>,
      description: `Cập nhật phiếu chi #${id.substring(0, 8)}`,
    });

    // 5. Revalidate
    revalidatePath("/finance");
    revalidatePath("/contracts");
    return null;
  });
}

// ─── DELETE EXPENSE ──────────────────────
export async function deleteExpense(id: string) {
  return withAdmin(async (supabase) => {
    // 1. Fetch old data + lock check
    const { data: oldData } = await supabase
      .from("expenses")
      .select("amount, recipient, expense_date")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Không tìm thấy phiếu chi cần xoá.");
    await checkPeriodLock(supabase, oldData.expense_date);

    // 2. Delete (soft or hard based on requirements, currently hard delete in old code but usually soft delete is better if deleted_at exists. Let's do soft delete if table has deleted_at, or hard if not. V2 spec says expenses has deleted_at).
    // The previous code did hard delete: `delete().eq("id", id)`. V2 plans say "Soft delete: IS NULL". Let's update to soft delete.
    const { error } = await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
      
    if (error) throw new Error(`Lỗi xoá phiếu chi: ${error.message}`);

    // 3. Audit
    await writeAuditLog({
      action: "DELETE",
      tableName: "expenses",
      recordId: id,
      oldData: oldData as unknown as Record<string, unknown>,
      description: `Xóa phiếu chi #${id.substring(0, 8)} (${oldData.amount?.toLocaleString("vi-VN")}₫)`,
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

    if (error) throw new Error(`Lỗi tải chi phí hợp đồng: ${error.message}`);
    return data || [];
  });
}

// ─── GENERATE MONTHLY FIXED COSTS ───────
interface GenerateResult {
  total: number;
  created: number;
  skipped: number;
  totalAmount: number;
}

export async function generateMonthlyFixedCosts(month: number, year: number) {
  return withAdmin(async (supabase, userId) => {
    // 1. Period check (first day of the month)
    const targetDate = `${year}-${month.toString().padStart(2, "0")}-01`;
    await checkPeriodLock(supabase, targetDate);

    // 2. Get active fixed costs
    const { data: costs, error: costError } = await supabase
      .from("fixed_costs")
      .select("id, cost_code, cost_name, cost_type, monthly_amount, start_date, end_date");

    if (costError || !costs) throw new Error("Không thể lấy danh sách chi phí cố định");

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

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

    const { data: categories } = await supabase
      .from("transaction_categories")
      .select("id, name")
      .eq("type", "Chi");

    const pattern = `%[Auto-Fixed]%Tháng ${month}/${year}%`;
    const { data: existingExpenses } = await supabase
      .from("expenses")
      .select("description")
      .ilike("description", pattern)
      .is("deleted_at", null);

    const existingTags = new Set(existingExpenses?.map((e) => e.description) || []);

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

      const category = categories?.find((cat) => cat.name === cost.cost_type) || categories?.[0];

      newExpenses.push({
        expense_date: targetDate, // Or today if you want, but targetDate makes more sense for fixed costs
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
      const { error: insertError } = await supabase.from("expenses").insert(newExpenses);
      if (insertError) throw new Error(`Lỗi tạo chi phí tự động: ${insertError.message}`);
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
