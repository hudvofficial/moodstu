"use server";

import { withAdmin } from "@/lib/auth_utils";

const PAGE_SIZE = 20;

export async function fetchAuditLogs(
  page: number = 1,
  typeFilter?: string,
) {
  return withAdmin(async (supabase) => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("audit_logs")
      .select(
        "id, action, table_name, record_id, description, log_type, severity, source, created_at, employee:employee_id(full_name, avatar_url)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (typeFilter && typeFilter !== "all") {
      query = query.eq("log_type", typeFilter);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Loi tai audit logs: ${error.message}`);
    }

    return { logs: data || [], total: count || 0, pageSize: PAGE_SIZE };
  });
}
