"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import {
  createLabSchema,
  createLabServiceSchema,
  labPaymentSchema,
  labStatusSchema,
  updateLabSchema,
  updateLabServiceSchema,
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

  return withAuth(async (supabase, userId) => {
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

  return withAuth(async (supabase, userId) => {
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
      description: `Cap nhat lab ${parsed.data.lab_name}`,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    revalidatePath("/printing");
    return null;
  });
}

export async function deleteLab(id: string): Promise<ActionResult<null>> {
  return withAuth(async (supabase, userId) => {
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

  return withAuth(async (supabase, userId) => {
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

  return withAuth(async (supabase) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("lab_services").insert({
      ...parsed.data,
      created_at: now,
      updated_at: now,
    });

    if (error) {
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

  return withAuth(async (supabase) => {
    const { error } = await supabase
      .from("lab_services")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Khong the cap nhat dich vu lab: ${error.message}`);
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
  return withAuth(async (supabase) => {
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

  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("lab_payments").insert({
      ...parsed.data,
      created_by: userId,
      created_at: now,
    });

    if (error) {
      throw new Error(`Khong the ghi nhan thanh toan lab: ${error.message}`);
    }

    const { error: orderUpdateError } = await supabase
      .from("printing_orders")
      .update({
        payment_status: "da_thanh_toan",
        updated_at: now,
        updated_by: userId,
      })
      .eq("lab_id", parsed.data.lab_id)
      .eq("payment_status", "chua_thanh_toan")
      .is("deleted_at", null);

    if (orderUpdateError) {
      throw new Error(
        `Khong the dong bo thanh toan don in: ${orderUpdateError.message}`,
      );
    }

    fireAuditLog({
      action: "CREATE",
      tableName: "lab_payments",
      description: `Ghi nhan thanh toan lab ${parsed.data.amount}`,
      newData: parsed.data as Record<string, unknown>,
      source: "server_action",
    });

    revalidatePath("/printing/labs");
    revalidatePath("/printing");
    revalidatePath("/finance");
    return null;
  });
}

