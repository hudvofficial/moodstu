"use server";

import { withAdmin } from "@/lib/auth_utils";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { checkPeriodLock, firstDayOfMonth } from "@/lib/finance-utils";
import { formatVnd } from "@/lib/utils";
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

type WorkProgressRow = {
  assigned_to: string | null;
  vendor_id?: string | null;
  cost: number | null;
  // join nhiều-về-một: PostgREST trả OBJECT, không phải mảng — bản cũ truy cập [0] nên mã HĐ luôn ra "Không mã"
  contracts: { contract_code: string | null } | null;
};

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
    .select("id, base_salary, product_salary, advance_payment, monthly_salary_id, paid_amount")
    .eq("id", employeeSalaryId)
    .single();

  if (!currentSalary) throw new Error("Không tìm thấy bản ghi lương nhân viên");

  const base = currentSalary.base_salary || 0;
  const product = currentSalary.product_salary || 0;
  const advance = currentSalary.advance_payment || 0;
  const paid = Number(currentSalary.paid_amount) || 0;
  const newTotal = base + product + totalBonus - totalPenalty;
  const newNet = newTotal - advance;

  const { error: updateError } = await supabase
    .from("employee_salaries")
    .update({
      bonus: totalBonus,
      penalty: totalPenalty,
      total_salary: newTotal,
      net_salary: newNet,
      // M5: còn lại đi theo thực nhận mới (trước đây thưởng/phạt đổi net mà remaining đứng yên)
      remaining_amount: Math.max(0, newNet - paid),
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
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
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
      description: `Thêm ${data.type === "bonus" ? "thưởng" : "phạt"}: ${formatVnd(data.amount)} - ${data.reason}`
    });

    revalidatePath("/finance");
    return null;
  });
}

export async function deleteSalaryAdjustment(id: string, salaryId: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
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

export async function payEmployeeSalaryAction(salaryId: string, amount: number, paymentMethod: "tien_mat" | "chuyen_khoan" = "chuyen_khoan") {
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    if (amount <= 0) throw new Error("Số tiền thanh toán phải > 0");
    const { data: salaryRecord } = await supabase.from("employee_salaries").select("*, employees(full_name)").eq("id", salaryId).single();
    if (!salaryRecord) throw new Error("Không tìm thấy bản ghi lương");

    await checkPeriodLock(supabase, firstDayOfMonth(salaryRecord.month, salaryRecord.year));

    const currentPaid = Number(salaryRecord.paid_amount) || 0;
    const currentRemaining = Number(salaryRecord.remaining_amount ?? (salaryRecord.net_salary ?? 0) - currentPaid) || 0;
    if (currentRemaining <= 0) {
      throw new Error("Bang luong nay da duoc thanh toan het.");
    }
    if (amount > currentRemaining) {
      throw new Error("So tien thanh toan vuot qua so tien con lai.");
    }

    // ADR-016 M5 (T-20260827-luong-cung-m5): trả lương = phiếu chi thật + phân bổ 'employee_salary' vào dòng lương,
    // đi qua RPC atomic dùng chung với trả task ekip (trước: 2 bước không atomic, không phân bổ).
    // paid_amount/remaining_amount của dòng lương do RPC dẫn xuất từ phân bổ (sync_employee_salary_paid).
    const employeeName = salaryRecord.employees?.full_name || "Nhân viên";
    const { error: rpcError } = await supabase.rpc("record_payee_payment_atomic", {
      p_payee_type: "employee",
      p_payee_id: salaryRecord.employee_id,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_payment_date: new Date().toISOString().split("T")[0],
      p_note: `[Auto-Salary] Thanh toán lương tháng ${salaryRecord.month}/${salaryRecord.year} - ${employeeName}`,
      p_allocations: [{ target_id: salaryId, amount }],
      p_actor_id: userId,
    });
    if (rpcError) throw new Error(`Không thể thanh toán lương: ${rpcError.message}`);
    const newPaid = currentPaid + amount;

    await writeAuditLog({
      action: "UPDATE",
      tableName: "employee_salaries",
      recordId: salaryId,
      description: `Thanh toán lương: +${formatVnd(amount)}. Đã trả: ${formatVnd(newPaid)}`
    });

    revalidatePath("/finance/salaries");
    return null;
  });
}

export async function deleteEmployeeMonthlySalaryAction(salaryId: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    // employee_salaries KHÔNG có cột employee_name — bản cũ select cột đó nên
    // query lỗi → salaryRecord luôn null → "Không tìm thấy bản ghi lương" →
    // chức năng xoá bảng lương chưa từng chạy được. Lấy tên qua employee_id.
    const { data: salaryRecord } = await supabase.from("employee_salaries").select("month, year, employee_id, monthly_salary_id").eq("id", salaryId).single();
    if (!salaryRecord) throw new Error("Không tìm thấy bản ghi lương");
    const { data: salaryEmployee } = await supabase.from("employees").select("full_name").eq("id", salaryRecord.employee_id).maybeSingle();

    await checkPeriodLock(supabase, firstDayOfMonth(salaryRecord.month, salaryRecord.year));

    const { error: deleteError } = await supabase.from("employee_salaries").delete().eq("id", salaryId);
    if (deleteError) throw deleteError;

    // Recalculate monthly total
    const { data: allSalaries } = await supabase
      .from("employee_salaries")
      .select("net_salary")
      .eq("monthly_salary_id", salaryRecord.monthly_salary_id as string);

    const totalMonth = allSalaries?.reduce((sum: number, item: { net_salary: number | null }) => sum + (item.net_salary || 0), 0) || 0;
    const countRem = allSalaries?.length || 0;

    await supabase.from("monthly_salaries")
      .update({ total_salary: totalMonth, total_employees: countRem, updated_at: new Date().toISOString() })
      .eq("id", salaryRecord.monthly_salary_id as string);

    await writeAuditLog({
      action: "DELETE",
      tableName: "employee_salaries",
      recordId: salaryId,
      description: `Xóa bảng lương của nhân sự: ${salaryEmployee?.full_name || salaryRecord.employee_id}`
    });

    revalidatePath("/finance/salaries");
    return null;
  });
}

// ═══════════════════════════════════════════
// Salary Generation (Phase 03 - V2 Optimized)
// ═══════════════════════════════════════════

export async function validatePayrollWarningsAction(month: number, year: number) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    try {
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

      const { data: workProgress, error: wpErr } = await supabase
        .from("work_tasks")
        .select("assigned_to, vendor_id, cost, contracts(contract_code)")
        .eq("status", "Hoàn thành")
        .gte("deadline", startOfMonth)
        .lte("deadline", endOfMonth);

      if (wpErr) throw wpErr;

      const unassignedTasks: string[] = [];
      const zeroCostTasks: string[] = [];

      workProgress?.forEach((task: WorkProgressRow) => {
        const contractRef = task.contracts?.contract_code || "Hợp đồng (Không mã)";
        if (task.vendor_id) return; // Vendor tasks do not affect employee payroll

        if (!task.assigned_to) {
          unassignedTasks.push(contractRef);
        }
        if (task.cost === 0) {
          zeroCostTasks.push(contractRef);
        }
      });

      return {
        success: true,
        warnings: {
          unassignedTasks: Array.from(new Set(unassignedTasks)),
          zeroCostTasks: Array.from(new Set(zeroCostTasks))
        }
      };
    } catch (error: unknown) {
      console.error("Lỗi validate payroll:", error);
      const message = error instanceof Error
        ? error.message
        : (typeof error === "object" && error !== null && "message" in error)
          ? String((error as { message: unknown }).message)
          : "Lỗi hệ thống khi check dữ liệu";
      return { success: false, error: message };
    }
  });
}

export async function generateMonthlySalaryAction(month: number, year: number) {
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    try {
      // 1. Check Period Lock (Data Integrity)
      const dateString = `${year}-${String(month).padStart(2, "0")}-01`;
      await checkPeriodLock(supabase, dateString);

      // 2. Resolve Monthly Salary Record
      let monthlySalaryId: string;
      const { data: existingMonthly, error: findMonthErr } = await supabase
        .from("monthly_salaries")
        .select("id")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (findMonthErr && findMonthErr.code !== "PGRST116") throw findMonthErr;

      if (!existingMonthly) {
        const { data: newMonth, error: createMonthErr } = await supabase
          .from("monthly_salaries")
          .insert({
            salary_code: `BL-${year}-${String(month).padStart(2, "0")}`,
            month,
            year,
            total_salary: 0,
            total_employees: 0,
            created_by: userId,
          })
          .select("id")
          .single();

        if (createMonthErr) throw createMonthErr;
        monthlySalaryId = newMonth.id;
      } else {
        monthlySalaryId = existingMonthly.id;
      }

      // Check if salaries already generated
      const { count: existsCount, error: countErr } = await supabase
        .from("employee_salaries")
        .select("id", { count: "exact", head: true })
        .eq("monthly_salary_id", monthlySalaryId);

      if (countErr) throw countErr;
      if (existsCount && existsCount > 0) {
        throw new Error("Bảng lương cho tháng này đã được khởi tạo.");
      }

      // 3. Extract Work Progress data for Product Salary calculations
      const startOfMonth = new Date(year, month - 1, 1).toISOString();
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

      const { data: workProgress, error: wpErr } = await supabase
        .from("work_tasks")
        .select("assigned_to, vendor_id, cost, contracts(contract_code)")
        .eq("status", "Hoàn thành")
        .gte("deadline", startOfMonth)
        .lte("deadline", endOfMonth);

      if (wpErr) throw wpErr;

      // Group costs by employee
      const taskMap: Record<string, number> = {};
      let hasWarnings = false;
      const unassignedTasks: Set<string> = new Set();
      const zeroCostTasks: Set<string> = new Set();

      workProgress?.forEach((task: WorkProgressRow) => {
        const contractRef = task.contracts?.contract_code || "Hợp đồng (Không mã)";
        if (task.vendor_id) return; // Vendor tasks do not affect employee payroll

        if (!task.assigned_to) {
          unassignedTasks.add(contractRef);
          hasWarnings = true;
        } else {
          taskMap[task.assigned_to] = (taskMap[task.assigned_to] || 0) + (task.cost || 0);
        }
        if (task.cost === 0) {
          zeroCostTasks.add(contractRef);
          hasWarnings = true;
        }
      });

      // 4. Fetch Active Employees (including Freelancers/CTV) & insert
      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .eq("status", "active");

      if (empErr) throw empErr;
      if (!employees || employees.length === 0) {
        throw new Error("Không tìm thấy nhân viên nào có status='active'. Vui lòng kiểm tra: (1) Nhân viên/CTV có status='active', (2) Chạy query: SELECT * FROM employees WHERE deleted_at IS NULL AND status='active'");
      }

      // Log employee breakdown for debugging
      const employeesByRole = employees.reduce((acc: Record<string, number>, emp) => {
        const role = emp.role || "unknown";
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
      const roleBreakdownLog = Object.entries(employeesByRole)
        .map(([role, count]) => `${role}=${count}`)
        .join(", ");
      console.log(`[Salary Generation] Processing ${employees.length} employees (${roleBreakdownLog})`);

      // ADR-016 M5: sheet chỉ có dòng cho người có lương cơ bản > 0 — CTV/ekip công theo HĐ trả theo task
      // ở Phải trả › Ekip, không sinh dòng 0đ.
      const parseSalaryInfo = (raw: unknown) => (typeof raw === "string" ? JSON.parse(raw) : (raw || {})) as { base_salary?: unknown };
      const salaried = employees.filter((emp) => (Number(parseSalaryInfo(emp.salary_info)?.base_salary) || 0) > 0);
      if (salaried.length === 0) {
        throw new Error("Chưa nhân viên nào có lương cơ bản (Nhân viên › Thông tin lương). Ekip công theo hợp đồng trả ở Phải trả › Ekip.");
      }

      const newRecords = salaried.map((emp) => {
        const salaryInfoObj = parseSalaryInfo(emp.salary_info);

        const totalBase = Number(salaryInfoObj?.base_salary) || 0;
        // ADR-016 M3 (T-20260826-tien-ekip-va-can-thu): công theo hợp đồng (work_tasks.cost) trả theo TỪNG TASK
        // ở /finance/payables › Ekip (phiếu chi payee_type='employee' + expense_allocations). Sheet lương tháng
        // chỉ còn lương cứng → product_salary = 0 để không trả trùng. taskMap vẫn tính để giữ cảnh báo task chưa gán / 0 cost.
        void taskMap;
        const productSalary = 0;
        const total = totalBase + productSalary;

        return {
          monthly_salary_id: monthlySalaryId,
          employee_id: emp.id,
          base_salary: totalBase,
          product_salary: productSalary,
          year,
          month,
          total_salary: total,
          net_salary: total,
          bonus: 0,
          penalty: 0,
          advance_payment: 0,
          paid_amount: 0,
          remaining_amount: total,
        };
      });

      const { error: insertErr } = await supabase.from("employee_salaries").insert(newRecords);
      if (insertErr) throw insertErr;

      // Update Summary
      const totalSalaries = newRecords.reduce((sum, r) => sum + r.total_salary, 0);
      const { error: sumErr } = await supabase.from("monthly_salaries")
        .update({ total_salary: totalSalaries, total_employees: newRecords.length })
        .eq("id", monthlySalaryId);

      if (sumErr) throw sumErr;

      // 5. Audit Logging (System Pattern)
      await writeAuditLog({
        action: "CREATE",
        tableName: "monthly_salaries",
        recordId: monthlySalaryId,
        description: `Khởi tạo bảng lương tháng ${month}/${year} cho ${newRecords.length} nhân sự. Tổng quỹ lương: ${formatVnd(totalSalaries)}`,
      });

      revalidatePath("/finance/salaries");

      const roleBreakdown = Object.entries(employeesByRole)
        .map(([role, count]) => {
          const labels: Record<string, string> = { admin: "Admin", manager: "QL", sale: "Sale", media: "Media", ctv: "CTV" };
          return `${labels[role] || role}: ${count}`;
        })
        .join(", ");

      return {
        success: true,
        message: hasWarnings
          ? `Tạo thành công ${newRecords.length} bảng lương (${roleBreakdown}). CẢNH BÁO: Phát hiện Job hoàn thành chưa gán nhân sự hoặc lương 0đ.`
          : `Đã khởi tạo bảng lương thành công cho ${newRecords.length} nhân viên (${roleBreakdown})`
      };

    } catch (error: unknown) {
      console.error("Lỗi generate monthly salary:", error);
      const message = error instanceof Error
        ? error.message
        : (typeof error === "object" && error !== null && "message" in error)
          ? String((error as { message: unknown }).message)
          : "Lỗi hệ thống khi tạo lương";
      return { success: false, error: message };
    }
  });
}
