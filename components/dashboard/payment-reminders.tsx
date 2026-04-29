import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
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
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
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
        <Link href="/finance" className="link-base min-h-11 shrink-0 text-caption">
          Xem tất cả
        </Link>
      </div>

      {!canView ? (
        <EmptyState message="Vai trò hiện tại không có quyền xem dữ liệu công nợ." />
      ) : reminders.length === 0 ? (
        <EmptyState message="Không có hợp đồng còn công nợ." />
      ) : (
        <div className="space-y-3">
          {reminders.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3",
                "bg-bg-base/60 transition-colors hover:bg-bg-hover",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-warning" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium">{item.customerName}</p>
                <p className="text-caption">
                  {item.stageName || item.contractCode}
                  {formatDate(item.dueDate) ? ` · ${formatDate(item.dueDate)}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-body-sm font-bold text-warning">
                  {formatCurrency(item.remainingAmount)} ₫
                </p>
                {item.isOverdue ? (
                  <p className="text-caption font-semibold text-error">Quá hạn</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
