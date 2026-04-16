"use server";

import { withAuth, withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { createGoalSchema, updateGoalSchema, upsertBudgetSchema } from "@/lib/validations/finance.schema";
import { checkPeriodLock, firstDayOfMonth, isMissingRpcError } from "@/lib/finance-utils";
import type { BudgetActualItem } from "@/types/finance-operations";

// ═══════════════════════════════════════════
// Goal + Budget Actions (Hardened V2)
// ═══════════════════════════════════════════

// ═══════════════ FINANCIAL GOALS ═══════════════

export async function createGoal(input: { name: string; target_amount: number; deadline?: string; icon?: string; color?: string; notes?: string }) {
  return withAdmin(async (supabase) => {
    const parsed = createGoalSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    const { error, data } = await supabase.from("financial_goals").insert({
      name: parsed.data.name,
      target_amount: parsed.data.target_amount,
      deadline: parsed.data.deadline || null,
      icon: input.icon || "savings",
      color: input.color || "emerald",
      notes: input.notes || null,
    }).select("id").single();

    if (error) throw new Error(`Lỗi tạo mục tiêu: ${error.message}`);

    await writeAuditLog({ action: "CREATE", tableName: "financial_goals", recordId: data.id, description: `Tạo mục tiêu: ${parsed.data.name}` });
    revalidatePath("/finance");
    return null;
  });
}

export async function updateGoal(
  id: string,
  input: { name?: string; target_amount?: number; deadline?: string; icon?: string; color?: string; notes?: string; status?: string },
  expectedUpdatedAt?: string
) {
  return withAdmin(async (supabase) => {
    const parsed = updateGoalSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    const { data: oldData } = await supabase.from("financial_goals").select("updated_at, name, target_amount").eq("id", id).single();
    if (!oldData) throw new Error("Không tìm thấy mục tiêu");

    if (expectedUpdatedAt && oldData.updated_at !== expectedUpdatedAt) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang.");
    }

    const updateData: Record<string, string | number | null> = { ...input, updated_at: new Date().toISOString() };
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.target_amount !== undefined) updateData.target_amount = parsed.data.target_amount;
    if (parsed.data.deadline !== undefined) updateData.deadline = parsed.data.deadline;

    const { error } = await supabase.from("financial_goals").update(updateData).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật mục tiêu: ${error.message}`);

    await writeAuditLog({ action: "UPDATE", tableName: "financial_goals", recordId: id, oldData: oldData as Record<string, unknown>, newData: updateData as Record<string, unknown>, description: `Cập nhật mục tiêu #${id.substring(0, 8)}` });
    revalidatePath("/finance");
    return null;
  });
}

export async function deleteGoal(id: string) {
  return withAdmin(async (supabase) => {
    const { data: oldData } = await supabase.from("financial_goals").select("name, target_amount").eq("id", id).single();
    const { error } = await supabase.from("financial_goals").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa mục tiêu: ${error.message}`);

    await writeAuditLog({ action: "DELETE", tableName: "financial_goals", recordId: id, oldData: oldData as Record<string, unknown>, description: `Xóa mục tiêu #${id.substring(0, 8)}` });
    revalidatePath("/finance");
    return null;
  });
}

/** Add contribution (atomic RPC) */
export async function addContribution(goalId: string, amount: number, notes?: string) {
  return withAdmin(async (supabase) => {
    if (!goalId?.trim()) throw new Error("Goal ID không hợp lệ");
    if (!amount || amount <= 0) throw new Error("Số tiền phải lớn hơn 0");

    // W3: Period lock (contribution date = today)
    await checkPeriodLock(supabase, new Date().toISOString().split("T")[0]);

    const { error } = await supabase.rpc("contribute_to_goal", { p_goal_id: goalId, p_amount: amount, p_notes: notes || null });
    if (error && isMissingRpcError(error)) {
      const { data: goal, error: goalError } = await supabase
        .from("financial_goals")
        .select("current_amount, target_amount")
        .eq("id", goalId)
        .single();
      if (goalError || !goal) throw new Error(`Khong tim thay muc tieu: ${goalError?.message || ""}`);

      const { error: insertError } = await supabase.from("goal_contributions").insert({
        goal_id: goalId,
        amount,
        notes: notes || null,
        contribution_date: new Date().toISOString().split("T")[0],
      });
      if (insertError) throw new Error(`Khong the ghi nhan gop von: ${insertError.message}`);

      const newCurrent = (goal.current_amount || 0) + amount;
      const updateData: Record<string, string | number> = {
        current_amount: newCurrent,
        updated_at: new Date().toISOString(),
      };
      if (newCurrent >= (goal.target_amount || 0)) updateData.status = "completed";

      const { error: updateError } = await supabase.from("financial_goals").update(updateData).eq("id", goalId);
      if (updateError) throw new Error(`Khong the cap nhat muc tieu: ${updateError.message}`);

      await writeAuditLog({ action: "CREATE", tableName: "goal_contributions", description: `Gop von ${amount.toLocaleString("vi-VN")} VND vao muc tieu #${goalId.substring(0, 8)}` });

      revalidatePath("/finance");
      return null;
    }
    if (error) throw new Error(`Lỗi góp vốn: ${error.message}`);

    await writeAuditLog({ action: "CREATE", tableName: "goal_contributions", description: `Góp vốn ${amount.toLocaleString("vi-VN")}₫ vào mục tiêu #${goalId.substring(0, 8)}` });

    revalidatePath("/finance");
    return null;
  });
}

/** Undo contribution (24h window — Atomic RPC) */
export async function undoContribution(contributionId: string) {
  return withAdmin(async (supabase) => {
    if (!contributionId?.trim()) throw new Error("Contribution ID không hợp lệ");

    // Single atomic RPC: validate 24h → delete → decrement → revert status
    const { data, error } = await supabase.rpc("undo_contribution_atomic", {
      p_contribution_id: contributionId,
    });

    if (error && isMissingRpcError(error)) {
      const { data: contribution, error: contributionError } = await supabase
        .from("goal_contributions")
        .select("goal_id, amount, created_at")
        .eq("id", contributionId)
        .single();
      if (contributionError || !contribution) throw new Error(`Khong tim thay khoan gop: ${contributionError?.message || ""}`);

      const hoursSince = (Date.now() - new Date(contribution.created_at || "").getTime()) / 3600000;
      if (!Number.isFinite(hoursSince) || hoursSince > 24) throw new Error("Chi co the hoan tac trong vong 24 gio.");

      const { data: goal, error: goalError } = await supabase
        .from("financial_goals")
        .select("current_amount, target_amount, status")
        .eq("id", contribution.goal_id)
        .single();
      if (goalError || !goal) throw new Error(`Khong tim thay muc tieu: ${goalError?.message || ""}`);

      const { error: deleteError } = await supabase.from("goal_contributions").delete().eq("id", contributionId);
      if (deleteError) throw new Error(`Khong the hoan tac gop von: ${deleteError.message}`);

      const newCurrent = Math.max(0, (goal.current_amount || 0) - (contribution.amount || 0));
      const updateData: Record<string, string | number> = {
        current_amount: newCurrent,
        updated_at: new Date().toISOString(),
      };
      if (goal.status === "completed" && newCurrent < (goal.target_amount || 0)) updateData.status = "active";

      const { error: updateError } = await supabase.from("financial_goals").update(updateData).eq("id", contribution.goal_id);
      if (updateError) throw new Error(`Khong the cap nhat muc tieu: ${updateError.message}`);

      await writeAuditLog({
        action: "DELETE",
        tableName: "goal_contributions",
        recordId: contributionId,
        description: `Hoan tac gop von ${(contribution.amount || 0).toLocaleString("vi-VN")} VND`,
      });

      revalidatePath("/finance");
      return null;
    }

    if (error) throw new Error(`Lỗi hoàn tác: ${error.message}`);

    const result = data as { goal_id: string; removed_amount: number; new_current_amount: number; status_reverted: boolean };

    await writeAuditLog({
      action: "DELETE",
      tableName: "goal_contributions",
      recordId: contributionId,
      description: `Hoàn tác góp vốn ${result.removed_amount.toLocaleString("vi-VN")}₫`
    });

    revalidatePath("/finance");
    return null;
  });
}

// ═══════════════ BUDGETS ═══════════════

export async function upsertBudget(input: { category_name: string; budget_amount: number; period_month: number; period_year: number; notes?: string }) {
  return withAdmin(async (supabase) => {
    const parsed = upsertBudgetSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    // W3: Period lock (first day of budget month)
    await checkPeriodLock(supabase, firstDayOfMonth(parsed.data.period_month, parsed.data.period_year));

    const { error } = await supabase.from("budgets").upsert(
      {
        category_name: parsed.data.category_name,
        budget_amount: parsed.data.budget_amount,
        period_month: parsed.data.period_month,
        period_year: parsed.data.period_year,
        notes: input.notes || null
      },
      { onConflict: "category_name,period_month,period_year" },
    );
    if (error) throw new Error(`Lỗi lưu ngân sách: ${error.message}`);

    await writeAuditLog({ action: "CREATE", tableName: "budgets", description: `Lưu ngân sách ${parsed.data.category_name} tháng ${parsed.data.period_month}/${parsed.data.period_year}` });

    revalidatePath("/finance");
    return null;
  });
}

export async function deleteBudget(id: string) {
  return withAdmin(async (supabase) => {
    const { data: oldData } = await supabase.from("budgets").select("category_name, period_month, period_year").eq("id", id).single();

    if (!oldData) throw new Error("Không tìm thấy ngân sách.");

    // W3: Period lock
    await checkPeriodLock(supabase, firstDayOfMonth(oldData.period_month, oldData.period_year));

    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa ngân sách: ${error.message}`);

    await writeAuditLog({ action: "DELETE", tableName: "budgets", recordId: id, description: `Xóa ngân sách ${oldData?.category_name} tháng ${oldData?.period_month}/${oldData?.period_year}` });
    revalidatePath("/finance");
    return null;
  });
}

export async function getBudgetsWithActuals(month: number, year: number) {
  return withAuth(async (supabase): Promise<BudgetActualItem[]> => {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    // W6: 3 parallel queries instead of 3 sequential (2-3x faster)
    const [budgetsResult, expensesResult, categoriesResult] = await Promise.all([
      supabase
        .from("budgets")
        .select("id, category_name, budget_amount, period_month, period_year, notes, created_at, updated_at")
        .eq("period_month", month)
        .eq("period_year", year)
        .order("category_name"),
      supabase
        .from("expenses")
        .select("amount, category_id")
        .gte("expense_date", startDate)
        .lt("expense_date", endDate)
        .is("deleted_at", null),
      supabase
        .from("transaction_categories")
        .select("id, name")
        .eq("type", "chi"),
    ]);

    if (budgetsResult.error) throw new Error(`Lỗi tải ngân sách: ${budgetsResult.error.message}`);
    if (expensesResult.error) throw new Error(`Lỗi tải chi phí: ${expensesResult.error.message}`);

    const catMap = Object.fromEntries((categoriesResult.data || []).map(c => [c.id, c.name]));

    const actualByCategory: Record<string, number> = {};
    for (const e of expensesResult.data || []) {
      const catName = catMap[e.category_id as string] || "Khác";
      actualByCategory[catName] = (actualByCategory[catName] || 0) + (e.amount || 0);
    }

    return (budgetsResult.data || []).map((b) => {
      const actual = actualByCategory[b.category_name] || 0;
      return {
        id: b.id,
        category_name: b.category_name,
        budget_amount: b.budget_amount,
        period_month: b.period_month,
        period_year: b.period_year,
        notes: b.notes,
        actual_spent: actual,
        usage_percent: b.budget_amount > 0 ? Math.round((actual / b.budget_amount) * 100) : 0
      };
    });
  });
}
