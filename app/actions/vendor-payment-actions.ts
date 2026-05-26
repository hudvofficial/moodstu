"use server";

import { revalidatePath } from "next/cache";
import { withAdmin } from "@/lib/auth_utils";
import { writeAuditLog } from "@/lib/audit";
import { checkPeriodLock } from "@/lib/finance-utils";
import { z } from "zod";

// ═══════════════════════════════════════════
// Vendor Payment Actions
// ═══════════════════════════════════════════

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface VendorPaymentInput {
  vendor_id: string;
  amount: number;
  payment_method: "tien_mat" | "chuyen_khoan" | "the" | "khac";
  payment_date: string; // ISO date string
  note?: string;
  allocations?: Array<{
    work_task_id: string;
    amount: number;
  }>;
}

export interface VendorDebtItem {
  vendor_id: string;
  vendor_name: string;
  vendor_phone: string | null;
  service_type: string | null;
  task_count: number;
  total_cost: number;
  total_paid: number;
  remaining: number;
  last_task_date: string | null;
  last_payment_date: string | null;
}

export interface VendorUnpaidTask {
  id: string;
  contract_id: string;
  contract_code: string | null;
  work_type: string;
  deadline: string | null;
  cost: number;
  allocated: number;
  remaining: number;
}

export interface VendorPaymentResult {
  payment_id: string;
  allocated_amount: number;
  unallocated_amount: number;
}

// ═══════════════════════════════════════════
// Validation Schemas
// ═══════════════════════════════════════════

const vendorPaymentSchema = z.object({
  vendor_id: z.string().uuid("Vendor ID không hợp lệ"),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  payment_method: z.enum(["tien_mat", "chuyen_khoan", "the", "khac"], {
    message: "Phương thức thanh toán không hợp lệ",
  }),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày thanh toán không đúng định dạng"),
  note: z.string().optional(),
  allocations: z
    .array(
      z.object({
        work_task_id: z.string().uuid("Task ID không hợp lệ"),
        amount: z.number().positive("Số tiền phân bổ phải lớn hơn 0"),
      })
    )
    .optional(),
});

// ═══════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════

/**
 * Record a payment to a vendor with FIFO or manual allocation
 */
export async function recordVendorPayment(
  rawData: unknown
): Promise<ActionResult<VendorPaymentResult>> {
  // Validate input
  const parsed = vendorPaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ",
    };
  }

  const input = parsed.data;

  return withAdmin(async (supabase, userId) => {
    // Check period lock
    await checkPeriodLock(supabase, input.payment_date);

    // Fetch vendor name for audit log
    const { data: vendor } = await supabase
      .from("vendors")
      .select("full_name")
      .eq("id", input.vendor_id)
      .single();

    if (!vendor) {
      throw new Error("Không tìm thấy vendor");
    }

    // Prepare allocations for RPC
    const allocationsJson = input.allocations
      ? JSON.stringify(
          input.allocations.map((a) => ({
            work_task_id: a.work_task_id,
            amount: a.amount,
          }))
        )
      : null;

    // Call atomic RPC
    const { data: result, error } = await supabase.rpc("record_vendor_payment_atomic", {
      p_vendor_id: input.vendor_id,
      p_amount: input.amount,
      p_payment_method: input.payment_method,
      p_payment_date: input.payment_date,
      p_note: input.note || null,
      p_allocations: allocationsJson,
      p_actor_id: userId,
    });

    if (error || !result) {
      throw new Error(`Không thể ghi nhận thanh toán: ${error?.message || "Unknown"}`);
    }

    // Tạo Phiếu chi (Auto-Expense)
    const { error: expenseError } = await supabase.from("expenses").insert({
      expense_date: input.payment_date,
      amount: input.amount,
      payment_method: input.payment_method,
      recipient: vendor.full_name,
      description: `[Auto-Vendor] Thanh toán công nợ - ${vendor.full_name}${input.note ? ` (${input.note})` : ""}`,
      created_by: userId
    });

    if (expenseError) {
      throw new Error(`Đã trừ công nợ nhưng lỗi khi tạo Phiếu chi: ${expenseError.message}`);
    }

    // Audit log
    await writeAuditLog({
      action: "CREATE",
      tableName: "vendor_payments",
      recordId: result.payment_id,
      description: `Thanh toán ${input.amount.toLocaleString()}đ cho vendor ${vendor.full_name}`,
    });

    // Revalidate paths
    revalidatePath("/finance/vendor-debts");
    revalidatePath("/finance/salaries"); // Has vendor tab
    revalidatePath("/finance/dashboard");

    return {
      payment_id: result.payment_id,
      allocated_amount: result.allocated_amount,
      unallocated_amount: result.unallocated_amount,
    };
  });
}

/**
 * Fetch vendor debt summary (vendors with unpaid balances)
 */
export async function fetchVendorDebtSummary(): Promise<ActionResult<VendorDebtItem[]>> {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase.rpc("finance_vendor_debt_summary");

    if (error) {
      throw new Error(`Không thể tải danh sách công nợ: ${error.message}`);
    }

    return (data || []) as VendorDebtItem[];
  });
}

/**
 * Fetch unpaid tasks for a specific vendor
 */
export async function fetchVendorUnpaidTasks(
  vendorId: string
): Promise<ActionResult<VendorUnpaidTask[]>> {
  if (!vendorId) {
    return {
      success: false,
      error: "Vendor ID không được để trống",
    };
  }

  return withAdmin(async (supabase) => {
    // Get completed work_tasks for this vendor
    const { data: tasks, error: tasksError } = await supabase
      .from("work_tasks")
      .select(
        `
        id,
        contract_id,
        work_type,
        deadline,
        cost,
        contracts!inner(contract_code)
      `
      )
      .eq("vendor_id", vendorId)
      .eq("status", "hoan_thanh")
      .gt("cost", 0)
      .order("deadline", { ascending: true, nullsFirst: false });

    if (tasksError) {
      throw new Error(`Không thể tải danh sách task: ${tasksError.message}`);
    }

    if (!tasks || tasks.length === 0) {
      return [];
    }

    // Get allocated amounts for each task
    const taskIds = tasks.map((t) => t.id);
    const { data: allocations } = await supabase
      .from("vendor_payment_allocations")
      .select("work_task_id, amount")
      .in("work_task_id", taskIds);

    // Calculate remaining for each task
    const allocationMap = new Map<string, number>();
    allocations?.forEach((a) => {
      const current = allocationMap.get(a.work_task_id) || 0;
      allocationMap.set(a.work_task_id, current + (a.amount || 0));
    });

    const unpaidTasks: VendorUnpaidTask[] = tasks
      .map((task) => {
        const allocated = allocationMap.get(task.id) || 0;
        const remaining = (task.cost || 0) - allocated;

        return {
          id: task.id,
          contract_id: task.contract_id,
          contract_code: Array.isArray(task.contracts) ? task.contracts[0]?.contract_code || null : null,
          work_type: task.work_type,
          deadline: task.deadline,
          cost: task.cost || 0,
          allocated,
          remaining,
        };
      })
      .filter((t) => t.remaining > 0); // Only return tasks with remaining balance

    return unpaidTasks;
  });
}

/**
 * Fetch vendor payment history
 */
export async function fetchVendorPaymentHistory(
  vendorId: string
): Promise<ActionResult<any[]>> {
  if (!vendorId) {
    return {
      success: false,
      error: "Vendor ID không được để trống",
    };
  }

  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("vendor_payments")
      .select(
        `
        id,
        amount,
        payment_method,
        payment_date,
        note,
        created_at,
        created_by
      `
      )
      .eq("vendor_id", vendorId)
      .is("deleted_at", null)
      .order("payment_date", { ascending: false });

    if (error) {
      throw new Error(`Không thể tải lịch sử thanh toán: ${error.message}`);
    }

    return data || [];
  });
}
