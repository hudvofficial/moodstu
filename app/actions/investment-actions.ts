"use server";

import { withAdmin } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { createInvestmentSchema, updateInvestmentSchema } from "@/lib/validations/finance.schema";
import { checkPeriodLock } from "@/lib/finance-utils";

// ═══════════════════════════════════════════
// Investment Actions — CRUD + Maintenance Logs
// Phase 02 Hardened (H1-H4)
// ═══════════════════════════════════════════

// ─── TYPES ────────────────────────────────────

export interface CreateInvestmentInput {
  name: string;
  category: string;
  purchase_date: string;
  purchase_price: number;
  useful_life_months?: number;
  depreciation_method?: string;
  salvage_value?: number;
  serial_number?: string;
  location?: string;
  notes?: string;
  next_maintenance_date?: string;
  maintenance_interval_days?: number;
}

export interface UpdateInvestmentInput extends Partial<CreateInvestmentInput> {
  status?: string;
  condition?: string;
  linked_revenue?: number;
  sold_price?: number;
  sold_date?: string;
}

// ─── CREATE ───────────────────────────────────

export async function createInvestment(input: CreateInvestmentInput) {
  return withAdmin(async (supabase) => {
    // H2: Zod validation
    const parsed = createInvestmentSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }
    // W3: Period lock
    await checkPeriodLock(supabase, parsed.data.purchase_date);

    const { data, error } = await supabase.from("investments").insert({
      name: parsed.data.name,
      category: parsed.data.category,
      purchase_date: parsed.data.purchase_date,
      purchase_price: parsed.data.purchase_price,
      useful_life_months: parsed.data.useful_life_months || 36,
      depreciation_method: parsed.data.depreciation_method || "straight_line",
      salvage_value: parsed.data.salvage_value || 0,
      serial_number: parsed.data.serial_number || null,
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
      next_maintenance_date: parsed.data.next_maintenance_date || null,
      maintenance_interval_days: parsed.data.maintenance_interval_days || null,
    }).select("id").single();
    if (error) throw new Error(`Lỗi thêm tài sản: ${error.message}`);

    // H3: await writeAuditLog
    await writeAuditLog({
      action: "CREATE",
      tableName: "investments",
      recordId: data.id,
      newData: input as unknown as Record<string, unknown>,
      description: `Thêm tài sản: ${parsed.data.name} (${parsed.data.purchase_price.toLocaleString("vi-VN")}₫)`
    });

    revalidatePath("/finance/investments");
    return { id: data.id };
  });
}

// ─── UPDATE ───────────────────────────────────

export async function updateInvestment(
  id: string,
  input: UpdateInvestmentInput,
  expectedUpdatedAt?: string
) {
  return withAdmin(async (supabase) => {
    // H2: Zod partial validation
    const parsed = updateInvestmentSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(`Dữ liệu không hợp lệ: ${parsed.error.issues.map((e: { message: string }) => e.message).join(", ")}`);
    }

    // H4: Optimistic lock — fetch old data + check updated_at
    const { data: oldData } = await supabase
      .from("investments")
      .select("name, purchase_price, status, updated_at")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Không tìm thấy tài sản cần sửa.");

    // W3: Period lock
    await checkPeriodLock(supabase, oldData.updated_at?.split("T")[0] || new Date().toISOString().split("T")[0]);

    if (expectedUpdatedAt && oldData.updated_at !== expectedUpdatedAt) {
      throw new Error("Dữ liệu đã bị thay đổi bởi người khác, vui lòng tải lại trang.");
    }

    const updateData = { ...parsed.data, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("investments").update(updateData).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật tài sản: ${error.message}`);

    // H3: await writeAuditLog
    await writeAuditLog({
      action: "UPDATE",
      tableName: "investments",
      recordId: id,
      oldData: oldData as unknown as Record<string, unknown>,
      newData: updateData as unknown as Record<string, unknown>,
      description: `Cập nhật tài sản #${id.substring(0, 8)}`
    });

    revalidatePath("/finance/investments");
    return null;
  });
}

// ─── DELETE ───────────────────────────────────

export async function deleteInvestment(id: string) {
  return withAdmin(async (supabase) => {
    const { data: oldData } = await supabase
      .from("investments")
      .select("name, purchase_price, status, purchase_date")
      .eq("id", id)
      .single();

    if (!oldData) throw new Error("Không tìm thấy tài sản.");

    // W3: Period lock
    await checkPeriodLock(supabase, oldData.purchase_date || new Date().toISOString().split("T")[0]);

    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa tài sản: ${error.message}`);

    // H3: await writeAuditLog
    await writeAuditLog({
      action: "DELETE",
      tableName: "investments",
      recordId: id,
      oldData: oldData as unknown as Record<string, unknown>,
      description: `Xóa tài sản ${oldData?.name || ""} #${id.substring(0, 8)}`
    });

    revalidatePath("/finance/investments");
    return null;
  });
}

// ─── ADD MAINTENANCE LOG ──────────────────────

export async function addMaintenanceLog(
  investmentId: string,
  input: { maintenance_date: string; description?: string; cost?: number; performed_by?: string }
) {
  return withAdmin(async (supabase) => {
    if (!input.maintenance_date) throw new Error("Ngày bảo trì là bắt buộc");

    const { error: logError } = await supabase.from("investment_maintenance_logs").insert({
      investment_id: investmentId,
      maintenance_date: input.maintenance_date,
      description: input.description || null,
      cost: input.cost || 0,
      performed_by: input.performed_by || null,
    });
    if (logError) throw new Error(`Lỗi ghi nhận bảo trì: ${logError.message}`);

    // Auto-calculate next maintenance date
    const { data: inv } = await supabase
      .from("investments")
      .select("maintenance_interval_days")
      .eq("id", investmentId)
      .single();

    if (inv?.maintenance_interval_days) {
      const nextDate = new Date(input.maintenance_date);
      nextDate.setDate(nextDate.getDate() + inv.maintenance_interval_days);
      await supabase
        .from("investments")
        .update({ next_maintenance_date: nextDate.toISOString().split("T")[0] })
        .eq("id", investmentId);
    }

    // H3: await writeAuditLog
    await writeAuditLog({
      action: "CREATE",
      tableName: "investment_maintenance_logs",
      description: `Ghi nhận bảo trì tài sản #${investmentId.substring(0, 8)}${input.cost ? ` (${input.cost.toLocaleString("vi-VN")}₫)` : ""}`
    });

    revalidatePath("/finance/investments");
    return null;
  });
}
