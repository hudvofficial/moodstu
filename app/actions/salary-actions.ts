"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog, logError } from "@/lib/audit";

// ═══════════════════════════════════════════
// Salary Adjustment Actions — Bonus/Penalty + Recalculation
// Split from employee-actions.ts (389 lines)
// ═══════════════════════════════════════════

interface AdjustmentData {
  employee_salary_id: string;
  type: "bonus" | "penalty";
  amount: number;
  reason: string;
  date?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalculateEmployeeSalary(supabase: any, employeeSalaryId: string) {
  const { data: adjustments } = await supabase.from("salary_adjustments").select("amount, type").eq("employee_salary_id", employeeSalaryId);

  let totalBonus = 0;
  let totalPenalty = 0;
  adjustments?.forEach((adj: { type: string; amount: number }) => {
    if (adj.type === "bonus") totalBonus += adj.amount || 0;
    if (adj.type === "penalty") totalPenalty += adj.amount || 0;
  });

  const { data: currentSalary } = await supabase.from("employee_salaries").select("id, base_salary, product_salary, advance_payment, monthly_salary_id").eq("id", employeeSalaryId).single();
  if (!currentSalary) throw new Error("Không tìm thấy bản ghi lương nhân viên");

  const base = currentSalary.base_salary || 0;
  const product = currentSalary.product_salary || 0;
  const advance = currentSalary.advance_payment || 0;
  const newTotal = base + product + totalBonus - totalPenalty;
  const newNet = newTotal - advance;

  const { error: updateError } = await supabase.from("employee_salaries").update({ bonus: totalBonus, penalty: totalPenalty, total_salary: newTotal, net_salary: newNet, updated_at: new Date().toISOString() }).eq("id", employeeSalaryId);
  if (updateError) throw updateError;

  const { data: allSalaries } = await supabase.from("employee_salaries").select("net_salary").eq("monthly_salary_id", currentSalary.monthly_salary_id);
  const totalMonth = allSalaries?.reduce((sum: number, item: { net_salary: number }) => sum + (item.net_salary || 0), 0) || 0;

  const { error: monthUpdateError } = await supabase.from("monthly_salaries").update({ total_salary: totalMonth }).eq("id", currentSalary.monthly_salary_id);
  if (monthUpdateError) throw monthUpdateError;
}

export async function addSalaryAdjustment(data: AdjustmentData) {
  return withAuth(async (supabase, userId) => {
    const { error: insertError } = await supabase.from("salary_adjustments").insert({
      employee_salary_id: data.employee_salary_id, type: data.type, amount: data.amount,
      reason: data.reason, date: data.date || new Date().toISOString().split("T")[0], created_by: userId,
    });
    if (insertError) throw new Error(`Lỗi thêm điều chỉnh: ${insertError.message}`);

    try { await recalculateEmployeeSalary(supabase, data.employee_salary_id); }
    catch (e) { logError({ error: e, context: "addSalaryAdjustment.recalculate", tableName: "salary_adjustments" }).catch(() => {}); }

    fireAuditLog({ action: "CREATE", tableName: "salary_adjustments", recordId: data.employee_salary_id, description: `Thêm ${data.type === "bonus" ? "thưởng" : "phạt"}: ${data.amount.toLocaleString()}đ - ${data.reason}` });
    revalidatePath("/finance/salaries");
    return null;
  });
}

export async function deleteSalaryAdjustment(id: string, salaryId: string) {
  return withAuth(async (supabase) => {
    const { error: deleteError } = await supabase.from("salary_adjustments").delete().eq("id", id);
    if (deleteError) throw new Error(`Lỗi xóa điều chỉnh: ${deleteError.message}`);

    try { await recalculateEmployeeSalary(supabase, salaryId); }
    catch (e) { logError({ error: e, context: "deleteSalaryAdjustment.recalculate", tableName: "salary_adjustments" }).catch(() => {}); }

    fireAuditLog({ action: "DELETE", tableName: "salary_adjustments", recordId: id, description: `Xóa khoản điều chỉnh lương`, severity: "WARNING" });
    revalidatePath("/finance/salaries");
    return null;
  });
}
