import { redirect } from "next/navigation";
import AuditLogList from "@/components/settings/audit-log-list";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export default async function AuditLogsPage() {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!context.canManageSettings) redirect("/settings");

  const supabase = await createAdminClient();
  const { data: logs, count, error } = await supabase
    .from("audit_logs")
    .select(
      "id, action, table_name, record_id, description, log_type, severity, source, created_at, employee:employee_id(full_name, avatar_url)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    throw new Error(`Loi tai audit logs: ${error.message}`);
  }

  return (
    <AuditLogList
      initialLogs={logs || []}
      totalCount={count || 0}
      pageSize={PAGE_SIZE}
    />
  );
}
