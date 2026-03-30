"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";
import { serviceCreateSchema, serviceUpdateSchema, bundleItemSchema } from "@/lib/validations/service.schema";
import { generateServiceCode } from "@/lib/utils/service-utils";
import type { BundleItemInput } from "@/lib/validations/service.schema";

// ═══════════════════════════════════════════
// Service Mutations — V2 Gold Standard
// WRITE server actions for Services module
//
// Pattern: withAuth → Zod validate → DB op → audit → revalidate
// @see Lesson #59: withAuth = SSOT
// @see Lesson #72: FK *_by → auth.users(id)
// @see Lesson #77: V2 = V1 + optimized
// ═══════════════════════════════════════════

// ─── createService ───────────────────────────────

export async function createService(
  rawData: Record<string, unknown>,
  bundleItems?: BundleItemInput[],
) {
  return withAuth(async (supabase, userId) => {
    // 1. Validate
    const parsed = serviceCreateSchema.safeParse(rawData);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join(", ");
      throw new Error(`Dữ liệu không hợp lệ: ${msg}`);
    }

    const data = parsed.data;

    // 2. Auto-generate service code if empty
    const serviceCode = data.service_code || generateServiceCode();

    // 3. Check service_code collision (retry up to 3 times)
    let finalCode = serviceCode;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { count } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true })
        .eq("service_code", finalCode);
      if (!count || count === 0) break;
      finalCode = generateServiceCode(); // Regenerate
      if (attempt === 2) throw new Error("Không thể tạo mã dịch vụ duy nhất. Vui lòng thử lại.");
    }

    // 4. Insert service
    const { data: service, error } = await supabase
      .from("services")
      .insert({
        name: data.name.trim(),
        service_code: finalCode,
        service_type: data.service_type,
        category_id: data.category_id || null,
        selling_price: data.selling_price,
        cost_price: data.cost_price,
        unit: data.unit,
        fulfillment_type: data.fulfillment_type,
        status: data.status,
        description: data.description || null,
        image_url: data.image_url || null,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Lỗi tạo dịch vụ: ${error.message}`);

    // 5. Sync bundle items (if bundle type)
    if (bundleItems && bundleItems.length > 0 && data.fulfillment_type === "bundle") {
      await syncBundleItems(supabase, service.id, bundleItems);
    }

    // 6. Audit log
    fireAuditLog({
      action: "CREATE",
      tableName: "services",
      recordId: service.id,
      description: `Tạo dịch vụ: ${data.name} (${finalCode})`,
      newData: { ...data, service_code: finalCode } as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/services");
    return { id: service.id, service_code: finalCode };
  });
}

// ─── updateService ───────────────────────────────

export async function updateService(
  rawData: Record<string, unknown>,
  bundleItems?: BundleItemInput[],
) {
  return withAuth(async (supabase, userId) => {
    // 1. Validate
    const parsed = serviceUpdateSchema.safeParse(rawData);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join(", ");
      throw new Error(`Dữ liệu không hợp lệ: ${msg}`);
    }

    const { id, updated_at, data } = parsed.data;

    // 2. Optimistic locking — check updated_at hasn't changed
    const { data: current, error: fetchError } = await supabase
      .from("services")
      .select("updated_at, name")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !current) throw new Error("Dịch vụ không tồn tại hoặc đã bị xóa");

    if (current.updated_at !== updated_at) {
      throw new Error("Dịch vụ đã được cập nhật bởi người khác. Vui lòng tải lại trang.");
    }

    // 3. Build update payload (only changed fields)
    const updatePayload: Record<string, unknown> = {
      ...data,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Clean optional fields
    if (data.category_id === "") updatePayload.category_id = null;
    if (data.image_url === "") updatePayload.image_url = null;
    if (data.name) updatePayload.name = (data.name as string).trim();

    // 4. Update
    const { error } = await supabase
      .from("services")
      .update(updatePayload)
      .eq("id", id);

    if (error) throw new Error(`Lỗi cập nhật dịch vụ: ${error.message}`);

    // 5. Sync bundle items
    if (bundleItems !== undefined) {
      if (data.fulfillment_type === "bundle" && bundleItems.length > 0) {
        await syncBundleItems(supabase, id, bundleItems);
      } else {
        // Clear bundles if changed to single
        await supabase.from("service_bundles").delete().eq("parent_service_id", id);
      }
    }

    // 6. Audit log
    fireAuditLog({
      action: "UPDATE",
      tableName: "services",
      recordId: id,
      description: `Cập nhật dịch vụ: ${current.name}`,
      oldData: { updated_at } as Record<string, unknown>,
      newData: updatePayload,
      source: "server_action",
    });

    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    return { id };
  });
}

// ─── deleteService (soft delete) ─────────────────

export async function deleteService(id: string) {
  return withAuth(async (supabase, userId) => {
    // 1. Pre-check: is service used in contract_items?
    const { count: contractCount } = await supabase
      .from("contract_items")
      .select("*", { count: "exact", head: true })
      .eq("service_id", id);

    if (contractCount && contractCount > 0) {
      throw new Error(`Dịch vụ đang được sử dụng trong ${contractCount} hợp đồng. Không thể xóa.`);
    }

    // 2. Pre-check: is service used as bundle child?
    const { count: bundleCount } = await supabase
      .from("service_bundles")
      .select("*", { count: "exact", head: true })
      .eq("child_service_id", id);

    if (bundleCount && bundleCount > 0) {
      throw new Error(`Dịch vụ đang nằm trong ${bundleCount} gói combo. Không thể xóa.`);
    }

    // 3. Get service name for audit
    const { data: service } = await supabase
      .from("services")
      .select("name, service_code")
      .eq("id", id)
      .single();

    // 4. Soft delete
    const { error } = await supabase
      .from("services")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", id);

    if (error) throw new Error(`Lỗi xóa dịch vụ: ${error.message}`);

    // 5. Also delete any bundle items where this is parent
    await supabase.from("service_bundles").delete().eq("parent_service_id", id);

    // 6. Audit log
    fireAuditLog({
      action: "DELETE",
      tableName: "services",
      recordId: id,
      description: `Xóa dịch vụ: ${service?.name || id} (${service?.service_code || ""})`,
      severity: "WARNING",
      source: "server_action",
    });

    revalidatePath("/services");
    return null;
  });
}

// ─── syncBundleItems (internal helper) ───────────
// Replace all bundle items for a parent service

async function syncBundleItems(
  supabase: Parameters<Parameters<typeof withAuth>[0]>[0],
  parentId: string,
  items: BundleItemInput[],
) {
  // Validate each item
  for (const item of items) {
    const parsed = bundleItemSchema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`Bundle item không hợp lệ: ${parsed.error.issues[0]?.message}`);
    }
  }

  // Delete existing
  await supabase.from("service_bundles").delete().eq("parent_service_id", parentId);

  // Insert new
  if (items.length > 0) {
    const rows = items.map((item, idx) => ({
      parent_service_id: parentId,
      child_service_id: item.child_service_id,
      quantity: item.quantity,
      adjustment_price: item.adjustment_price,
      sort_order: idx,
    }));

    const { error } = await supabase.from("service_bundles").insert(rows);
    if (error) throw new Error(`Lỗi cập nhật bundle: ${error.message}`);
  }
}
