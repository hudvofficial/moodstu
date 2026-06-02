"use server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════
// Audit System — V2 port from V1 lib/audit.ts
// Key differences:
//   - Uses performed_by (auth.users.id), not employee_id
//   - No Sentry (V2 uses console.error for now)
//   - Uses createAdminClient for writes (bypass RLS)
// ═══════════════════════════════════════════

// ─── Types ────────────────────────────────
export type LogType =
  | "EVENT_CHANGE"
  | "ASSIGNMENT"
  | "CONFLICT"
  | "ERROR"
  | "GENERAL";

export type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
export type LogSource = "trigger" | "server_action" | "frontend" | "system";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "APPROVE"
  | "LOGIN"
  | "EXPORT"
  | "DETECT"
  | "FAIL";

interface BaseLogParams {
  action: AuditAction;
  tableName: string;
  recordId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  description?: string;
  logType?: LogType;
  severity?: Severity;
  source?: LogSource;
  /** auth.users.id of the actor — pass from the server action (do NOT read cookies() here). */
  performedBy?: string | null;
  /** employees.id of the actor, when known. */
  employeeId?: string | null;
}

// ─── Core: writeAuditLog ─────────────────
export async function writeAuditLog(params: BaseLogParams) {
  try {
    // ❌ DO NOT use createClient() or supabase.auth.getUser() here!
    // This runs in a floating Promise in Server Actions. Calling cookies()
    // after the action has returned will cause Next.js to throw "Dynamic server usage"
    // and abort concurrent RSC streams, leading to weird UI redirects.
    // The actor MUST be passed in via params (performedBy/employeeId) by the caller,
    // which already has it in scope — we never resolve it from cookies here.
    const employeeId: string | null = params.employeeId ?? null;
    const userId: string | null = params.performedBy ?? null;

    // We can still safely use createAdminClient because it doesn't read cookies()!
    const adminSupabase = await createAdminClient();

    await adminSupabase.from("audit_logs").insert({
      performed_by: userId,
      employee_id: employeeId,
      action: params.action,
      table_name: params.tableName,
      record_id: params.recordId || null,
      old_data: params.oldData || null,
      new_data: params.newData || null,
      description: params.description || null,
      log_type: params.logType || "GENERAL",
      severity: params.severity || "INFO",
      source: params.source || "system",
    });
  } catch (err) {
    // Last resort: console.error (can't log to DB if DB fails)
    console.error("[AuditLog] Failed to write:", err);
  }
}

// ─── Fire-and-forget (non-blocking) ──────
export async function fireAuditLog(params: BaseLogParams): Promise<void> {
  writeAuditLog(params).catch((e) => {
    console.error("[AuditLog] Fire failed:", params.description, e);
  });
}

// ─── Helper: logConflict (time overlap) ──
export async function logConflict(params: {
  employeeId: string;
  employeeName?: string;
  contractCode?: string;
  conflictType: "time_overlap" | "deadline_overlap";
  conflicts: {
    contract_code?: string;
    event_name?: string;
    start_time?: string;
    end_time?: string;
    deadline?: string;
  }[];
}) {
  const conflictList = params.conflicts
    .map((c) =>
      c.contract_code
        ? `${c.contract_code} (${c.event_name || c.start_time || c.deadline})`
        : "unknown"
    )
    .join(", ");

  const desc =
    params.conflictType === "time_overlap"
      ? `Trùng giờ on-set: "${params.employeeName || params.employeeId}" đã có lịch tại ${conflictList}`
      : `Trùng deadline hậu kỳ: "${params.employeeName || params.employeeId}" đã có task tại ${conflictList}`;

  await writeAuditLog({
    action: "DETECT",
    tableName: "work_tasks",
    recordId: params.employeeId,
    description: desc,
    newData: {
      employee_id: params.employeeId,
      employee_name: params.employeeName,
      contract_code: params.contractCode,
      conflict_type: params.conflictType,
      conflicts: params.conflicts,
    } as Record<string, unknown>,
    logType: "CONFLICT",
    severity: "WARNING",
    source: "server_action",
  });
}

// ─── Helper: logError (with stack trace) ──
export async function logError(params: {
  error: unknown;
  context: string;
  tableName?: string;
  recordId?: string;
  severity?: "ERROR" | "CRITICAL";
}) {
  const err =
    params.error instanceof Error
      ? params.error
      : new Error(String(params.error));

  await writeAuditLog({
    action: "FAIL",
    tableName: params.tableName || "system",
    recordId: params.recordId,
    description: `[${params.context}] ${err.message}`,
    newData: {
      error_message: err.message,
      error_stack: err.stack?.split("\n").slice(0, 5).join("\n"),
      context: params.context,
    },
    logType: "ERROR",
    severity: params.severity || "ERROR",
    source: "server_action",
  });
}
