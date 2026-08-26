"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/types/database.types";
import { withAdmin, withFinanceRead } from "@/lib/auth_utils";
import { writeAuditLog } from "@/lib/audit";
import { asNumber, asString, checkPeriodLock } from "@/lib/finance-utils";
import type { ActionResult } from "@/types/action-result";
import {
  PAYEE_TYPES,
  type PayableItem,
  type PayableRow,
  type PayeePaymentHistoryItem,
  type PayeeType,
} from "@/types/payables";

// ADR-016 M2 — một đường trả tiền cho mọi đối tác ngoài (lab / thợ ngoài / NCC phôi):
// phiếu chi thật (expenses.payee_*) + expense_allocations, qua record_payee_payment_atomic.

type RpcRow = Record<string, unknown>;

function isPayeeType(value: unknown): value is PayeeType {
  return typeof value === "string" && (PAYEE_TYPES as readonly string[]).includes(value);
}

function revalidatePayableViews() {
  revalidatePath("/finance/payables");
  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  revalidatePath("/printing");
  revalidatePath("/printing/labs");
  revalidatePath("/contracts");
}

export async function fetchPayables(): Promise<ActionResult<PayableRow[]>> {
  return withFinanceRead(async (supabase: SupabaseClient<Database>) => {
    const { data, error } = await supabase.rpc("finance_payable_summary");
    if (error) throw new Error(`Lỗi tải công nợ phải trả: ${error.message}`);

    return ((data || []) as RpcRow[]).flatMap((row): PayableRow[] =>
      isPayeeType(row.payee_type) && row.payee_id
        ? [
            {
              payee_type: row.payee_type,
              payee_id: asString(row.payee_id),
              payee_name: asString(row.payee_name, "-"),
              item_count: asNumber(row.item_count),
              total_committed: asNumber(row.total_committed),
              total_paid: asNumber(row.total_paid),
              remaining: asNumber(row.remaining),
              last_item_date: asString(row.last_item_date, "") || null,
              last_payment_date: asString(row.last_payment_date, "") || null,
            },
          ]
        : [],
    );
  });
}

export async function fetchPayableItems(payeeType: PayeeType, payeeId: string): Promise<ActionResult<PayableItem[]>> {
  return withFinanceRead(async (supabase: SupabaseClient<Database>) => {
    if (!isPayeeType(payeeType) || !payeeId) throw new Error("Đối tác không hợp lệ");

    const { data, error } = await supabase.rpc("payable_items", { p_payee_type: payeeType, p_payee_id: payeeId });
    if (error) throw new Error(`Lỗi tải khoản phải trả: ${error.message}`);

    return ((data || []) as RpcRow[])
      .map((row) => ({
        target_type: asString(row.target_type),
        target_id: asString(row.target_id),
        item_date: asString(row.item_date, "") || null,
        label: asString(row.label, "-"),
        committed: asNumber(row.committed),
        allocated: asNumber(row.allocated),
        remaining: asNumber(row.remaining),
      }))
      .filter((item) => item.remaining > 0);
  });
}

const recordPayeePaymentSchema = z.object({
  payee_type: z.enum(PAYEE_TYPES, { message: "Loại đối tác không hợp lệ" }),
  payee_id: z.string().uuid("Đối tác không hợp lệ"),
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  payment_method: z.enum(["tien_mat", "chuyen_khoan"], { message: "Phương thức thanh toán không hợp lệ" }),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày thanh toán không đúng định dạng"),
  note: z.string().optional(),
  allocations: z
    .array(
      z.object({
        target_id: z.string().uuid("Khoản phải trả không hợp lệ"),
        amount: z.number().positive("Số tiền phân bổ phải lớn hơn 0"),
      }),
    )
    .optional(),
});

export async function recordPayeePayment(
  rawData: unknown,
): Promise<ActionResult<{ expense_id: string; allocated_amount: number }>> {
  const parsed = recordPayeePaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }
  const input = parsed.data;

  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    await checkPeriodLock(supabase, input.payment_date);

    const { data, error } = await supabase.rpc("record_payee_payment_atomic", {
      p_payee_type: input.payee_type,
      p_payee_id: input.payee_id,
      p_amount: input.amount,
      p_payment_method: input.payment_method,
      p_payment_date: input.payment_date,
      // p_note text KHÔNG có DEFAULT → generator khai bắt buộc, Postgres vẫn nhận NULL
      p_note: (input.note?.trim() || null) as string,
      // mảng thật (không JSON.stringify) — RPC vẫn tự parse nếu nhận chuỗi
      p_allocations: input.allocations ?? [],
      p_actor_id: userId,
    });
    if (error || !data) throw new Error(`Không thể ghi nhận thanh toán: ${error?.message || "Unknown"}`);

    const result = data as unknown as { expense_id: string; allocated_amount: number };

    await writeAuditLog({
      action: "CREATE",
      tableName: "expenses",
      recordId: result.expense_id,
      source: "server_action",
      description: `Phiếu chi trả ${input.payee_type} ${input.amount.toLocaleString("vi-VN")}đ (${input.payment_date})`,
      newData: input as unknown as Record<string, unknown>,
    });

    revalidatePayableViews();
    return { expense_id: result.expense_id, allocated_amount: asNumber(result.allocated_amount) };
  });
}

export async function fetchPayeePaymentHistory(
  payeeType: PayeeType,
  payeeId: string,
): Promise<ActionResult<PayeePaymentHistoryItem[]>> {
  return withFinanceRead(async (supabase: SupabaseClient<Database>) => {
    if (!isPayeeType(payeeType) || !payeeId) throw new Error("Đối tác không hợp lệ");

    const { data, error } = await supabase.rpc("payee_payment_history", { p_payee_type: payeeType, p_payee_id: payeeId });
    if (error) throw new Error(`Lỗi tải lịch sử thanh toán: ${error.message}`);

    return ((data || []) as RpcRow[]).map((row) => ({
      id: asString(row.expense_id),
      expense_date: asString(row.expense_date),
      amount: asNumber(row.amount),
      payment_method: asString(row.payment_method, "chuyen_khoan"),
      note: asString(row.note, "") || null,
      created_at: asString(row.created_at, "") || null,
      allocations: Array.isArray(row.allocations)
        ? (row.allocations as RpcRow[]).map((a) => ({
            target_type: asString(a.target_type),
            target_id: asString(a.target_id),
            label: asString(a.label, "-"),
            amount: asNumber(a.amount),
          }))
        : [],
    }));
  });
}

const voidPayeePaymentSchema = z.object({
  expense_id: z.string().uuid("Phiếu chi không hợp lệ"),
});

export async function voidPayeePayment(rawData: unknown): Promise<ActionResult<{ expense_id: string }>> {
  const parsed = voidPayeePaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ" };
  }

  return withAdmin(async (supabase: SupabaseClient<Database>, userId) => {
    const { data, error } = await supabase.rpc("void_payee_payment_atomic", {
      p_expense_id: parsed.data.expense_id,
      p_actor_id: userId,
    });
    if (error || !data) throw new Error(`Không thể huỷ phiếu chi: ${error?.message || "Unknown"}`);

    const result = data as unknown as { expense_id: string; payee_type: string; amount: number };

    await writeAuditLog({
      action: "DELETE",
      tableName: "expenses",
      recordId: result.expense_id,
      source: "server_action",
      description: `Huỷ phiếu chi trả ${result.payee_type} ${asNumber(result.amount).toLocaleString("vi-VN")}đ`,
      oldData: result as unknown as Record<string, unknown>,
    });

    revalidatePayableViews();
    return { expense_id: result.expense_id };
  });
}
