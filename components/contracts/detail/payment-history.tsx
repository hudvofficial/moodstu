import { Receipt, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Payment } from "@/types/contract";

// ═══════════════════════════════════════════
// PaymentHistory — Payment transaction list
// Phase 04c: Read-only display
// V1 Ref: PaymentPlanBlock.tsx
// ═══════════════════════════════════════════

interface Props {
  payments: Payment[];
}

const METHOD_LABELS: Record<string, string> = {
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Chuyển khoản",
  the: "Thẻ",
  khac: "Khác",
};

export default function PaymentHistory({ payments }: Props) {
  // Sort by payment date desc (newest first)
  const sorted = [...payments].sort(
    (a, b) =>
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  return (
    <div className="card-base p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">
            Lịch sử thanh toán
          </h3>
        </div>
        {sorted.length > 0 && (
          <Badge variant="neutral">{sorted.length} giao dịch</Badge>
        )}
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-2">
          {sorted.map((payment) => {
            const isRefund = payment.amount < 0;
            return (
              <div
                key={payment.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-bg-hover/40"
              >
                {/* Icon */}
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isRefund
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {isRefund ? (
                    <ArrowUpCircle size={16} />
                  ) : (
                    <ArrowDownCircle size={16} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-semibold text-text-primary truncate">
                    {payment.notes || payment.payment_stage || (isRefund ? "Hoàn tiền" : "Thanh toán")}
                  </p>
                  <div className="flex items-center gap-2 text-caption">
                    <span>{formatDate(payment.payment_date)}</span>
                    {payment.payment_method && (
                      <>
                        <span>·</span>
                        <span>
                          {METHOD_LABELS[payment.payment_method] ||
                            payment.payment_method}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <span
                  className={`text-body-sm font-bold shrink-0 ${
                    isRefund ? "text-red-600" : "text-emerald-700"
                  }`}
                >
                  {isRefund ? "−" : "+"}
                  {formatCurrency(payment.amount)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Receipt size={28} className="mx-auto text-text-muted mb-2" />
          <p className="text-body-sm text-text-muted">
            Chưa có giao dịch thanh toán
          </p>
        </div>
      )}
    </div>
  );
}
