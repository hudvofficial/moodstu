import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditLogList from "@/components/settings/audit-log-list";

/* ═══════════════════════════════════════════
   Audit Logs Page — Admin Only (Server Component)
   Route: /audit-logs
   ═══════════════════════════════════════════ */

const PAGE_SIZE = 20;

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check admin role
  const { data: employee } = await supabase
    .from("employees")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!employee || employee.role?.toLowerCase() !== "admin") {
    redirect("/settings");
  }

  // Initial load — page 1
  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select(
      "id, action, table_name, record_id, description, log_type, severity, source, created_at, employee:employee_id(full_name, avatar_url)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  return (
    <AuditLogList
      initialLogs={logs || []}
      totalCount={count || 0}
      pageSize={PAGE_SIZE}
    />
  );
}
