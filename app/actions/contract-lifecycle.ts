"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Contract Lifecycle — Cancel + Delete + Reactivate
// Split from contract-mutations.ts (lesson #7: max 250 lines)
// ═══════════════════════════════════════════

// ─── cancelContract (Cascade) ────────────────
// V1 pattern: cascade status to tasks + prints
export async function cancelContract(
  contractId: string,
  reason: string
) {
  if (!reason.trim()) {
    return { success: false as const, error: "Lý do hủy là bắt buộc" };
  }

  return withAuth(async (supabase, userId) => {
    const now = new Date().toISOString();

    // Step 1: Update contract
    const { error } = await supabase
      .from("contracts")
      .update({
        status: "da_huy",
        cancel_reason: reason.trim(),
        cancelled_at: now,
        cancelled_by: userId,
        updated_by: userId,
        updated_at: now,
      })
      .eq("id", contractId)
      .is("deleted_at", null);

    if (error) throw new Error(`Lỗi hủy HĐ: ${error.message}`);

    // Step 2: Cascade → work_tasks
    await supabase
      .from("work_tasks")
      .update({ status: "da_huy", updated_at: now })
      .eq("contract_id", contractId)
      .neq("status", "da_huy");

    // Step 3: Cascade → printing_orders (if applicable)
    try {
      await supabase
        .from("printing_orders")
        .update({ status: "da_huy", updated_at: now })
        .eq("contract_id", contractId)
        .neq("status", "da_huy");
    } catch {
      // Gracefully skip if table doesn't exist
    }

    // Step 4: Cascade → payment_plans (if applicable)
    try {
      await supabase
        .from("payment_plans")
        .update({ status: "cancelled", updated_at: now })
        .eq("contract_id", contractId);
    } catch {
      // Gracefully skip if table doesn't exist
    }

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}

// ─── deleteContract (Protected) ──────────────
// Block if hasReceipts (lesson #8: Ghost Payment prevention)
export async function deleteContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
    // Check: any payments exist?
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("contract_id", contractId)
      .is("deleted_at", null);

    if (count && count > 0) {
      throw new Error(
        "Không thể xóa hợp đồng đã có phiếu thu. Hãy hủy hợp đồng thay vì xóa."
      );
    }

    const now = new Date().toISOString();

    // Soft delete contract
    const { error } = await supabase
      .from("contracts")
      .update({ deleted_at: now, updated_by: userId, updated_at: now })
      .eq("id", contractId);

    if (error) throw new Error(`Lỗi xóa HĐ: ${error.message}`);

    // Soft delete related items
    await supabase
      .from("contract_items")
      .delete()
      .eq("contract_id", contractId);

    // Soft delete related events
    await supabase
      .from("contract_events")
      .delete()
      .eq("contract_id", contractId);

    revalidatePath("/contracts");
    return null;
  });
}

// ─── reactivateContract ──────────────────────
// Reverse a cancellation — set back to cho_xu_ly
export async function reactivateContract(contractId: string) {
  return withAuth(async (supabase, userId) => {
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

    revalidatePath("/contracts");
    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}
