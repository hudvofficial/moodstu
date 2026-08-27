import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { cn, formatVnd, safeFormatDate } from "@/lib/utils";
import type { PaymentReminderData } from "@/types/dashboard";

interface PaymentRemindersProps {
  reminders: PaymentReminderData[];
  canView: boolean;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-38 items-center justify-center rounded-lg border border-dashed border-border bg-bg-base/50 px-4 text-center text-body-sm text-text-secondary">
      {message}
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const formatted = safeFormatDate(dateStr, "dd/MM");
  return formatted === "-" ? null : formatted;
}

function formatMilestone(item: { stageName: string | null; dueDate: string | null }) {
  const date = formatDate(item.dueDate);
  if (!date) return item.stageName || "Đợt thu";
  return `${item.stageName || "Đợt thu"} · ${date}`;
}

export function PaymentReminders({ reminders, canView }: PaymentRemindersProps) {
  return (
    <div className="card-base p-5 entrance entrance-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="icon-box bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
          </div>
          <h3 className="text-h3">Cần thu tiền</h3>
        </div>
        <Link href="/finance" className="link-base flex items-center justify-center min-h-[44px] min-w-[80px] shrink-0 text-body-sm font-medium">
          Xem tất cả
        </Link>
      </div>

      {!canView ? (
        <EmptyState message="Vai trò hiện tại không có quyền xem dữ liệu công nợ." />
      ) : reminders.length === 0 ? (
        <EmptyState message="Không có hợp đồng còn công nợ." />
      ) : (
        <div className="space-y-3">
          {reminders.map((item) => {
            const milestones = item.milestones?.length
              ? item.milestones
              : [
                  {
                    id: item.id,
                    stageName: item.stageName,
                    amount: item.remainingAmount,
                    dueDate: item.dueDate,
                    source: item.source,
                    isOverdue: item.isOverdue,
                  },
                ];
            // M4: mỗi HĐ một dòng (đến hạn = đã giao sản phẩm) — không còn nhiều đợt/HĐ
            const visibleMilestones = milestones.slice(0, 2);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg p-3",
                  "bg-bg-base/60 transition-colors hover:bg-bg-hover",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                <div className={cn("h-2 w-2 shrink-0 rounded-full", item.isOverdue ? "bg-error" : "bg-warning")} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm font-medium">{item.customerName}</p>
                  <p className="truncate text-caption">
                    {`${item.contractCode} · ${visibleMilestones.map(formatMilestone).join(", ")}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-body-sm font-bold text-warning">
                    {formatVnd(item.remainingAmount)}
                  </p>
                  {item.isOverdue ? (
                    <p className="text-caption font-semibold text-error">Đã giao chưa thu</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
