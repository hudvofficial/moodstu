"use server";

import { withAuth } from "@/lib/auth_utils";

// ═══════════════════════════════════════════
// Audit Log Actions — Page-based pagination
// V2: withAuth + server-side paging + count
// ═══════════════════════════════════════════

const PAGE_SIZE = 20;

export async function fetchAuditLogs(
  page: number = 1,
  typeFilter?: string
) {
  return withAuth(async (supabase) => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("audit_logs")
      .select(
        "id, action, table_name, record_id, description, log_type, severity, source, created_at, employee:employee_id(full_name, avatar_url)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (typeFilter && typeFilter !== "all") {
      query = query.eq("log_type", typeFilter);
    }

    const { data, count } = await query;
    return { logs: data || [], total: count || 0, pageSize: PAGE_SIZE };
  });
}
