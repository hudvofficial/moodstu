"use server";

import { withAuth } from "@/lib/auth_utils";

// ═══════════════════════════════════════════
// Audit Log Actions — Paginated loading
// V1 ref: audit-logs.ts (23 lines)
// V2: withAuth instead of raw createClient
// ═══════════════════════════════════════════

export async function loadMoreAuditLogs(offset: number, limit: number = 30, typeFilter?: string) {
  return withAuth(async (supabase) => {
    let query = supabase
      .from("audit_logs")
      .select("id, action, table_name, record_id, description, log_type, severity, source, created_at, employee:employee_id(full_name, avatar_url)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeFilter && typeFilter !== "ALL") query = query.eq("log_type", typeFilter);
    const { data } = await query;
    return data || [];
  });
}
