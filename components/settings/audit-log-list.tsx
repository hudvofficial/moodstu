"use client";

import { useState, useCallback, useTransition } from "react";
import { loadMoreAuditLogs } from "@/app/actions/audit-log-actions";
import { TableWrapper, THead, TBody, TH, TD, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search-bar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ScrollText, Loader2, User, Clock } from "lucide-react";
import type { BadgeVariant } from "@/components/ui/badge";

/* ═══════════════════════════════════════════
   AuditLogList — Client Component with infinite load & filter
   Uses: SSOT Table*, Badge, Button, SearchBar
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
}

const LOG_TYPE_OPTIONS = ["ALL", "AUTH", "DATA", "SYSTEM", "ERROR"];

const SEVERITY_VARIANT: Record<string, BadgeVariant> = {
  info: "info",
  warning: "warning",
  error: "error",
  critical: "error",
};

function formatLogTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Safely extract employee name from Supabase FK join (can be object or array) */
function getEmployeeName(emp: AuditLog["employee"]): string {
  if (!emp) return "Hệ thống";
  if (Array.isArray(emp)) return emp[0]?.full_name || "Hệ thống";
  return emp.full_name || "Hệ thống";
}

export default function AuditLogList({ initialLogs }: AuditLogListProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [hasMore, setHasMore] = useState(initialLogs.length >= 30);
  const [isPending, startTransition] = useTransition();

  const loadMore = useCallback(() => {
    startTransition(async () => {
      const result = await loadMoreAuditLogs(logs.length, 30, typeFilter);
      if (result.success && Array.isArray(result.data)) {
        const newLogs = result.data as AuditLog[];
        setLogs((prev) => [...prev, ...newLogs]);
        if (newLogs.length < 30) setHasMore(false);
      }
    });
  }, [logs.length, typeFilter]);

  // Filter by search term (client-side for current loaded data)
  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.description?.toLowerCase().includes(q) ||
      log.table_name?.toLowerCase().includes(q) ||
      getEmployeeName(log.employee).toLowerCase().includes(q)
    );
  });

  return (
    <div className="main-container pb-28 lg:pb-12">
      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: "Cài đặt", href: "/settings" },
        { label: "Nhật ký hoạt động" },
      ]} />

      {/* ── Header + Filters ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-primary" />
          <h1 className="text-h3 text-text">Nhật ký hoạt động</h1>
          <Badge variant="neutral">{filtered.length}</Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-64">
            <SearchBar
              placeholder="Tìm theo hành động, mô tả..."
              value={search}
              onChange={setSearch}
            />
          </div>
          {/* eslint-disable-next-line react/forbid-elements -- select inside filter bar */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setLogs(initialLogs); // reset when filter changes
              setHasMore(true);
            }}
            className="input-base w-auto min-w-[100px]"
          >
            {LOG_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === "ALL" ? "Tất cả" : t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
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
          {filtered.length === 0 ? (
            <TR>
              <td colSpan={7} className="px-4 text-center py-12 text-text-muted">
                Chưa có nhật ký nào
              </td>
            </TR>
          ) : (
            filtered.map((log) => (
              <TR key={log.id}>
                <TD className="text-text-secondary text-xs whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatLogTime(log.created_at)}
                  </span>
                </TD>
                <TD>
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-text-muted shrink-0" />
                    <span className="text-sm truncate max-w-[140px]">
                      {getEmployeeName(log.employee)}
                    </span>
                  </span>
                </TD>
                <TD className="font-medium text-text">{log.action}</TD>
                <TD className="text-text-secondary">{log.table_name || "—"}</TD>
                <TD className="text-text-secondary text-xs max-w-[200px] truncate">
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

      {/* ── Load More ── */}
      {hasMore && filtered.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isPending ? "Đang tải..." : "Tải thêm"}
          </Button>
        </div>
      )}
    </div>
  );
}
