"use server";

import { withPrintingAccess } from "@/lib/auth_utils";
import { fireAuditLog } from "@/lib/audit";
import {
  invalidateContractPaths,
  invalidatePrintingPaths,
} from "@/lib/server-cache-invalidation";
import {
  createPrintingOrderSchema,
  printingStatusSchema,
  updatePrintingOrderSchema,
} from "@/lib/validations/printing.schema";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const VALID_TRANSITIONS: Record<string, string[]> = {
  // Workflow statuses (Phase 2)
  cho_xu_ly: ["dat_coc", "dang_in", "huy_don", "gap_su_co"],   // Can deposit OR skip to printing OR cancel OR flag issue
  dat_coc: ["dang_in", "huy_don", "gap_su_co"],                // Can start production OR cancel OR flag issue
  dang_in: ["da_in", "huy_don", "gap_su_co"],                  // Can complete OR cancel OR flag issue
  da_in: ["da_giao", "huy_don", "gap_su_co", "dang_in"],       // Can deliver OR cancel OR flag issue OR rework
  da_giao: ["hoan_thanh", "huy_don", "gap_su_co"],             // Can finalize OR cancel OR flag issue
  hoan_thanh: [],                                               // Terminal state
  huy_don: [],                                                  // Terminal state (cancelled)
  gap_su_co: ["cho_xu_ly", "dat_coc", "dang_in", "da_in", "da_giao", "huy_don"], // Can resume to any active state or cancel

  // Legacy statuses (keep for backward compatibility)
  da_nhan: [],                                                  // Terminal state
  da_huy: [],                                                   // Terminal state (old cancelled)
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

    invalidatePrintingPaths(input.contractId);
    invalidateContractPaths(input.contractId, {
      list: true,
      detail: true,
      finance: { receipts: false, cashflow: true },
    });

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

    invalidatePrintingPaths(contractId);
    return null;
  });
}

export async function updatePrintingOrderStatus(
  id: string,
  newStatus: string,
  _contractId: string,
  reason?: string | null,
): Promise<ActionResult<null>> {
  void _contractId;

  const parsedStatus = printingStatusSchema.safeParse(newStatus);
  if (!parsedStatus.success) {
    return { success: false, error: "Trang thai don in khong hop le" };
  }

  // Statuses that require a reason
  const REASON_REQUIRED: string[] = ["gap_su_co", "huy_don"];
  const isRollback = (from: string, to: string) => {
    const ORDER = ["cho_xu_ly", "dat_coc", "dang_in", "da_in", "da_giao", "hoan_thanh"];
    const fromIdx = ORDER.indexOf(from);
    const toIdx = ORDER.indexOf(to);
    return fromIdx >= 0 && toIdx >= 0 && toIdx < fromIdx;
  };

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

    // Require reason for issue/cancel/rollback transitions
    const needsReason = REASON_REQUIRED.includes(parsedStatus.data) || isRollback(currentStatus, parsedStatus.data);
    if (needsReason && (!reason || !reason.trim())) {
      throw new Error("Vui long nhap ly do khi chuyen trang thai nay");
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

    // Issue tracking metadata
    if (parsedStatus.data === "gap_su_co") {
      updateData.issue_reason = reason?.trim() || null;
      updateData.issue_reported_at = now;
      updateData.issue_reported_by = userId;
    } else if (currentStatus === "gap_su_co") {
      // Clearing issue when resuming from gap_su_co
      updateData.issue_reason = null;
      updateData.issue_reported_at = null;
      updateData.issue_reported_by = null;
    }

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

    // Write status history for velocity analytics & audit trail
    await supabase
      .from("printing_order_status_history")
      .insert({
        order_id: id,
        from_status: currentStatus,
        to_status: parsedStatus.data,
        changed_by: userId,
        changed_at: now,
        reason: reason?.trim() || null,
        source: "manual",
      })
      .then(({ error: histErr }) => {
        // Non-blocking: log but don't fail the status update
        if (histErr) console.error("[printing] Failed to write status history:", histErr.message);
      });

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

    invalidatePrintingPaths(contractId);

    return null;
  });
}
