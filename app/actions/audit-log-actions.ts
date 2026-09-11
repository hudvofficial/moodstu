"use server";

import { withAdmin } from "@/lib/auth_utils";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const PAGE_SIZE = 20;

export async function fetchAuditLogs(
  page: number = 1,
  typeFilter?: string,
) {
  return withAdmin(async (supabase: SupabaseClient<Database>) => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("audit_logs")
      // #19: tên người lấy từ performed_by (auth.users.id) — cột mà app và trigger đều điền được;
      // employee_id giữ làm dự phòng vì chỉ 4/3.466 dòng từng có. Quan hệ khai tường minh vì
      // audit_logs có hai đường tới employees.
      .select(
        "id, action, table_name, record_id, description, log_type, severity, source, created_at, performed_by, employee:employee_id(full_name, avatar_url)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (typeFilter && typeFilter !== "all") {
      query = query.eq("log_type", typeFilter as Database["public"]["Enums"]["log_type_enum"]);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Loi tai audit logs: ${error.message}`);
    }

    const rows = data || [];

    // #19: đổi performed_by (auth.users.id) thành tên người. Không join được trực tiếp vì cột này
    // không có khoá ngoại tới employees — tra một lượt theo auth_user_id rồi gắn vào từng dòng.
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

    const logs = rows.map((r) => ({
      ...r,
      actor_name: r.performed_by ? actorNames.get(r.performed_by) ?? null : null,
    }));

    return { logs, total: count || 0, pageSize: PAGE_SIZE };
  });
}
