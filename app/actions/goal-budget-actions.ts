"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Goal + Budget Actions
// V1 ref: goals.ts + budgets.ts
// V2: withAuth + fireAuditLog + atomic RPCs
// ═══════════════════════════════════════════

// ═══════════════ FINANCIAL GOALS ═══════════════

export async function createGoal(input: { name: string; target_amount: number; deadline?: string; icon?: string; color?: string; notes?: string }) {
  return withAuth(async (supabase) => {
    if (!input.name?.trim()) throw new Error("Tên mục tiêu là bắt buộc");
    if (!input.target_amount || input.target_amount <= 0) throw new Error("Số tiền mục tiêu phải lớn hơn 0");

    const { error } = await supabase.from("financial_goals").insert({
      name: input.name.trim(), target_amount: input.target_amount,
      deadline: input.deadline || null, icon: input.icon || "savings", color: input.color || "emerald", notes: input.notes || null,
    });
    if (error) throw new Error(`Lỗi tạo mục tiêu: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "financial_goals", description: `Tạo mục tiêu: ${input.name}` });
    revalidatePath("/finance/goals");
    return null;
  });
}

export async function updateGoal(id: string, input: { name?: string; target_amount?: number; deadline?: string; icon?: string; color?: string; notes?: string; status?: string }) {
  return withAuth(async (supabase) => {
    const updateData: Record<string, string | number | null> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.target_amount !== undefined) updateData.target_amount = input.target_amount;
    if (input.deadline !== undefined) updateData.deadline = input.deadline || null;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.status !== undefined) updateData.status = input.status;

    const { error } = await supabase.from("financial_goals").update(updateData).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật mục tiêu: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "financial_goals", recordId: id, description: `Cập nhật mục tiêu ${id.substring(0, 8)}` });
    revalidatePath("/finance/goals");
    return null;
  });
}

export async function deleteGoal(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("financial_goals").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa mục tiêu: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "financial_goals", recordId: id, description: `Xóa mục tiêu ${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/finance/goals");
    return null;
  });
}

/** Add contribution (atomic RPC) */
export async function addContribution(goalId: string, amount: number, notes?: string) {
  return withAuth(async (supabase) => {
    if (!goalId?.trim()) throw new Error("Goal ID không hợp lệ");
    if (!amount || amount <= 0) throw new Error("Số tiền phải lớn hơn 0");

    const { error } = await supabase.rpc("contribute_to_goal", { p_goal_id: goalId, p_amount: amount, p_notes: notes || null });
    if (error) throw new Error(`Lỗi góp vốn: ${error.message}`);

    revalidatePath("/finance/goals");
    return null;
  });
}

/** Undo contribution (24h window) */
export async function undoContribution(contributionId: string) {
  return withAuth(async (supabase) => {
    if (!contributionId?.trim()) throw new Error("Contribution ID không hợp lệ");

    const { data: contrib, error: cErr } = await supabase
      .from("goal_contributions")
      .select("id, goal_id, amount, created_at")
      .eq("id", contributionId)
      .single();
    if (cErr || !contrib) throw new Error("Không tìm thấy khoản góp");

    const hoursSince = (Date.now() - new Date(contrib.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince > 24) throw new Error("Chỉ có thể hoàn tác trong vòng 24 giờ");

    const { error: delErr } = await supabase.from("goal_contributions").delete().eq("id", contributionId);
    if (delErr) throw new Error(`Lỗi hoàn tác: ${delErr.message}`);

    const { error: decErr } = await supabase.rpc("decrement_goal_amount", { p_goal_id: contrib.goal_id, p_amount: contrib.amount });
    if (decErr) throw new Error(`Lỗi cập nhật goal: ${decErr.message}`);

    // Revert completed → active if below target
    const { data: goal } = await supabase.from("financial_goals").select("current_amount, target_amount, status").eq("id", contrib.goal_id).single();
    if (goal && goal.status === "completed" && Number(goal.current_amount) < Number(goal.target_amount)) {
      await supabase.from("financial_goals").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", contrib.goal_id);
    }

    revalidatePath("/finance/goals");
    return null;
  });
}

/** Enrich goals with computed fields (pure function, no DB) */
export function enrichGoals(
  rawGoals: Array<{
    id: string; name: string; target_amount: number; current_amount: number; deadline: string | null;
    icon: string; color: string; status: "active" | "completed" | "cancelled"; notes: string | null;
    created_at: string; updated_at: string;
    contributions: Array<{ id: string; goal_id: string; amount: number; contribution_date: string; notes: string | null; created_at: string }>;
  }>,
) {
  const now = new Date();
  return rawGoals.map((g) => {
    const target = Number(g.target_amount) || 0;
    const current = Number(g.current_amount) || 0;
    const progress = target > 0 ? Math.round((current / target) * 100) : 0;
    const remaining = Math.max(0, target - current);
    let monthsLeft: number | null = null;
    let monthlyNeeded: number | null = null;
    if (g.deadline) {
      const diffMs = new Date(g.deadline).getTime() - now.getTime();
      monthsLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
      monthlyNeeded = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining;
    }
    return { ...g, target_amount: target, current_amount: current, contributions: g.contributions || [], progress_percent: Math.min(progress, 100), remaining, months_left: monthsLeft, monthly_needed: monthlyNeeded };
  });
}

// ═══════════════ BUDGETS ═══════════════

export async function upsertBudget(input: { category_name: string; budget_amount: number; period_month: number; period_year: number; notes?: string }) {
  return withAuth(async (supabase) => {
    if (!input.category_name?.trim()) throw new Error("Danh mục là bắt buộc");
    if (!input.budget_amount || input.budget_amount <= 0) throw new Error("Ngân sách phải lớn hơn 0");

    const { error } = await supabase.from("budgets").upsert(
      { category_name: input.category_name.trim(), budget_amount: input.budget_amount, period_month: input.period_month, period_year: input.period_year, notes: input.notes || null },
      { onConflict: "category_name,period_month,period_year" },
    );
    if (error) throw new Error(`Lỗi lưu ngân sách: ${error.message}`);
    revalidatePath("/finance/expenses");
    return null;
  });
}

export async function deleteBudget(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa ngân sách: ${error.message}`);
    revalidatePath("/finance/expenses");
    return null;
  });
}

export async function getBudgetsWithActuals(month: number, year: number) {
  return withAuth(async (supabase) => {
    const { data: budgets, error: bErr } = await supabase
      .from("budgets")
      .select("id, category_name, budget_amount, period_month, period_year, notes, created_at, updated_at")
      .eq("period_month", month).eq("period_year", year).order("category_name");
    if (bErr) throw new Error(`Lỗi tải ngân sách: ${bErr.message}`);

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const { data: expenses, error: eErr } = await supabase.from("expenses").select("category_name, expense_amount").gte("expense_date", startDate).lt("expense_date", endDate);
    if (eErr) throw new Error(`Lỗi tải chi phí: ${eErr.message}`);

    const actualByCategory: Record<string, number> = {};
    (expenses || []).forEach((e: { category_name: string; expense_amount: number }) => {
      const cat = e.category_name || "Khác";
      actualByCategory[cat] = (actualByCategory[cat] || 0) + (e.expense_amount || 0);
    });

    return (budgets || []).map((b: { category_name: string; budget_amount: number; [k: string]: unknown }) => {
      const actual = actualByCategory[b.category_name] || 0;
      return { ...b, actual_spent: actual, usage_percent: b.budget_amount > 0 ? Math.round((actual / b.budget_amount) * 100) : 0 };
    });
  });
}
