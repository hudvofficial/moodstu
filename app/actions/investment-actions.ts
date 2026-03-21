"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

// ═══════════════════════════════════════════
// Investment Actions — CRUD + Maintenance Logs
// V1 ref: investments.ts (234 lines)
// V2: withAuth + fireAuditLog + auto next_maintenance_date
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
  return withAuth(async (supabase) => {
    if (!input.name?.trim()) throw new Error("Tên tài sản là bắt buộc");
    if (!input.purchase_price || input.purchase_price <= 0) throw new Error("Giá mua phải lớn hơn 0");

    const { error } = await supabase.from("investments").insert({
      name: input.name.trim(),
      category: input.category,
      purchase_date: input.purchase_date,
      purchase_price: input.purchase_price,
      useful_life_months: input.useful_life_months || 36,
      depreciation_method: input.depreciation_method || "straight_line",
      salvage_value: input.salvage_value || 0,
      serial_number: input.serial_number || null,
      location: input.location || null,
      notes: input.notes || null,
      next_maintenance_date: input.next_maintenance_date || null,
      maintenance_interval_days: input.maintenance_interval_days || null,
    });
    if (error) throw new Error(`Lỗi thêm tài sản: ${error.message}`);

    fireAuditLog({ action: "CREATE", tableName: "investments", description: `Thêm tài sản: ${input.name} (${input.purchase_price.toLocaleString("vi-VN")}₫)` });
    revalidatePath("/finance/investments");
    return null;
  });
}

// ─── UPDATE ───────────────────────────────────

export async function updateInvestment(id: string, input: UpdateInvestmentInput) {
  return withAuth(async (supabase) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};
    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.category !== undefined) updateData.category = input.category;
    if (input.purchase_date !== undefined) updateData.purchase_date = input.purchase_date;
    if (input.purchase_price !== undefined) updateData.purchase_price = input.purchase_price;
    if (input.useful_life_months !== undefined) updateData.useful_life_months = input.useful_life_months;
    if (input.depreciation_method !== undefined) updateData.depreciation_method = input.depreciation_method;
    if (input.salvage_value !== undefined) updateData.salvage_value = input.salvage_value;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.condition !== undefined) updateData.condition = input.condition;
    if (input.serial_number !== undefined) updateData.serial_number = input.serial_number;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.next_maintenance_date !== undefined) updateData.next_maintenance_date = input.next_maintenance_date;
    if (input.maintenance_interval_days !== undefined) updateData.maintenance_interval_days = input.maintenance_interval_days;
    if (input.linked_revenue !== undefined) updateData.linked_revenue = input.linked_revenue;
    if (input.sold_price !== undefined) updateData.sold_price = input.sold_price;
    if (input.sold_date !== undefined) updateData.sold_date = input.sold_date;

    const { error } = await supabase.from("investments").update(updateData).eq("id", id);
    if (error) throw new Error(`Lỗi cập nhật tài sản: ${error.message}`);

    fireAuditLog({ action: "UPDATE", tableName: "investments", recordId: id, description: `Cập nhật tài sản #${id.substring(0, 8)}` });
    revalidatePath("/finance/investments");
    return null;
  });
}

// ─── DELETE ───────────────────────────────────

export async function deleteInvestment(id: string) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("investments").delete().eq("id", id);
    if (error) throw new Error(`Lỗi xóa tài sản: ${error.message}`);

    fireAuditLog({ action: "DELETE", tableName: "investments", recordId: id, description: `Xóa tài sản #${id.substring(0, 8)}`, severity: "WARNING" });
    revalidatePath("/finance/investments");
    return null;
  });
}

// ─── ADD MAINTENANCE LOG ──────────────────────

export async function addMaintenanceLog(investmentId: string, input: { maintenance_date: string; description?: string; cost?: number; performed_by?: string }) {
  return withAuth(async (supabase) => {
    const { error: logError } = await supabase.from("investment_maintenance_logs").insert({
      investment_id: investmentId,
      maintenance_date: input.maintenance_date,
      description: input.description || null,
      cost: input.cost || 0,
      performed_by: input.performed_by || null,
    });
    if (logError) throw new Error(`Lỗi ghi nhận bảo trì: ${logError.message}`);

    // Auto-calculate next maintenance date
    const { data: inv } = await supabase.from("investments").select("maintenance_interval_days").eq("id", investmentId).single();
    if (inv?.maintenance_interval_days) {
      const nextDate = new Date(input.maintenance_date);
      nextDate.setDate(nextDate.getDate() + inv.maintenance_interval_days);
      await supabase.from("investments").update({ next_maintenance_date: nextDate.toISOString().split("T")[0] }).eq("id", investmentId);
    }

    fireAuditLog({ action: "CREATE", tableName: "investment_maintenance_logs", description: `Ghi nhận bảo trì tài sản #${investmentId.substring(0, 8)}` });
    revalidatePath("/finance/investments");
    return null;
  });
}
