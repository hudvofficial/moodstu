import { redirect } from "next/navigation";
import AuditLogList from "@/components/settings/audit-log-list";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata = { title: "Nhật ký hệ thống" };

const PAGE_SIZE = 20;

export default async function AuditLogsPage() {
  const context = await getAuthenticatedUserContext();

  if (!context) redirect("/login");
  if (!context.canManageSettings) redirect("/settings");

  const supabase = await createAdminClient();
  const { data: logs, count, error } = await supabase
    .from("audit_logs")
    // #19: performed_by là cột danh tính thật (app + trigger DB đều điền); employee_id chỉ là dự phòng.
    .select(
      "id, action, table_name, record_id, description, log_type, severity, source, created_at, performed_by, employee:employee_id(full_name, avatar_url)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (error) {
    throw new Error(`Loi tai audit logs: ${error.message}`);
  }

  // #19: đổi performed_by thành tên người (không join trực tiếp được vì cột không có khoá ngoại).
  const rows = logs || [];
  const actorIds = [...new Set(rows.map((r) => r.performed_by).filter((v): v is string => Boolean(v)))];
  const actorNames = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: emps } = await supabase
      .from("employees")
      .select("auth_user_id, full_name")
      .in("auth_user_id", actorIds);

    for (const e of emps || []) {
      if (e.auth_user_id && e.full_name) actorNames.set(e.auth_user_id, e.full_name);
    }
  }

  return (
    <AuditLogList
      initialLogs={rows.map((r) => ({
        ...r,
        actor_name: r.performed_by ? actorNames.get(r.performed_by) ?? null : null,
      }))}
      totalCount={count || 0}
      pageSize={PAGE_SIZE}
    />
  );
}

