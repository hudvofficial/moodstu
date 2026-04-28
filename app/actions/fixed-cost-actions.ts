"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { withAdmin } from "@/lib/auth_utils";
import { createFixedCostSchema, updateFixedCostSchema } from "@/lib/validations/finance.schema";
import { checkPeriodLock } from "@/lib/finance-utils";

function fixedCostCode() {
  return `CP-${Date.now().toString(36).toUpperCase()}`;
}

export async function createFixedCost(input: {
  cost_code?: string;
  cost_name: string;
  cost_type?: string | null;
  monthly_amount: number;
  deposit_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
}) {
  return withAdmin(async (supabase, userId) => {
    // W1: Zod validation (replaces normalizeFixedCost)
    const parsed = createFixedCostSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    // W3: Period lock
    await checkPeriodLock(supabase, parsed.data.start_date || new Date().toISOString().split("T")[0]);

    const insertData = {
      cost_code: parsed.data.cost_code?.trim() || fixedCostCode(),
      cost_name: parsed.data.cost_name,
      cost_type: parsed.data.cost_type?.trim() || null,
      monthly_amount: parsed.data.monthly_amount,
      deposit_amount: parsed.data.deposit_amount || 0,
      start_date: parsed.data.start_date || null,
      end_date: parsed.data.end_date || null,
      description: parsed.data.description?.trim() || null,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from("fixed_costs")
      .insert(insertData)
      .select("id")
      .single();

    if (error) throw new Error(`Lỗi tạo chi phí cố định: ${error.message}`);

    await writeAuditLog({
      action: "CREATE",
      tableName: "fixed_costs",
      recordId: data.id,
      newData: insertData,
      description: `Tạo chi phí cố định: ${insertData.cost_name}`,
    });

    revalidatePath("/finance/fixed-costs");
    return { id: data.id };
  });
}

export async function updateFixedCost(
  id: string,
  input: {
    cost_code?: string;
    cost_name?: string;
    cost_type?: string | null;
    monthly_amount?: number;
    deposit_amount?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    description?: string | null;
  },
) {
  return withAdmin(async (supabase) => {
    // W1: Zod partial validation
    const parsed = updateFixedCostSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    const { data: oldData } = await supabase
      .from("fixed_costs")
      .select("cost_code, cost_name, monthly_amount")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!oldData) throw new Error("Không tìm thấy chi phí cố định");

    // W3: Period lock
    await checkPeriodLock(supabase, new Date().toISOString().split("T")[0]);

    const updateData = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("fixed_costs")
      .update(updateData)
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(`Lỗi cập nhật chi phí cố định: ${error.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "fixed_costs",
      recordId: id,
      oldData: oldData as Record<string, unknown>,
      newData: updateData,
      description: `Cập nhật chi phí cố định #${id.substring(0, 8)}`,
    });

    revalidatePath("/finance/fixed-costs");
    return null;
  });
}

export async function deleteFixedCost(id: string) {
  return withAdmin(async (supabase) => {
    const { data: oldData } = await supabase
      .from("fixed_costs")
      .select("cost_code, cost_name, monthly_amount, start_date")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (!oldData) throw new Error("Không tìm thấy chi phí cố định.");

    // W3: Period lock
    await checkPeriodLock(supabase, oldData.start_date || new Date().toISOString().split("T")[0]);

    const { error } = await supabase
      .from("fixed_costs")
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null);
    if (error) throw new Error(`Lỗi xóa chi phí cố định: ${error.message}`);

    await writeAuditLog({
      action: "DELETE",
      tableName: "fixed_costs",
      recordId: id,
      oldData: oldData as Record<string, unknown>,
      description: `Xóa chi phí cố định #${id.substring(0, 8)}`,
    });

    revalidatePath("/finance/fixed-costs");
    return null;
  });
}
