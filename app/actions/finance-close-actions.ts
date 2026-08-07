"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { withAdmin } from "@/lib/auth_utils";
import { writeAuditLog } from "@/lib/audit";
import { isMissingRpcError } from "@/lib/finance-utils";
import { createCloseSchema } from "@/lib/validations/finance.schema";
import type { CloseDetailData, CloseListItem } from "@/types/finance-operations";

type AdminSupabase = Parameters<Parameters<typeof withAdmin>[0]>[0];

function monthRangeFromPeriod(period: string) {
  const [yearText, monthText] = period.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Ky chot so khong hop le.");
  }

  return { year, month, start, end };
}

async function buildCloseSnapshot(supabase: AdminSupabase, period: string) {
  const range = monthRangeFromPeriod(period);

  const [paymentsResult, receiptsResult, expensesResult, salaryResult, fixedCostsResult] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .is("deleted_at", null)
      .gte("payment_date", range.start)
      .lt("payment_date", range.end),
    supabase
      .from("receipts")
      .select("receipt_amount")
      .is("deleted_at", null)
      .is("contract_id", null)
      .gte("receipt_date", range.start)
      .lt("receipt_date", range.end),
    supabase
      .from("expenses")
      .select("amount")
      .is("deleted_at", null)
      .gte("expense_date", range.start)
      .lt("expense_date", range.end),
    supabase
      .from("monthly_salaries")
      .select("total_salary")
      .eq("month", range.month)
      .eq("year", range.year)
      .maybeSingle(),
    supabase
      .from("fixed_costs")
      .select("monthly_amount, start_date, end_date")
      .is("deleted_at", null),
  ]);

  const firstError =
    paymentsResult.error ||
    receiptsResult.error ||
    expensesResult.error ||
    salaryResult.error ||
    fixedCostsResult.error;

  if (firstError) {
    throw new Error(`Khong the tao snapshot chot so: ${firstError.message}`);
  }

  const paymentRevenue = (paymentsResult.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const standaloneReceiptRevenue = (receiptsResult.data || []).reduce((sum, row) => sum + (Number(row.receipt_amount) || 0), 0);
  const operatingOutflow = (expensesResult.data || []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const salaryCost = Number((salaryResult.data as { total_salary?: unknown } | null)?.total_salary) || 0;
  const fixedCost = (fixedCostsResult.data || []).reduce((sum, row) => {
    const amount = Number(row.monthly_amount) || 0;
    if (!amount) return sum;
    if (row.start_date && row.start_date >= range.end) return sum;
    if (row.end_date && row.end_date < range.start) return sum;
    return sum + amount;
  }, 0);
  const totalInflow = paymentRevenue + standaloneReceiptRevenue;
  const totalOutflow = operatingOutflow + salaryCost + fixedCost;

  return {
    period,
    totalInflow,
    totalOutflow,
    paymentRevenue,
    standaloneReceiptRevenue,
    operatingOutflow,
    salaryCost,
    fixedCost,
    netCashflow: totalInflow - totalOutflow,
    generatedAt: new Date().toISOString(),
  };
}

async function updateCloseSnapshot(supabase: AdminSupabase, closeId: string, period: string) {
  const { error } = await supabase
    .from("finance_monthly_closes")
    .update({ snapshot_metrics: await buildCloseSnapshot(supabase, period) })
    .eq("id", closeId);

  if (error) {
    throw new Error(`Khong the cap nhat snapshot chot so: ${error.message}`);
  }
}

function normalizeCloseTaskStatus(status: string) {
  return status === "dang_lam" ? "dang_thuc_hien" : status;
}

function revalidateCloseRoutes(closeId?: string) {
  revalidatePath("/finance");
  revalidatePath("/finance/closes");
  if (closeId) revalidatePath(`/finance/closes/${closeId}`);
}

export async function createMonthlyClose(period: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    const parsed = createCloseSchema.safeParse({ period });
    if (!parsed.success) {
      throw new Error(`Du lieu khong hop le: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`);
    }

    const snapshotMetrics = await buildCloseSnapshot(supabase, parsed.data.period);
    const { data: close, error } = await supabase
      .from("finance_monthly_closes")
      .insert({
        period: parsed.data.period,
        status: "draft",
        snapshot_metrics: snapshotMetrics,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error(`Ky chot so ${parsed.data.period} da ton tai.`);
      }
      throw new Error(`Loi tao ky chot so: ${error.message}`);
    }

    const steps = [
      { step_number: 1, step_name: "Kiểm kê quỹ tiền mặt" },
      { step_number: 2, step_name: "Đối soát ngân hàng" },
      { step_number: 3, step_name: "Xác nhận công nợ thẻ/tín dụng" },
      { step_number: 4, step_name: "Thanh toán lương nhân viên" },
      { step_number: 5, step_name: "Thanh toán/nhắc nợ đối tác" },
      { step_number: 6, step_name: "Khấu hao tài sản & phân bổ chi phí" },
      { step_number: 7, step_name: "Chốt báo cáo lãi lỗ (P&L)" },
      { step_number: 8, step_name: "Khóa sổ kỳ kế toán" },
    ];

    const { error: taskError } = await supabase
      .from("finance_close_tasks")
      .insert(
        steps.map((step) => ({
          close_id: close.id,
          step_number: step.step_number,
          step_name: step.step_name,
          status: "chua_bat_dau",
        })),
      );

    if (taskError) {
      throw new Error(`Loi khoi tao cac buoc chot so: ${taskError.message}`);
    }

    await writeAuditLog({
      action: "CREATE",
      tableName: "finance_monthly_closes",
      recordId: close.id,
      newData: { period: parsed.data.period },
      description: `Khoi tao ky chot so thang ${parsed.data.period}`,
    });

    revalidateCloseRoutes(close.id);
    return { closeId: close.id };
  });
}

export async function advanceCloseTask(closeId: string, stepNumber: number, newStatus: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    const nextStatus = normalizeCloseTaskStatus(newStatus);
    const { error } = await supabase.rpc("advance_close_task", {
      p_close_id: closeId,
      p_step_number: stepNumber,
      p_new_status: nextStatus,
      p_actor_id: userId,
    });

    if (error && isMissingRpcError(error)) {
      const { data: close, error: closeError } = await supabase
        .from("finance_monthly_closes")
        .select("status, period")
        .eq("id", closeId)
        .single();

      if (closeError || !close) {
        throw new Error(`Khong tim thay ky chot so: ${closeError?.message || ""}`);
      }
      if (close.status === "locked") {
        throw new Error("Ky da khoa so, khong the thay doi.");
      }

      if (stepNumber > 1) {
        const { data: previousTask, error: previousError } = await supabase
          .from("finance_close_tasks")
          .select("status")
          .eq("close_id", closeId)
          .eq("step_number", stepNumber - 1)
          .single();

        if (previousError || normalizeCloseTaskStatus(previousTask?.status || "") !== "hoan_thanh") {
          throw new Error(`Buoc ${stepNumber - 1} chua hoan thanh.`);
        }
      }

      const { data: currentTask, error: currentError } = await supabase
        .from("finance_close_tasks")
        .select("status, started_at")
        .eq("close_id", closeId)
        .eq("step_number", stepNumber)
        .single();

      if (currentError || !currentTask) {
        throw new Error(`Khong tim thay buoc ${stepNumber}: ${currentError?.message || ""}`);
      }

      const currentStatus = normalizeCloseTaskStatus(currentTask.status || "");
      const allowed =
        (currentStatus === "chua_bat_dau" && nextStatus === "dang_thuc_hien") ||
        (currentStatus === "dang_thuc_hien" && nextStatus === "cho_duyet") ||
        (currentStatus === "cho_duyet" && (nextStatus === "hoan_thanh" || nextStatus === "co_van_de")) ||
        (currentStatus === "co_van_de" && nextStatus === "dang_thuc_hien");

      if (!allowed) {
        throw new Error(`Khong the chuyen tu ${currentStatus} sang ${nextStatus}.`);
      }

      const now = new Date().toISOString();
      const taskUpdate: Database["public"]["Tables"]["finance_close_tasks"]["Update"] = {
        status: nextStatus,
        updated_at: now,
      };
      if (nextStatus === "dang_thuc_hien" && !currentTask.started_at) taskUpdate.started_at = now;
      if (nextStatus === "hoan_thanh") taskUpdate.completed_at = now;

      const { error: taskError } = await supabase
        .from("finance_close_tasks")
        .update(taskUpdate)
        .eq("close_id", closeId)
        .eq("step_number", stepNumber);

      if (taskError) {
        throw new Error(`Khong the cap nhat buoc chot so: ${taskError.message}`);
      }

      const closeUpdate: Database["public"]["Tables"]["finance_monthly_closes"]["Update"] = stepNumber === 8 && nextStatus === "hoan_thanh"
        ? {
            status: "locked",
            locked_by: userId,
            locked_at: now,
            updated_at: now,
            snapshot_metrics: await buildCloseSnapshot(supabase, close.period),
          }
        : { status: close.status === "draft" ? "in_progress" : close.status, updated_at: now };

      const { error: closeUpdateError } = await supabase
        .from("finance_monthly_closes")
        .update(closeUpdate)
        .eq("id", closeId);

      if (closeUpdateError) {
        throw new Error(`Khong the cap nhat ky chot so: ${closeUpdateError.message}`);
      }

      await writeAuditLog({
        action: "UPDATE",
        tableName: "finance_close_tasks",
        description: `Cap nhat buoc ${stepNumber} chot so sang trang thai ${nextStatus}`,
      });

      revalidateCloseRoutes(closeId);
      return null;
    }

    if (error) {
      throw new Error(`Loi cap nhat trang thai: ${error.message}`);
    }

    if (stepNumber === 8 && nextStatus === "hoan_thanh") {
      const { data: close, error: closeError } = await supabase
        .from("finance_monthly_closes")
        .select("period")
        .eq("id", closeId)
        .single();

      if (closeError || !close) {
        throw new Error(`Khong tim thay ky chot so de cap nhat snapshot: ${closeError?.message || ""}`);
      }

      await updateCloseSnapshot(supabase, closeId, close.period);
    }

    await writeAuditLog({
      action: "UPDATE",
      tableName: "finance_close_tasks",
      description: `Cap nhat buoc ${stepNumber} chot so sang trang thai ${nextStatus}`,
    });

    revalidateCloseRoutes(closeId);
    return null;
  });
}

async function resolveEmployeeNames(
  supabase: AdminSupabase,
  userIds: (string | null)[]
): Promise<Record<string, string>> {
  const validIds = userIds.filter((id): id is string => id !== null);
  if (validIds.length === 0) return {};

  const { data: employees } = await supabase
    .from("employees")
    .select("auth_user_id, full_name")
    .in("auth_user_id", validIds);

  const map: Record<string, string> = {};
  employees?.forEach((employee) => {
    if (employee.auth_user_id) map[employee.auth_user_id] = employee.full_name;
  });
  return map;
}

export async function getCloseDetail(closeId: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    const { data: close, error } = await supabase
      .from("finance_monthly_closes")
      .select("*")
      .eq("id", closeId)
      .single();

    if (error) {
      throw new Error(`Loi tai ky chot so: ${error.message}`);
    }

    const { data: tasks, error: tasksError } = await supabase
      .from("finance_close_tasks")
      .select("*")
      .eq("close_id", closeId)
      .order("step_number", { ascending: true });

    if (tasksError) {
      throw new Error(`Loi tai chi tiet: ${tasksError.message}`);
    }

    const userIds = [
      close.locked_by,
      close.created_by,
      ...(tasks || []).map((task) => task.assignee_id),
    ];
    const nameMap = await resolveEmployeeNames(supabase, userIds);

    const detail: CloseDetailData = {
      close: {
        ...close,
        locked_user_name: close.locked_by ? (nameMap[close.locked_by] ?? null) : null,
        created_user_name: close.created_by ? (nameMap[close.created_by] ?? null) : null,
      },
      tasks: (tasks || []).map((task) => ({
        ...task,
        assignee_name: task.assignee_id ? (nameMap[task.assignee_id] ?? null) : null,
      })),
    };
    return detail;
  });
}

export async function listCloses(year?: number) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    let query = supabase
      .from("finance_monthly_closes")
      .select("*")
      .order("period", { ascending: false });

    if (year) {
      query = query.like("period", `${year}-%`);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Loi tai danh sach chot so: ${error.message}`);
    }

    const userIds = (data || []).map((close) => close.locked_by);
    const nameMap = await resolveEmployeeNames(supabase, userIds);

    return (data || []).map((close): CloseListItem => ({
      ...close,
      locked_user_name: close.locked_by ? (nameMap[close.locked_by] ?? null) : null,
    }));
  });
}
