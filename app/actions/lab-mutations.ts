"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { withPrintingAccess } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import {
  createLabSchema,
  createLabServiceSchema,
  labPaymentSchema,
  labStatusSchema,
  updateLabSchema,
  updateLabServiceSchema,
  upsertLabProductPriceSchema,
  upsertPrintProductSchema,
} from "@/lib/validations/lab.schema";
import type { Lab } from "@/types/printing";
import { normalizeLabStatus } from "@/types/printing-constants";


type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createLab(rawData: unknown): Promise<ActionResult<Lab>> {
  const parsed = createLabSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("labs")
      .insert({
        ...parsed.data,
        created_at: now,
        updated_at: now,
        updated_by: userId,
      })
      .select("id, lab_name, contact_person, phone, address, status, created_at")
      .single();

    if (error || !data) {
      throw new Error(`Khong the tao lab: ${error?.message || "Unknown"}`);
    }

    fireAuditLog({
      action: "CREATE",
      tableName: "labs",
      recordId: data.id,
      description: `Tao lab ${data.lab_name}`,
      newData: parsed.data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    revalidatePath("/printing");

    return {
      id: data.id,
      lab_name: data.lab_name,
      contact_person: data.contact_person,
      phone: data.phone,
      address: data.address,
      status: normalizeLabStatus(data.status),
      created_at: data.created_at,
      serviceCount: 0,
      services: [],
      outstandingDebt: 0,
      unpaidOrders: 0,
      lastPaymentAt: null,
    };
  });
}

export async function updateLab(
  id: string,
  rawData: unknown,
): Promise<ActionResult<null>> {
  const parsed = updateLabSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { error } = await supabase
      .from("labs")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(`Khong the cap nhat lab: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "labs",
      recordId: id,
      description: `Cap nhat lab ${parsed.data.lab_name || id}`,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    revalidatePath("/printing");
    return null;
  });
}

export async function deleteLab(id: string): Promise<ActionResult<null>> {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { count, error: usageError } = await supabase
      .from("printing_orders")
      .select("id", { count: "exact", head: true })
      .eq("lab_id", id)
      .is("deleted_at", null);

    if (usageError) {
      throw new Error(`Khong the kiem tra don in cua lab: ${usageError.message}`);
    }

    if ((count ?? 0) > 0) {
      throw new Error("Lab dang co don in. Hay chuyen sang tam dung thay vi xoa.");
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("labs")
      .update({
        deleted_at: now,
        updated_at: now,
        updated_by: userId,
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(`Khong the xoa lab: ${error.message}`);
    }

    fireAuditLog({
      action: "DELETE",
      tableName: "labs",
      recordId: id,
      description: `Xoa mem lab ${id}`,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    revalidatePath("/printing");
    return null;
  });
}

export async function toggleLabStatus(
  id: string,
  status: "active" | "inactive",
): Promise<ActionResult<null>> {
  const parsed = labStatusSchema.safeParse(status);
  if (!parsed.success) {
    return { success: false, error: "Trang thai lab khong hop le" };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { error } = await supabase
      .from("labs")
      .update({
        status: parsed.data,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (error) {
      throw new Error(`Khong the doi trang thai lab: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "labs",
      recordId: id,
      description: `Doi trang thai lab sang ${parsed.data}`,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    revalidatePath("/printing");
    return null;
  });
}

export async function createLabService(
  rawData: unknown,
): Promise<ActionResult<null>> {
  const parsed = createLabServiceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("lab_services").insert({
      ...parsed.data,
      product_id: parsed.data.product_id ?? null,
      selling_price_override: parsed.data.selling_price_override ?? null,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      if (error.code === "23505") {
        throw new Error("Dich vu nay da duoc map vao san pham trong lab");
      }
      throw new Error(`Khong the tao dich vu lab: ${error.message}`);
    }

    fireAuditLog({
      action: "CREATE",
      tableName: "lab_services",
      description: `Them dich vu ${parsed.data.item_name}`,
      newData: parsed.data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    return null;
  });
}

export async function updateLabService(
  id: string,
  rawData: unknown,
): Promise<ActionResult<null>> {
  const parsed = updateLabServiceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>) => {
    // expected_updated_at là token so sánh, không phải cột được ghi.
    const { expected_updated_at, ...patch } = parsed.data;
    const nextUpdatedAt = new Date().toISOString();
    let query = supabase
      .from("lab_services")
      .update({
        ...patch,
        product_id: patch.product_id ?? null,
        selling_price_override: patch.selling_price_override ?? null,
        updated_at: nextUpdatedAt,
      })
      .eq("id", id);

    // Spec §9.5: chặn ghi đè âm thầm khi có người khác vừa sửa giá.
    if (expected_updated_at) {
      query = query.eq("updated_at", expected_updated_at);
    }

    const { data, error } = await query.select("id");

    if (error) {
      if (error.code === "23505") {
        throw new Error("Dich vu nay da duoc map vao san pham trong lab");
      }
      throw new Error(`Khong the cap nhat dich vu lab: ${error.message}`);
    }

    if (expected_updated_at && (data ?? []).length === 0) {
      throw new Error(
        "Bang gia da bi nguoi khac thay doi. Vui long tai lai roi sua lai.",
      );
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "lab_services",
      recordId: id,
      description: `Cap nhat dich vu ${parsed.data.item_name}`,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    return null;
  });
}

export async function deleteLabService(
  id: string,
): Promise<ActionResult<null>> {
  return withPrintingAccess(async (supabase: SupabaseClient<Database>) => {
    const { error } = await supabase.from("lab_services").delete().eq("id", id);

    if (error) {
      throw new Error(`Khong the xoa dich vu lab: ${error.message}`);
    }

    fireAuditLog({
      action: "DELETE",
      tableName: "lab_services",
      recordId: id,
      description: `Xoa dich vu lab ${id}`,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    return null;
  });
}

export async function recordLabPayment(
  rawData: unknown,
): Promise<ActionResult<null>> {
  const parsed = labPaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const { error } = await supabase.rpc("record_lab_payment_atomic", {
      p_actor_id: userId,
      p_allocations: parsed.data.allocations ?? [],
      p_amount: parsed.data.amount,
      p_lab_id: parsed.data.lab_id,
      // p_note là text KHÔNG có DEFAULT → generator khai thành `string` bắt buộc,
      // nhưng Postgres vẫn nhận NULL. Ép kiểu để giữ nguyên hành vi cũ.
      p_note: parsed.data.note as string,
      p_payment_method: parsed.data.payment_method,
      // ADR-016: ngày trả do người dùng nhập; RPC giờ là wrapper của record_payee_payment_atomic
      // → tạo phiếu chi thật (expenses payee_type='lab') + expense_allocations.
      p_payment_date: parsed.data.payment_date ?? undefined,
    });

    if (error) {
      throw new Error(`Khong the ghi nhan thanh toan lab: ${error.message}`);
    }

    fireAuditLog({
      action: "CREATE",
      tableName: "expenses",
      description: `Phieu chi tra lab ${parsed.data.amount}`,
      newData: parsed.data as Record<string, unknown>,
      source: "server_action",
    });

    // CRITICAL FIX: Comprehensive cache invalidation for lab payments
    // Revalidate ALL pages that display lab debt data
    revalidatePath("/printing/labs"); // Lab management page
    revalidatePath("/printing"); // Printing orders list
    revalidatePath("/finance/payables"); // Công nợ phải trả hợp nhất (ADR-016 M2) - CRITICAL!
    revalidatePath("/finance"); // Finance root
    revalidatePath("/"); // Dashboard root

    // Note: SWR client-side cache is invalidated via modal onSuccess callback
    // See lab-payment-modal.tsx line 263-269 for client-side invalidation

    return null;
  });
}

// ─── CATALOG SKU + GIÁ BÁN LAB (T-20261112) ───
// Audit giá do trigger DB (audit_print_products / audit_lab_services) ghi
// old_data/new_data đầy đủ, phân biệt được override 0 và NULL (spec §9.2).

type UpsertResult = ActionResult<{ id: string; updated_at: string | null }>;

// Rollback flag (spec §7): đặt NEXT_PUBLIC_LAB_CATALOG=0 để tắt UI + API ghi giá
// mà KHÔNG xóa SKU/override đã nhập.
function isLabCatalogDisabled() {
  return process.env.NEXT_PUBLIC_LAB_CATALOG === "0";
}

const LAB_CATALOG_DISABLED: UpsertResult = {
  success: false,
  error: "Tinh nang tra gia dang tat",
};

export async function upsertPrintProduct(rawData: unknown): Promise<UpsertResult> {
  if (isLabCatalogDisabled()) return LAB_CATALOG_DISABLED;
  const parsed = upsertPrintProductSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>, userId) => {
    const now = new Date().toISOString();
    const payload = {
      sku: parsed.data.sku,
      name: parsed.data.name,
      category: parsed.data.category,
      specification: parsed.data.specification,
      unit: parsed.data.unit,
      default_selling_price: parsed.data.default_selling_price,
      active: parsed.data.active,
      updated_at: now,
      updated_by: userId,
    };

    if (parsed.data.id) {
      let query = supabase
        .from("print_products")
        .update(payload)
        .eq("id", parsed.data.id)
        .is("deleted_at", null);

      // Optimistic token (spec §9.5)
      if (parsed.data.expected_updated_at) {
        query = query.eq("updated_at", parsed.data.expected_updated_at);
      }

      const { data, error } = await query.select("id, updated_at");

      if (error) {
        if (error.code === "23505") {
          throw new Error("Ma SKU nay da ton tai");
        }
        throw new Error(`Khong the cap nhat san pham: ${error.message}`);
      }

      const row = (data ?? [])[0] as
        | { id: string; updated_at: string | null }
        | undefined;

      if (!row) {
        throw new Error(
          parsed.data.expected_updated_at
            ? "San pham da bi nguoi khac thay doi. Vui long tai lai roi sua lai."
            : "Khong tim thay san pham",
        );
      }

      revalidatePath("/printing/labs");
      return { id: row.id, updated_at: row.updated_at };
    }

    const { data, error } = await supabase
      .from("print_products")
      .insert({ ...payload, created_at: now, created_by: userId })
      .select("id, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("Ma SKU nay da ton tai");
      }
      throw new Error(`Khong the tao san pham: ${error.message}`);
    }

    revalidatePath("/printing/labs");
    return data as { id: string; updated_at: string | null };
  });
}

/**
 * Ghi cost + selling override của 1 Lab cho 1 SKU.
 * selling_price_override = null → reset về giá mặc định (spec §4). 0 là giá hợp lệ.
 */
export async function upsertLabProductPrice(rawData: unknown): Promise<UpsertResult> {
  if (isLabCatalogDisabled()) return LAB_CATALOG_DISABLED;
  const parsed = upsertLabProductPriceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase: SupabaseClient<Database>) => {
    const now = new Date().toISOString();
    const payload = {
      cost_price: parsed.data.cost_price,
      selling_price_override: parsed.data.selling_price_override,
      updated_at: now,
    };

    if (parsed.data.id) {
      let query = supabase
        .from("lab_services")
        .update(payload)
        .eq("id", parsed.data.id);

      if (parsed.data.expected_updated_at) {
        query = query.eq("updated_at", parsed.data.expected_updated_at);
      }

      const { data, error } = await query.select("id, updated_at");

      if (error) {
        throw new Error(`Khong the cap nhat gia lab: ${error.message}`);
      }

      const row = (data ?? [])[0] as
        | { id: string; updated_at: string | null }
        | undefined;

      if (!row) {
        throw new Error(
          parsed.data.expected_updated_at
            ? "Gia da bi nguoi khac thay doi. Vui long tai lai roi sua lai."
            : "Khong tim thay dong gia cua lab",
        );
      }

      revalidatePath("/printing/labs");
      return { id: row.id, updated_at: row.updated_at };
    }

    // Dòng giá mới: item_name giữ tên SKU để báo cáo cũ và service_preview
    // (printing_lab_overview) không bị trống.
    const { data: product } = await supabase
      .from("print_products")
      .select("name")
      .eq("id", parsed.data.product_id)
      .is("deleted_at", null)
      .maybeSingle();

    const { data, error } = await supabase
      .from("lab_services")
      .insert({
        lab_id: parsed.data.lab_id,
        product_id: parsed.data.product_id,
        item_name: (product as { name?: string } | null)?.name ?? "SKU",
        ...payload,
        created_at: now,
      })
      .select("id, updated_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("San pham nay da co gia trong lab");
      }
      throw new Error(`Khong the them gia lab: ${error.message}`);
    }

    revalidatePath("/printing/labs");
    return data as { id: string; updated_at: string | null };
  });
}
