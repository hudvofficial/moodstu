"use client";

import { useState, useCallback, useTransition } from "react";
import { fetchAuditLogs } from "@/app/actions/audit-log-actions";
import { toast } from "@/lib/toast-manager";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { Pagination } from "@/components/ui/pagination";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ScrollText, Clock, User } from "lucide-react";
import { TierSwitch } from "@/components/ui/tier-switch";
import type { BadgeVariant } from "@/components/ui/badge";

/* ═══════════════════════════════════════════
   AuditLogList — V2 Gold Standard
   Fix #1: No local SearchBar (uses Header ?q=)
   Fix #2: SelectPill instead of native <select>
   Fix #3: Server-side Pagination
   Fix #4: Mobile card layout
   ═══════════════════════════════════════════ */

interface AuditLogEmployee {
  full_name: string;
  avatar_url: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  description: string | null;
  log_type: string | null;
  severity: string | null;
  source: string | null;
  created_at: string;
  employee: AuditLogEmployee | AuditLogEmployee[] | null;
}

interface AuditLogListProps {
  initialLogs: AuditLog[];
  totalCount: number;
  pageSize: number;
}

// ── Constants ──────────────────────────────────────
const LOG_TYPE_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "AUTH", label: "AUTH" },
  { value: "DATA", label: "DATA" },
  { value: "SYSTEM", label: "SYSTEM" },
  { value: "ERROR", label: "ERROR" },
];

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  info: "info",
  warning: "warning",
  error: "error",
  critical: "error",
};

// ── Helpers ────────────────────────────────────────
function formatLogTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getEmployeeName(emp: AuditLog["employee"]): string {
  if (!emp) return "Hệ thống";
  if (Array.isArray(emp)) return emp[0]?.full_name || "Hệ thống";
  return emp.full_name || "Hệ thống";
}

// ── Component ──────────────────────────────────────
export default function AuditLogList({ initialLogs, totalCount, pageSize }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [total, setTotal] = useState(totalCount);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    startTransition(async () => {
      const result = await fetchAuditLogs(newPage, typeFilter);
      if (result.success && result.data) {
        const { logs: newLogs, total: newTotal } = result.data as { logs: AuditLog[]; total: number };
        setLogs(newLogs);
        setTotal(newTotal);
      } else if (!result.success) {
        toast.error(result.error || "Không thể tải nhật ký hoạt động");
      }
    });
  }, [typeFilter]);

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value);
    setPage(1);
    startTransition(async () => {
      const result = await fetchAuditLogs(1, value);
      if (result.success && result.data) {
        const { logs: newLogs, total: newTotal } = result.data as { logs: AuditLog[]; total: number };
        setLogs(newLogs);
        setTotal(newTotal);
      } else if (!result.success) {
        toast.error(result.error || "Không thể tải nhật ký hoạt động");
      }
    });
  }, []);

  return (
    <div className={`main-container pb-28 lg:pb-12 ${isPending ? "opacity-70 pointer-events-none" : ""}`}>
      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: "Cài đặt", href: "/settings" },
        { label: "Nhật ký hoạt động" },
      ]} />

      {/* ── Header + Filter ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          <h1 className="text-h3 text-text-primary">Nhật ký hoạt động</h1>
          <Badge variant="neutral">{total}</Badge>
        </div>
        <SelectPill
          value={typeFilter}
          onChange={handleTypeChange}
          defaultValue="all"
          placeholder="Loại"
          options={LOG_TYPE_OPTIONS}
        />
      </div>

      <TierSwitch
        phone={
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="card-base py-12 text-center text-text-muted">
                Chưa có nhật ký nào
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="card-base p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-text-secondary text-caption">
                      <Clock className="w-3.5 h-3.5" />
                      {formatLogTime(log.created_at)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {log.log_type && <Badge variant="neutral">{log.log_type}</Badge>}
                      {log.severity && (
                        <Badge variant={SEVERITY_VARIANT[log.severity] || "neutral"} dot>
                          {log.severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-text-muted shrink-0" />
                    <span className="text-body-sm text-text-primary">
                      {getEmployeeName(log.employee)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{log.action}</span>
                    {log.table_name && (
                      <span className="text-text-secondary text-caption">→ {log.table_name}</span>
                    )}
                  </div>
                  {log.description && (
                    <p className="text-text-secondary text-caption line-clamp-2">{log.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        }
        desktop={
          <TableWrapper>
            <THead>
              <tr>
                <TH>Thời gian</TH>
                <TH>Người thực hiện</TH>
                <TH>Hành động</TH>
                <TH>Bảng</TH>
                <TH>Mô tả</TH>
                <TH>Loại</TH>
                <TH>Mức độ</TH>
              </tr>
            </THead>
            <TBody>
              {logs.length === 0 ? (
                <TR>
                  <td colSpan={7} className="px-4 text-center py-12 text-text-muted">
                    Chưa có nhật ký nào
                  </td>
                </TR>
              ) : (
                logs.map((log) => (
                  <TR key={log.id}>
                    <TD className="text-text-secondary text-caption whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatLogTime(log.created_at)}
                      </span>
                    </TD>
                    <TD>
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4 text-text-muted shrink-0" />
                        <span className="text-body-sm truncate max-w-35">
                          {getEmployeeName(log.employee)}
                        </span>
                      </span>
                    </TD>
                    <TD className="font-medium text-text-primary">{log.action}</TD>
                    <TD className="text-text-secondary">{log.table_name || "—"}</TD>
                    <TD className="text-text-secondary text-caption max-w-50 truncate">
                      {log.description || "—"}
                    </TD>
                    <TD>
                      {log.log_type && <Badge variant="neutral">{log.log_type}</Badge>}
                    </TD>
                    <TD>
                      {log.severity && (
                        <Badge variant={SEVERITY_VARIANT[log.severity] || "neutral"} dot>
                          {log.severity}
                        </Badge>
                      )}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </TableWrapper>
        }
      />

      {/* ── Pagination ── */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={handlePageChange}
        className="mt-6"
      />

      {/* ── Footer Count ── */}
      {total > 0 && (
        <p className="text-center text-caption text-text-muted mt-2">
          Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} của {total} bản ghi
        </p>
      )}
    </div>
  );
}
