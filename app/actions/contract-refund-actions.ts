"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import {
  requireContractDestructiveAccess,
  requireFinanceAccess,
  withAuth,
} from "@/lib/auth_utils";
import { writeAuditLog } from "@/lib/audit";
import { checkPeriodLock } from "@/lib/finance-utils";

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];

interface CreateContractRefundInput {
  contractId: string;
  amount: number;
  refundDate: string;
  paymentMethod: "tien_mat" | "chuyen_khoan";
  recipient?: string | null;
  notes?: string | null;
}

interface RefundExpenseRow {
  amount: number | null;
  description: string | null;
  category?: unknown;
}

function relationRecord(value: unknown): Record<string, unknown> | null {
  const item = Array.isArray(value) ? value[0] : value;
  return item && typeof item === "object" ? item as Record<string, unknown> : null;
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isRefundExpense(row: RefundExpenseRow) {
  const category = relationRecord(row.category);
  const marker = normalizeText([
    category?.category_code,
    category?.name,
    row.description,
  ].filter(Boolean).join(" "));

  return (
    marker.includes("contract_refund") ||
    marker.includes("refund") ||
    marker.includes("hoan_tien") ||
    marker.includes("hoan_tra")
  );
}

async function ensureRefundCategory(supabase: AdminSupabase) {
  const { data: existing, error: existingError } = await supabase
    .from("transaction_categories")
    .select("id")
    .eq("type", "chi")
    .in("category_code", ["contract_refund", "refund", "hoan_tien"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Không thể tải danh mục hoàn tiền: ${existingError.message}`);
  }

  if (existing?.id) return existing.id as string;

  const { data: created, error: createError } = await supabase
    .from("transaction_categories")
    .insert({
      category_code: "contract_refund",
      name: "Hoàn tiền hợp đồng",
      type: "chi",
      is_default: false,
    })
    .select("id")
    .single();

  if (createError || !created?.id) {
    throw new Error(`Không thể tạo danh mục hoàn tiền: ${createError?.message || "missing category"}`);
  }

  return created.id as string;
}

async function loadRefundSummary(supabase: AdminSupabase, contractId: string) {
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, contract_code, status, paid_amount, customer:customer_id(full_name)")
    .eq("id", contractId)
    .is("deleted_at", null)
    .single();

  if (contractError || !contract) {
    throw new Error(`Không tìm thấy hợp đồng: ${contractError?.message || ""}`);
  }

  const { data: expenses, error: expenseError } = await supabase
    .from("expenses")
    .select("amount, description, category:category_id(category_code, name)")
    .eq("contract_id", contractId)
    .is("deleted_at", null);

  if (expenseError) {
    throw new Error(`Không thể tải phiếu chi hoàn tiền: ${expenseError.message}`);
  }

  const refundedAmount = ((expenses || []) as RefundExpenseRow[])
    .filter(isRefundExpense)
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paidAmount = Number(contract.paid_amount || 0);
  const customer = relationRecord((contract as Record<string, unknown>).customer);

  return {
    contractId: contract.id as string,
    contractCode: String(contract.contract_code || ""),
    customerName: String(customer?.full_name || "Khách hàng"),
    status: String(contract.status || ""),
    paidAmount,
    refundedAmount,
    refundableAmount: Math.max(0, paidAmount - refundedAmount),
  };
}

export async function getContractRefundSummary(contractId: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractDestructiveAccess(supabase, userId);
    await requireFinanceAccess(supabase, userId);
    return loadRefundSummary(supabase, contractId);
  });
}

export async function createContractRefundExpense(input: CreateContractRefundInput) {
  const contractId = input.contractId?.trim();
  const amount = Number(input.amount || 0);
  const refundDate = input.refundDate?.trim();
  const paymentMethod = input.paymentMethod;
  const notes = input.notes?.trim() || null;

  if (!contractId) return { success: false as const, error: "Contract ID không hợp lệ" };
  if (!refundDate) return { success: false as const, error: "Ngày hoàn tiền là bắt buộc" };
  if (amount <= 0) return { success: false as const, error: "Số tiền hoàn phải lớn hơn 0" };
  if (paymentMethod !== "tien_mat" && paymentMethod !== "chuyen_khoan") {
    return { success: false as const, error: "Hình thức chi không hợp lệ" };
  }

  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractDestructiveAccess(supabase, userId);
    await requireFinanceAccess(supabase, userId);
    await checkPeriodLock(supabase, refundDate);

    const summary = await loadRefundSummary(supabase, contractId);
    if (summary.status !== "da_huy") {
      throw new Error("Chỉ tạo phiếu hoàn tiền sau khi hợp đồng đã hủy.");
    }
    if (amount > summary.refundableAmount + 0.01) {
      throw new Error("Số tiền hoàn vượt quá số tiền đã thu còn có thể hoàn.");
    }

    const categoryId = await ensureRefundCategory(supabase);
    const recipient = input.recipient?.trim() || summary.customerName;
    const description = [
      `[Contract refund] ${summary.contractCode}`,
      notes ? `- ${notes}` : "",
    ].filter(Boolean).join(" ");

    const { data: expense, error } = await supabase
      .from("expenses")
      .insert({
        expense_date: refundDate,
        payment_method: paymentMethod,
        category_id: categoryId,
        amount,
        description,
        recipient,
        contract_id: contractId,
        created_by: userId,
        approved_by: userId,
      })
      .select("id")
      .single();

    if (error || !expense?.id) {
      throw new Error(`Không thể tạo phiếu chi hoàn tiền: ${error?.message || "missing expense"}`);
    }

    await writeAuditLog({
      action: "CREATE",
      tableName: "expenses",
      recordId: expense.id,
      source: "server_action",
      newData: {
        contract_id: contractId,
        amount,
        refund_date: refundDate,
        payment_method: paymentMethod,
        recipient,
      },
      description: `Hoàn tiền HĐ ${summary.contractCode}: ${amount.toLocaleString("vi-VN")} VND`,
    });

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath("/finance");
    revalidatePath("/finance/expenses");
    revalidatePath("/finance/cashflow");
    revalidatePath("/reports");

    return {
      expenseId: expense.id as string,
      refundableAmount: Math.max(0, summary.refundableAmount - amount),
    };
  });
}
