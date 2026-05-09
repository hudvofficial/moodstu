"use server";

import {
  requireContractAccess,
  requireContractWriteAccess,
  withAuth,
} from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Checklist Actions — CRUD for contract checklists
// Phase 07D.4: V1 Port
// ═══════════════════════════════════════════

/** Get all checklist items for a contract */
export async function getContractChecklists(contractId: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("contract_checklists")
      .select("id, contract_id, event_stage, category, item_name, is_completed, created_at, updated_at")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Lỗi lấy checklist: ${error.message}`);
    return data || [];
  });
}

/** Toggle a checklist item (optimistic-friendly) */
export async function toggleChecklist(id: string, is_completed: boolean) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);

    const { data, error } = await supabase
      .from("contract_checklists")
      .update({ is_completed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, item_name, contract_id")
      .single();

    if (error) throw new Error(`Lỗi cập nhật checklist: ${error.message}`);
    if (!data) throw new Error("Không tìm thấy checklist item");

    revalidatePath(`/contracts/${data.contract_id}`);
    return data;
  });
}

/** Internal: skip auth — for use within already-authenticated server actions */
export async function _generateChecklistsInternal(
  supabase: Parameters<Parameters<typeof withAuth>[0]>[0],
  contractId: string,
  serviceType: string,
) {
  const { count, error: countError } = await supabase
    .from("contract_checklists")
    .select("id", { count: "exact", head: true })
    .eq("contract_id", contractId);

  if (countError) throw new Error(`Loi kiem tra checklist: ${countError.message}`);
  if (count && count > 0) {
    return { generated: 0, message: "Checklists đã tồn tại" };
  }

  const { data: templates, error: tplError } = await supabase
    .from("checklist_templates")
    .select("event_stage, category, item_name, sort_order")
    .eq("service_type", serviceType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (tplError) throw new Error(`Lỗi đọc templates: ${tplError.message}`);
  if (!templates || templates.length === 0) {
    return { generated: 0, message: `Không có template cho "${serviceType}"` };
  }

  const rows = templates.map((t) => ({
    contract_id: contractId,
    event_stage: t.event_stage,
    category: t.category,
    item_name: t.item_name,
    is_completed: false,
  }));

  const { error: insertError } = await supabase
    .from("contract_checklists")
    .insert(rows);

  if (insertError) throw new Error(`Lỗi tạo checklists: ${insertError.message}`);

  return { generated: rows.length, message: `Đã tạo ${rows.length} checklist items` };
}

/** Auto-generate checklists from templates for a new contract */
export async function generateChecklists(contractId: string, serviceType: string) {
  return withAuth(async (supabase, userId) => {
    await requireContractWriteAccess(supabase, userId);
    const result = await _generateChecklistsInternal(supabase, contractId, serviceType);
    revalidatePath(`/contracts/${contractId}`);
    return result;
  });
}
