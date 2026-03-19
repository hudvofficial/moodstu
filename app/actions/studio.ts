"use server";

import { withAuth } from "@/lib/auth_utils";
import type { StudioInfo } from "@/types/contract";

// ═══════════════════════════════════════════
// Studio Actions — shared server actions
// Phase 02F: getStudioInfo for print template
// ═══════════════════════════════════════════

/** Get studio info (single row) */
export async function getStudioInfo() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("studio_info")
      .select("*")
      .limit(1)
      .single();

    if (error) throw new Error(`Lỗi lấy thông tin studio: ${error.message}`);
    return data as StudioInfo;
  });
}
