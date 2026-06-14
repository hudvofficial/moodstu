"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { withAuth, withAdmin } from "@/lib/auth_utils";
import { writeAuditLog } from "@/lib/audit";
import type { Vendor } from "@/types/vendor";

const quickAddSchema = z.object({
  full_name: z.string().min(1, "Tên thợ ngoài không được để trống"),
  phone: z.string().optional(),
  service_type: z.string().optional(),
});

const vendorUpdateSchema = z.object({
  id: z.string().uuid("ID thợ ngoài không hợp lệ"),
  full_name: z.string().min(1, "Tên thợ ngoài không được để trống"),
  phone: z.string().optional().nullable(),
  service_type: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

const vendorIdSchema = z.string().uuid("ID thợ ngoài không hợp lệ");

const mergeVendorsSchema = z.object({
  keepVendorId: z.string().uuid("ID thợ ngoài giữ lại không hợp lệ"),
  mergeVendorId: z.string().uuid("ID thợ ngoài cần gộp không hợp lệ"),
});

function normalizePhone(phone?: string | null) {
  const normalized = phone ? phone.trim().replace(/[^0-9]/g, "") : "";
  return normalized || null;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export async function getActiveVendors() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("vendors")
      .select("id, full_name, phone, service_type, status")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("full_name");

    if (error) throw new Error(`Lỗi tải danh sách thợ ngoài: ${error.message}`);
    return (data || []) as Vendor[];
  });
}

export async function quickAddVendor(input: z.infer<typeof quickAddSchema>) {
  return withAuth(async (supabase, userId) => {
    const parsed = quickAddSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");
    }

    const inputName = normalizeName(parsed.data.full_name);
    const inputPhone = normalizePhone(parsed.data.phone);

    // Deduplicate in application logic to avoid SQL filter edge cases with Vietnamese names.
    // Phone is the strongest key; name-only match is a fallback for quick-add entries without phone.
    const { data: activeVendors, error: findError } = await supabase
      .from("vendors")
      .select("id, full_name, phone, service_type, status")
      .eq("status", "active")
      .is("deleted_at", null);

    if (findError) throw new Error(`Lỗi kiểm tra trùng thợ ngoài: ${findError.message}`);

    const existing = (activeVendors || []).find((vendor) => {
      const samePhone = inputPhone && normalizePhone(vendor.phone) === inputPhone;
      const sameNameWithoutPhone = !inputPhone && normalizeName(vendor.full_name).toLowerCase() === inputName.toLowerCase();
      return samePhone || sameNameWithoutPhone;
    });

    if (existing) return existing as Vendor;

    const { data, error } = await supabase
      .from("vendors")
      .insert({
        full_name: inputName,
        phone: inputPhone || parsed.data.phone || null,
        service_type: parsed.data.service_type || null,
        status: "active",
      })
      .select("id, full_name, phone, service_type, status")
      .single();

    if (error) throw new Error(`Lỗi thêm thợ ngoài: ${error.message}`);
    
    await writeAuditLog({
      action: "CREATE",
      tableName: "vendors",
      recordId: data.id,
      description: `Thêm thợ ngoài: ${data.full_name}`,
    });

    return data as Vendor;
  });
}

// ═══════════════════════════════════════════
// Admin Vendor Management Actions
// ═══════════════════════════════════════════

/**
 * Admin: Get all vendors including inactive (for management list)
 */
export async function getAllVendors() {
  return withAdmin(async (supabase) => {
    const { data, error } = await supabase
      .from("vendors")
      .select("id, full_name, phone, service_type, status, created_at, updated_at")
      .is("deleted_at", null)
      .order("full_name");

    if (error) throw new Error(`Lỗi tải danh sách thợ ngoài: ${error.message}`);
    return data || [];
  });
}

/**
 * Admin: Update vendor info
 */
export async function updateVendor(input: z.infer<typeof vendorUpdateSchema>) {
  return withAdmin(async (supabase, userId) => {
    const parsed = vendorUpdateSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");
    }

    const updateData: Record<string, unknown> = {
      full_name: normalizeName(parsed.data.full_name),
      phone: normalizePhone(parsed.data.phone),
      service_type: parsed.data.service_type?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status) updateData.status = parsed.data.status;

    const { data, error } = await supabase
      .from("vendors")
      .update(updateData)
      .eq("id", parsed.data.id)
      .is("deleted_at", null)
      .select("id, full_name, phone, service_type, status")
      .single();

    if (error) throw new Error(`Lỗi cập nhật thợ ngoài: ${error.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "vendors",
      recordId: parsed.data.id,
      description: `Cập nhật thợ ngoài: ${data.full_name}`,
    });

    revalidatePath("/finance/vendor-debts");
    return data as Vendor;
  });
}

/**
 * Admin: Soft-delete vendor (sets deleted_at, preserves history)
 * Tasks keep vendor_id for historical reference but vendor won't appear in active lists.
 */
export async function deleteVendor(vendorId: string) {
  return withAdmin(async (supabase, userId) => {
    const parsed = vendorIdSchema.safeParse(vendorId);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "ID không hợp lệ");
    }

    // Fetch vendor name for audit
    const { data: vendor } = await supabase
      .from("vendors")
      .select("full_name")
      .eq("id", parsed.data)
      .is("deleted_at", null)
      .single();

    if (!vendor) throw new Error("Không tìm thấy thợ ngoài hoặc đã bị xóa");

    const { error } = await supabase
      .from("vendors")
      .update({
        deleted_at: new Date().toISOString(),
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data);

    if (error) throw new Error(`Lỗi xóa thợ ngoài: ${error.message}`);

    await writeAuditLog({
      action: "DELETE",
      tableName: "vendors",
      recordId: parsed.data,
      description: `Xóa thợ ngoài: ${vendor.full_name}`,
    });

    revalidatePath("/finance/vendor-debts");
    return null;
  });
}

/**
 * Admin: Merge two vendors (keep one, reassign tasks from the other)
 * Moves all work_tasks + payment_allocations from mergeVendorId -> keepVendorId,
 * then soft-deletes the merged vendor.
 */
export async function mergeVendors(input: z.infer<typeof mergeVendorsSchema>) {
  return withAdmin(async (supabase, userId) => {
    const parsed = mergeVendorsSchema.safeParse(input);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ");
    }

    const { keepVendorId, mergeVendorId } = parsed.data;
    if (keepVendorId === mergeVendorId) {
      throw new Error("Không thể gộp với chính mình");
    }

    // Verify both exist
    const { data: keepVendor } = await supabase
      .from("vendors")
      .select("full_name")
      .eq("id", keepVendorId)
      .is("deleted_at", null)
      .single();
    const { data: mergeVendor } = await supabase
      .from("vendors")
      .select("full_name")
      .eq("id", mergeVendorId)
      .is("deleted_at", null)
      .single();

    if (!keepVendor) throw new Error("Không tìm thấy thợ giữ lại");
    if (!mergeVendor) throw new Error("Không tìm thấy thợ cần gộp");

    // 1. Reassign all work_tasks
    const { error: taskErr } = await supabase
      .from("work_tasks")
      .update({ vendor_id: keepVendorId, updated_at: new Date().toISOString() })
      .eq("vendor_id", mergeVendorId);
    if (taskErr) throw new Error(`Lỗi chuyển task: ${taskErr.message}`);

    // 2. Reassign vendor_payments
    const { error: payErr } = await supabase
      .from("vendor_payments")
      .update({ vendor_id: keepVendorId })
      .eq("vendor_id", mergeVendorId);
    if (payErr) throw new Error(`Lỗi chuyển thanh toán: ${payErr.message}`);

    // 3. Soft-delete the merged vendor
    const { error: delErr } = await supabase
      .from("vendors")
      .update({
        deleted_at: new Date().toISOString(),
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", mergeVendorId);
    if (delErr) throw new Error(`Lỗi xóa vendor gộp: ${delErr.message}`);

    await writeAuditLog({
      action: "UPDATE",
      tableName: "vendors",
      recordId: keepVendorId,
      description: `Gộp thợ ngoài: "${mergeVendor.full_name}" vào "${keepVendor.full_name}"`,
    });

    revalidatePath("/finance/vendor-debts");
    return { kept: keepVendorId, merged: mergeVendorId };
  });
}
