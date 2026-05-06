"use client";

import Link from "next/link";
import { ReceiptText } from "lucide-react";
import { formatCurrency, formatDate, CURRENCY_SYMBOL } from "@/lib/utils";
import type { Payment } from "@/types/contract";
import {
  getPaymentMethodLabel,
  getPaymentStageLabel,
} from "@/types/contract-constants";

interface Props {
  payments: Payment[];
}

function receiptHref(paymentId: string) {
  return `/finance/receipts/${paymentId.startsWith("payment:") ? paymentId : `payment:${paymentId}`}`;
}

export default function PaymentReceiptsCard({ payments }: Props) {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime(),
  );

  return (
    <section className="card-base p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
          <ReceiptText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="section-heading text-text-primary">Phiếu thu</h3>
          <p className="text-caption text-text-secondary">
            {sortedPayments.length > 0 ? `${sortedPayments.length} phiếu đã ghi nhận` : "Chưa có phiếu thu"}
          </p>
        </div>
      </div>

      {sortedPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-7 text-text-muted">
          <ReceiptText className="h-6 w-6 opacity-50" />
          <p className="text-overline">Chưa có phiếu thu</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedPayments.slice(0, 4).map((payment) => (
            <Link
              key={payment.id}
              href={receiptHref(payment.id)}
              className="flex items-start justify-between gap-3 rounded-md bg-bg-hover/60 px-4 py-3 transition-colors hover:bg-success/10"
              aria-label={`Xem phiếu thu ${payment.receipt_code || payment.id}`}
            >
              <div className="min-w-0">
                <p className="truncate text-label text-text-primary">
                  {getPaymentStageLabel(payment.payment_stage, payment.notes || "Phiếu thu")}
                </p>
                <p className="mt-1 text-caption text-text-secondary">
                  {formatDate(payment.payment_date)}
                  {payment.payment_method ? ` · ${getPaymentMethodLabel(payment.payment_method)}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-label text-success">
                {formatCurrency(Math.abs(payment.amount))} {CURRENCY_SYMBOL}
              </span>
            </Link>
          ))}
          {sortedPayments.length > 4 && (
            <div className="px-1 pt-1 text-caption text-text-muted">
              +{sortedPayments.length - 4} phiếu khác
            </div>
          )}
        </div>
      )}
    </section>
  );
}
