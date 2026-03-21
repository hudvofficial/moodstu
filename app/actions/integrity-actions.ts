"use server";

import { withAuth } from "@/lib/auth_utils";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════
// Integrity Actions — Data Integrity Scans
// V1 ref: integrity.ts (36 lines)
// V2: withAuth instead of withAdmin
// ═══════════════════════════════════════════

export async function fetchIntegrityReports() {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase
      .from("integrity_reports")
      .select("id, scan_date, status, checks, total_issues, warning_count, info_count, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(`Lỗi tải báo cáo: ${error.message}`);
    return data || [];
  });
}

export async function runManualIntegrityScan() {
  return withAuth(async (supabase) => {
    const { error } = await supabase.rpc("run_integrity_scan");
    if (error) throw new Error(`Lỗi chạy quét: ${error.message}`);
    revalidatePath("/settings/audit-logs");
    return null;
  });
}
