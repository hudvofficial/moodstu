"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { writeAuditLog } from "@/lib/audit";
import { withAdmin } from "@/lib/auth_utils";
import { createCategorySchema, updateCategorySchema } from "@/lib/validations/finance.schema";

// NOTE: Categories là master data, không áp dụng checkPeriodLock.
// Period lock chỉ áp dụng cho transactional mutations (receipts, expenses, debts, etc.) — W7 audit decision

function categoryCode(name: string, type: string) {
  const prefix = type === "thu" ? "THU" : "CHI";
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18)
    .toUpperCase();
  return `${prefix}-${slug || Date.now().toString(36).toUpperCase()}`;
}

export async function createFinanceCategory(input: {
  name: string;
  type: "thu" | "chi";
  category_code?: string;
}) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    // W6: Zod validation (audit fix)
    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    const insertData = {
      name: parsed.data.name,
      type: parsed.data.type,
      category_code: parsed.data.category_code?.trim() || categoryCode(parsed.data.name, parsed.data.type),
      is_default: false,
    };

    const { data, error } = await supabase
      .from("transaction_categories")
      .insert(insertData)
      .select("id")
      .single();

    if (error) throw new Error(`Loi tao danh muc: ${error.message}`);

    await writeAuditLog({
      action: "CREATE",
      tableName: "transaction_categories",
      recordId: data.id,
      newData: insertData,
      description: `Tao danh muc finance: ${parsed.data.name}`,
    });

    revalidatePath("/finance/categories");
    return { id: data.id };
  });
}

export async function updateFinanceCategory(
  id: string,
  input: { name: string; type: "thu" | "chi"; category_code?: string },
) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    // W6: Zod validation (audit fix)
    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    const name = parsed.data.name?.trim();
    if (!name) throw new Error("Tên danh mục không được để trống");

    const { data: oldData } = await supabase
      .from("transaction_categories")
      .select("name, type, category_code, is_default")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Khong tim thay danh muc");

    const updateData = {
      name,
      type: input.type,
      category_code: input.category_code?.trim() || categoryCode(name, input.type),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("transaction_categories")
      .update(updateData)
      .eq("id", id);

    if (error) throw new Error(`Loi cap nhat danh muc: ${error.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "transaction_categories",
      recordId: id,
      oldData: oldData as Record<string, unknown>,
      newData: updateData,
      description: `Cap nhat danh muc finance #${id.substring(0, 8)}`,
    });

    revalidatePath("/finance/categories");
    return null;
  });
}

export async function deleteFinanceCategory(id: string) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    const { data: oldData } = await supabase
      .from("transaction_categories")
      .select("name, type, is_default")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Khong tim thay danh muc");
    if (oldData.is_default) throw new Error("Khong the xoa danh muc mac dinh");

    // W7 Audit Fix: Check if category is used in transactions before deleting
    const [receiptsCheck, expensesCheck] = await Promise.all([
      supabase.from("receipts").select("id", { count: "exact", head: true }).eq("category_id", id),
      supabase.from("expenses").select("id", { count: "exact", head: true }).eq("category_id", id)
    ]);

    if (receiptsCheck.error) throw new Error(`Lỗi kiểm tra phiếu thu: ${receiptsCheck.error.message}`);
    if (expensesCheck.error) throw new Error(`Lỗi kiểm tra phiếu chi: ${expensesCheck.error.message}`);

    const totalUsage = (receiptsCheck.count || 0) + (expensesCheck.count || 0);
    if (totalUsage > 0) {
      throw new Error(`Không thể xóa danh mục này vì đã có ${totalUsage} giao dịch phát sinh liên quan.`);
    }

    const { error } = await supabase
      .from("transaction_categories")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Loi xoa danh muc: ${error.message}`);

    await writeAuditLog({
      action: "DELETE",
      tableName: "transaction_categories",
      recordId: id,
      oldData: oldData as Record<string, unknown>,
      description: `Xoa danh muc finance #${id.substring(0, 8)}`,
    });

    revalidatePath("/finance/categories");
    return null;
  });
}
