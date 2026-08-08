"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Receipt, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOrderPaymentHistory } from "@/app/actions/printing-queries";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PaymentHistoryItem {
  id: string;
  orderId: string;
  paymentId: string | null;
  receiptId: string | null;
  paymentType: "deposit" | "final" | "refund" | "adjustment";
  amount: number;
  paymentDate: string;
  paymentMethod: string; // DB lưu tien_mat/chuyen_khoan sau thống nhất từ vựng
  notes: string | null;
  createdAt: string | null; // order_payments.created_at NULLABLE
}

interface PaymentHistorySectionProps {
  orderId: string;
  isOpen?: boolean;
}

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  deposit: "Đặt cọc",
  final: "Tất toán",
  refund: "Hoàn tiền",
  adjustment: "Điều chỉnh",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  // DB giờ lưu tien_mat/chuyen_khoan (thống nhất từ vựng 08/08); giữ key tiếng Anh
  // phòng dữ liệu cũ nếu có.
  tien_mat: "Tiền mặt",
  chuyen_khoan: "Chuyển khoản",
  cash: "Tiền mặt",
  transfer: "Chuyển khoản",
  card: "Thẻ",
  other: "Khác",
};

export function PaymentHistorySection({
  orderId,
  isOpen: defaultOpen = false,
}: PaymentHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadPaymentHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getOrderPaymentHistory(orderId);
      if (result.success) {
        setPayments(result.data);
      } else {
        setError(result.error || "Không thể tải lịch sử thanh toán");
      }
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isExpanded && payments.length === 0) {
      // loadPaymentHistory triggers an async fetch; the setState inside it is a
      // load trigger, not a synchronous cascading render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPaymentHistory();
    }
  }, [isExpanded, loadPaymentHistory, payments.length]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <Button unstyled
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-bg-hover hover:bg-bg-base transition-colors"
      >
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-text-secondary" />
          <h3 className="font-semibold text-text-main">Lịch sử thanh toán</h3>
          {payments.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {payments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                loadPaymentHistory();
              }}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-secondary" />
          )}
        </div>
      </Button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {isLoading && payments.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">
              Đang tải...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-error text-sm">{error}</div>
          ) : payments.length === 0 ? (
            <div className="p-4 text-center text-text-muted text-sm">
              Chưa có giao dịch thanh toán
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Type & Date */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            payment.paymentType === "deposit" &&
                              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                            payment.paymentType === "final" &&
                              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
                            payment.paymentType === "refund" &&
                              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                            payment.paymentType === "adjustment" &&
                              "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                          )}
                        >
                          {PAYMENT_TYPE_LABELS[payment.paymentType]}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatDate(payment.paymentDate)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">
                          {payment.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: Amount */}
                    <div className="text-right shrink-0">
                      <p
                        className={cn(
                          "font-bold text-base",
                          payment.amount >= 0 ? "text-success" : "text-error"
                        )}
                      >
                        {payment.amount >= 0 ? "+" : ""}
                        {formatCurrency(Math.abs(payment.amount))}
                        <span className="text-xs ml-1">{CURRENCY_SYMBOL}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
