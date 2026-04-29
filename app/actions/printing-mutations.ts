"use server";

import { revalidatePath } from "next/cache";
import { withPrintingAccess } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import {
  createPrintingOrderSchema,
  printingStatusSchema,
  updatePrintingOrderSchema,
} from "@/lib/validations/printing.schema";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_TRANSITIONS: Record<string, string[]> = {
  cho_xu_ly: ["dang_in", "da_huy"],
  dang_in: ["da_in", "da_huy"],
  da_in: ["da_nhan", "da_huy"],
  da_nhan: [],
  da_huy: [],
};

function calculateTotalAmount(
  items: { quantity: number; unitPrice: number }[],
): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

function asRpcRecord(data: unknown): Record<string, unknown> {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object" ? first as Record<string, unknown> : {};
  }
  return data && typeof data === "object" ? data as Record<string, unknown> : {};
}

export async function createPrintingOrder(
  rawData: unknown,
): Promise<ActionResult<{ orderCode: string }>> {
  const parsed = createPrintingOrderSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase, userId) => {
    const input = parsed.data;
    const totalAmount = calculateTotalAmount(input.items);

    const { data, error } = await supabase.rpc("create_printing_order_atomic", {
      p_actor_id: userId,
      p_order: input,
    });

    if (error) {
      throw new Error(`Khong the tao don in: ${error.message}`);
    }

    const result = asRpcRecord(data);
    const orderCode = String(result.order_code || "");

    fireAuditLog({
      action: "CREATE",
      tableName: "printing_orders",
      recordId: String(result.order_id || ""),
      description: `Tao don in ${orderCode}`,
      newData: {
        contract_id: input.contractId,
        lab_id: input.labId,
        total_amount: totalAmount,
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${input.contractId}`);
    revalidatePath("/finance");

    return { orderCode };
  });
}

export async function updatePrintingOrder(
  id: string,
  rawData: unknown,
  expectedUpdatedAt?: string,
): Promise<ActionResult<null>> {
  const parsed = updatePrintingOrderSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Du lieu khong hop le",
    };
  }

  return withPrintingAccess(async (supabase, userId) => {
    const totalAmount = calculateTotalAmount(parsed.data.items);
    const { data, error } = await supabase.rpc("update_printing_order_atomic", {
      p_actor_id: userId,
      p_expected_updated_at: expectedUpdatedAt ?? null,
      p_order: parsed.data,
      p_order_id: id,
    });

    if (error) {
      throw new Error(`Khong the cap nhat don in: ${error.message}`);
    }

    const result = asRpcRecord(data);
    const orderCode = String(result.order_code || id);
    const contractId = typeof result.contract_id === "string" ? result.contract_id : null;

    fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: id,
      description: `Cap nhat don in ${orderCode}`,
      newData: {
        total_amount: totalAmount,
        lab_id: parsed.data.labId,
      },
      source: "server_action",
    });

    revalidatePath("/printing");
    if (contractId) {
      revalidatePath(`/contracts/${contractId}`);
    }
    return null;
  });
}

export async function updatePrintingOrderStatus(
  id: string,
  newStatus: string,
  _contractId: string,
): Promise<ActionResult<null>> {
  void _contractId;

  const parsedStatus = printingStatusSchema.safeParse(newStatus);
  if (!parsedStatus.success) {
    return { success: false, error: "Trang thai don in khong hop le" };
  }

  return withPrintingAccess(async (supabase, userId) => {
    const { data: current, error: currentError } = await supabase
      .from("printing_orders")
      .select("id, order_code, status, received_date")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (currentError || !current) {
      throw new Error(
        `Khong the tai don in hien tai: ${currentError?.message || "Not found"}`,
      );
    }

    const currentStatus = current.status || "cho_xu_ly";
    if (currentStatus === parsedStatus.data) {
      return null;
    }

    const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTransitions.includes(parsedStatus.data)) {
      throw new Error("Khong the chuyen don in sang trang thai nay");
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status: parsedStatus.data,
      updated_at: now,
      updated_by: userId,
    };

    if (parsedStatus.data === "da_nhan" && !current.received_date) {
      updateData.received_date = now;
    }

    const { error } = await supabase
      .from("printing_orders")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw new Error(`Khong the cap nhat trang thai: ${error.message}`);
    }

    fireAuditLog({
      action: "UPDATE",
      tableName: "printing_orders",
      recordId: id,
      description: `Cap nhat trang thai don in ${current.order_code || id}`,
      oldData: { status: currentStatus },
      newData: { status: parsedStatus.data },
      source: "server_action",
    });

    // ⚡ No revalidatePath — client uses optimistic UI + Realtime for sync
    return null;
  });
}

export async function deletePrintingOrder(
  id: string,
): Promise<ActionResult<null>> {
  return withPrintingAccess(async (supabase, userId) => {
    const { data, error } = await supabase.rpc("delete_printing_order_atomic", {
      p_actor_id: userId,
      p_order_id: id,
    });

    if (error) {
      throw new Error(`Khong the xoa don in: ${error.message}`);
    }

    const result = asRpcRecord(data);
    const orderCode = String(result.order_code || id);
    const contractId = typeof result.contract_id === "string" ? result.contract_id : null;

    fireAuditLog({
      action: "DELETE",
      tableName: "printing_orders",
      recordId: id,
      description: `Xoa mem don in ${orderCode}`,
      source: "server_action",
    });

    revalidatePath("/printing");
    if (contractId) {
      revalidatePath(`/contracts/${contractId}`);
    }

    return null;
  });
}
