"use server";

import { requireContractAccess, withAuth } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Note Actions — Contract Notes CRUD
// Phase 07B: Chat-style notes timeline
// ═══════════════════════════════════════════

/** Get all notes for a contract */
export async function getContractNotes(contractId: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);

    const { data, error } = await supabase
      .from("contract_notes")
      .select("id, content, created_by, created_at")
      .eq("contract_id", contractId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Lỗi lấy ghi chú: ${error.message}`);
    return data || [];
  });
}

/** Add a note to a contract */
export async function addContractNote(contractId: string, content: string) {
  if (!content.trim()) {
    return { success: false as const, error: "Nội dung không được trống" };
  }

  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("contract_notes")
      .insert({
        contract_id: contractId,
        content: content.trim(),
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
      .select("id, content, created_by, created_at")
      .single();

    if (error) throw new Error(`Lỗi thêm ghi chú: ${error.message}`);

    revalidatePath(`/contracts/${contractId}`);
    return data;
  });
}

/** Delete a contract note */
export async function deleteContractNote(noteId: string, contractId: string) {
  return withAuth(async (supabase: SupabaseClient<Database>, userId) => {
    await requireContractAccess(supabase, userId);

    const { error } = await supabase
      .from("contract_notes")
      .delete()
      .eq("id", noteId);

    if (error) throw new Error(`Lỗi xóa ghi chú: ${error.message}`);

    revalidatePath(`/contracts/${contractId}`);
    return null;
  });
}
