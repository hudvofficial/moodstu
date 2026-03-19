import { Activity, Clock } from "lucide-react";
import type { AuditLogEntry } from "@/types/contract";

// ═══════════════════════════════════════════
// ActivityLog — Hoạt động gần đây
// Phase 04e: audit_logs WHERE table_name='contracts'
// ═══════════════════════════════════════════

const ACTION_MAP: Record<string, string> = {
  INSERT: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xóa",
  PAYMENT: "Thanh toán",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

interface Props {
  logs: AuditLogEntry[];
}

export default function ActivityLog({ logs }: Props) {
  return (
    <div className="card-base p-4 lg:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Activity size={16} className="text-primary" />
        <h3 className="text-body-sm font-bold text-text-primary">
          Hoạt động gần đây
        </h3>
      </div>

      {/* Content */}
      {logs.length === 0 ? (
        <div className="py-6 text-center">
          <Activity size={28} className="text-text-muted/40 mx-auto mb-2" />
          <p className="text-caption text-text-muted">
            Chưa có hoạt động
          </p>
        </div>
      ) : (
        <div className="space-y-0">
          {logs.map((log, i) => (
            <div
              key={log.id}
              className="flex gap-3 py-2.5 relative"
            >
              {/* Timeline line */}
              {i < logs.length - 1 && (
                <div className="absolute left-[9px] top-9 bottom-0 w-px bg-border/40" />
              )}

              {/* Dot */}
              <div className="w-[18px] h-[18px] rounded-full bg-bg-hover flex items-center justify-center shrink-0 mt-0.5 z-10">
                <div className="w-2 h-2 rounded-full bg-primary" />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-body-sm text-text-primary">
                  <span className="font-semibold">
                    {log.employees?.full_name || "Hệ thống"}
                  </span>
                  {" "}
                  <span className="text-text-secondary">
                    {ACTION_MAP[log.action] || log.action}
                  </span>
                </p>
                <span className="flex items-center gap-1 text-caption text-text-muted">
                  <Clock size={10} />
                  {timeAgo(log.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
