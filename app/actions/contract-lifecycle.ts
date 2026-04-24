"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

const ACTIVE_RESERVATION_STATUSES = ["reserved", "in_use", "rented"] as const;

type AdminSupabase = Parameters<Parameters<typeof withAuth>[0]>[0];

async function getContractDressIds(supabase: AdminSupabase, contractId: string) {
  const { data } = await supabase
    .from("dress_reservations")
    .select("dress_id")
    .eq("contract_id", contractId);

  return Array.from(new Set((data || []).map((row) => row.dress_id).filter(Boolean)));
}

async function refreshDressStatuses(supabase: AdminSupabase, dressIds: string[]) {
  for (const dressId of Array.from(new Set(dressIds)).filter(Boolean)) {
    const { data: activeReservations } = await supabase
      .from("dress_reservations")
      .select("status")
      .eq("dress_id", dressId)
      .in("status", [...ACTIVE_RESERVATION_STATUSES]);

    const nextStatus = (activeReservations || []).some((row) =>
      row.status === "in_use" || row.status === "rented"
    )
      ? "rented"
      : (activeReservations || []).length > 0
        ? "reserved"
        : "available";

    await supabase
      .from("dresses")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", dressId);
  }
}

async function cancelDressReservationsForContract(
  supabase: AdminSupabase,
  contractId: string,
) {
  const dressIds = await getContractDressIds(supabase, contractId);

  await supabase
    .from("dress_reservations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("contract_id", contractId)
    .in("status", [...ACTIVE_RESERVATION_STATUSES]);

  await refreshDressStatuses(supabase, dressIds);
}

// ═══════════════════════════════════════════
// Contract Lifecycle — Cancel + Delete + Reactivate
// Split from contract-mutations.ts (lesson #7: max 250 lines)
// Phase 03 audit fix: Atomic RPCs replace sequential updates
// ═══════════════════════════════════════════

// ─── cancelContract (Atomic RPC) ────────────────
// Uses DB-level transaction for consistency (C1 fix)
export async function cancelContract(
  contractId: string,
  reason: string
) {
  if (!reason.trim()) {
    return { success: false as const, error: "Lý do hủy là bắt buộc" };
  }

  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { error } = await supabase.rpc("cancel_contract_cascade", {
      p_contract_id: contractId,
      p_reason: reason.trim(),
      p_user_id: userId,
    });

    if (error) throw new Error(`Lỗi hủy HĐ: ${error.message}`);

    await cancelDressReservationsForContract(supabase, contractId);
    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "contracts",
      recordId: contractId,
      description: `Hủy HĐ: ${contractId.substring(0, 8)}... — Lý do: ${reason.trim()}`,
      source: "server_action",
      severity: "WARNING",
    });

    return null;
  });
}

// ─── deleteContract (Atomic RPC — Soft Delete ALL) ──────────────
// Uses DB-level transaction, consistent soft delete strategy (C2 fix)
export async function deleteContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { error } = await supabase.rpc("delete_contract_cascade", {
      p_contract_id: contractId,
      p_user_id: userId,
    });

    if (error) throw new Error(error.message);

    await cancelDressReservationsForContract(supabase, contractId);
    revalidatePath("/contracts");

    fireAuditLog({
      action: "DELETE",
      tableName: "contracts",
      recordId: contractId,
      description: `Xóa HĐ: ${contractId.substring(0, 8)}...`,
      source: "server_action",
      severity: "WARNING",
    });

    return null;
  });
}

// ─── reactivateContract ──────────────────────
// Reverse a cancellation — set back to cho_xu_ly
// W2 fix: also reactivate cancelled payment_plans
export async function reactivateContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const now = new Date().toISOString();
    const { data: activeDressItems } = await supabase
      .from("contract_items")
      .select("id")
      .eq("contract_id", contractId)
      .eq("type", "trang_phuc")
      .is("deleted_at", null)
      .not("dress_id", "is", null);

    const activeDressItemIds = new Set((activeDressItems || []).map((item) => item.id));
    const { data: cancelledReservations } = await supabase
      .from("dress_reservations")
      .select("id, dress_id, contract_item_id, start_date, end_date")
      .eq("contract_id", contractId)
      .eq("status", "cancelled");

    const reservationsToRestore = (cancelledReservations || []).filter(
      (reservation) =>
        reservation.contract_item_id && activeDressItemIds.has(reservation.contract_item_id),
    );

    for (const reservation of reservationsToRestore) {
      const { data: overlaps } = await supabase
        .from("dress_reservations")
        .select("id")
        .eq("dress_id", reservation.dress_id)
        .in("status", [...ACTIVE_RESERVATION_STATUSES])
        .lte("start_date", reservation.end_date)
        .gte("end_date", reservation.start_date)
        .limit(1);

      if (overlaps && overlaps.length > 0) {
        throw new Error("Khong the kich hoat lai vi trang phuc da duoc dat cho lich khac");
      }
    }

    const { error } = await supabase
      .from("contracts")
      .update({
        status: "cho_xu_ly",
        cancel_reason: null,
        cancelled_at: null,
        cancelled_by: null,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", contractId)
      .eq("status", "da_huy"); // Only reactivate cancelled contracts

    if (error) throw new Error(`Lỗi kích hoạt lại HĐ: ${error.message}`);

    // Reactivate tasks that were cancelled with the contract
    await supabase
      .from("work_tasks")
      .update({ status: "chua_lam", updated_at: now })
      .eq("contract_id", contractId)
      .eq("status", "da_huy");

    // W2 fix: Reactivate payment plans that were cancelled with the contract
    await supabase
      .from("payment_plans")
      .update({ status: "pending", updated_at: now })
      .eq("contract_id", contractId)
      .eq("status", "cancelled");

    await supabase
      .from("printing_orders")
      .update({ status: "cho_xu_ly", updated_by: userId, updated_at: now })
      .eq("contract_id", contractId)
      .eq("status", "da_huy");

    if (reservationsToRestore.length > 0) {
      await supabase
        .from("dress_reservations")
        .update({ status: "reserved", updated_at: now })
        .in("id", reservationsToRestore.map((reservation) => reservation.id));

      await refreshDressStatuses(
        supabase,
        reservationsToRestore.map((reservation) => reservation.dress_id),
      );
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);

    fireAuditLog({
      action: "UPDATE",
      tableName: "contracts",
      recordId: contractId,
      description: `Kích hoạt lại HĐ: ${contractId.substring(0, 8)}...`,
      source: "server_action",
    });

    return null;
  });
}
