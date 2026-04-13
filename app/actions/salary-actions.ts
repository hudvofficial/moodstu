"use server";

import { withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { checkPeriodLock, firstDayOfMonth } from "@/lib/finance-utils";
import type { SupabaseClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════
// Salary Adjustment Actions — Hardened V2
// ═══════════════════════════════════════════

interface AdjustmentData {
  employee_salary_id: string;
  type: "bonus" | "penalty";
  amount: number;
  reason: string;
  date?: string;
}

async function recalculateEmployeeSalary(supabase: SupabaseClient, employeeSalaryId: string) {
  const { data: adjustments } = await supabase
    .from("salary_adjustments")
    .select("amount, type")
    .eq("employee_salary_id", employeeSalaryId);

  let totalBonus = 0;
  let totalPenalty = 0;
  adjustments?.forEach((adj: { type: string; amount: number }) => {
    if (adj.type === "bonus") totalBonus += adj.amount || 0;
    if (adj.type === "penalty") totalPenalty += adj.amount || 0;
  });

  const { data: currentSalary } = await supabase
    .from("employee_salaries")
    .select("id, base_salary, product_salary, advance_payment, monthly_salary_id")
    .eq("id", employeeSalaryId)
    .single();
    
  if (!currentSalary) throw new Error("Không tìm thấy bản ghi lương nhân viên");

  const base = currentSalary.base_salary || 0;
  const product = currentSalary.product_salary || 0;
  const advance = currentSalary.advance_payment || 0;
  const newTotal = base + product + totalBonus - totalPenalty;
  const newNet = newTotal - advance;

  const { error: updateError } = await supabase
    .from("employee_salaries")
    .update({ 
      bonus: totalBonus, 
      penalty: totalPenalty, 
      total_salary: newTotal, 
      net_salary: newNet, 
      updated_at: new Date().toISOString() 
    })
    .eq("id", employeeSalaryId);
    
  if (updateError) throw updateError;

  const { data: allSalaries } = await supabase
    .from("employee_salaries")
    .select("net_salary")
    .eq("monthly_salary_id", currentSalary.monthly_salary_id);
    
  const totalMonth = allSalaries?.reduce((sum: number, item: { net_salary: number }) => sum + (item.net_salary || 0), 0) || 0;

  const { error: monthUpdateError } = await supabase
    .from("monthly_salaries")
    .update({ total_salary: totalMonth, updated_at: new Date().toISOString() })
    .eq("id", currentSalary.monthly_salary_id);
    
  if (monthUpdateError) throw monthUpdateError;
}

export async function addSalaryAdjustment(data: AdjustmentData) {
  return withAdmin(async (supabase, userId) => {
    if (data.amount <= 0) throw new Error("Số tiền điều chỉnh phải > 0");
    if (!data.reason?.trim()) throw new Error("Lý do không được để trống");

    // W3: Period lock — fetch salary month/year
    const { data: salaryRecord } = await supabase.from("employee_salaries").select("month, year").eq("id", data.employee_salary_id).single();
    if (salaryRecord) {
      await checkPeriodLock(supabase, firstDayOfMonth(salaryRecord.month, salaryRecord.year));
    }

    const { error: insertError } = await supabase.from("salary_adjustments").insert({
      employee_salary_id: data.employee_salary_id, 
      type: data.type, 
      amount: data.amount,
      reason: data.reason, 
      date: data.date || new Date().toISOString().split("T")[0], 
      created_by: userId,
    });
    
    if (insertError) throw new Error(`Lỗi thêm điều chỉnh: ${insertError.message}`);

    // FIX B5: Do not swallow recalculation errors. Bubble them up to the client via withAdmin boundary.
    await recalculateEmployeeSalary(supabase, data.employee_salary_id);

    await writeAuditLog({ 
      action: "CREATE", 
      tableName: "salary_adjustments", 
      recordId: data.employee_salary_id, 
      description: `Thêm ${data.type === "bonus" ? "thưởng" : "phạt"}: ${data.amount.toLocaleString("vi-VN")}₫ - ${data.reason}` 
    });
    
    revalidatePath("/finance");
    return null;
  });
}

export async function deleteSalaryAdjustment(id: string, salaryId: string) {
  return withAdmin(async (supabase) => {
    // W3: Period lock — TRƯỚC mutation (C1 audit fix)
    const { data: salaryRecord } = await supabase.from("employee_salaries").select("month, year").eq("id", salaryId).single();
    if (salaryRecord) {
      await checkPeriodLock(supabase, firstDayOfMonth(salaryRecord.month, salaryRecord.year));
    }

    const { data: oldData } = await supabase
      .from("salary_adjustments")
      .select("amount, type, reason")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Không tìm thấy khoản điều chỉnh cần xóa.");

    const { error: deleteError } = await supabase.from("salary_adjustments").delete().eq("id", id);
    if (deleteError) throw new Error(`Lỗi xóa điều chỉnh: ${deleteError.message}`);

    // FIX B5: Fail fast if recalculation fails
    await recalculateEmployeeSalary(supabase, salaryId);

    await writeAuditLog({ 
      action: "DELETE", 
      tableName: "salary_adjustments", 
      recordId: id, 
      oldData: oldData as unknown as Record<string, unknown>,
      description: `Xóa khoản điều chỉnh lương #${id.substring(0, 8)}` 
    });
    
    revalidatePath("/finance");
    return null;
  });
}
