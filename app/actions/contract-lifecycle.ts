"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";
import { fireAuditLog } from "@/lib/audit";

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
