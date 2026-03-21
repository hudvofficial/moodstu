import { CheckCircle2, Clock, Banknote } from "lucide-react";
import { formatCurrency, formatDate, CURRENCY_SYMBOL } from "@/lib/utils";
import type { Payment } from "@/types/contract";
import { getPaymentMethodLabel } from "@/types/contract-constants";


// ═══════════════════════════════════════════
// Financial Dashboard — Unified finance card
// Stitch SSOT: line 344-382 (stitch_contract_detail.html)
// Structure: h3 → overline → amount → progress → payments → CTA
// ═══════════════════════════════════════════



interface Props {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments?: Payment[];
  onPaymentClick?: () => void;
  subtotal?: number;
  discountAmount?: number;
}

export default function FinancialDashboard({
  totalAmount,
  paidAmount,
  remainingAmount,
  payments = [],
  onPaymentClick,
  subtotal,
  discountAmount = 0,
}: Props) {
  const progress =
    totalAmount > 0
      ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
      : 0;

  // Sort payments by date desc
  const sortedPayments = [...payments].sort(
    (a, b) =>
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  return (
    <div className="card-base p-5 lg:p-6">
      {/* ══════════ MOBILE VARIANT ══════════ Stitch lines 72-101 */}
      <div className="lg:hidden space-y-5">
        {/* Total — centered */}
        <div className="text-center">
          <p className="text-caption font-bold uppercase tracking-widest mb-1">
            Tổng giá trị hợp đồng
          </p>
          <p className="text-amount text-text-primary tracking-tight">
            {formatCurrency(totalAmount)} {CURRENCY_SYMBOL}
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption font-bold uppercase tracking-wider">
              Tiến độ thanh toán
            </span>
            <span className="text-caption font-bold text-interactive">{progress}%</span>
          </div>
          <div className="progress-track h-2">
            <div
              className="progress-fill-interactive"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Grid 2-col: Đã thu + Còn nợ — Stitch: slate-50 bg + inset accent */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-md inset-success">
            <p className="text-tiny font-semibold text-text-muted uppercase tracking-wider mb-1">
              Đã thu
            </p>
            <p className="text-[14px] font-semibold text-emerald-600">
              {formatCurrency(paidAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-md inset-warning">
            <p className="text-tiny font-semibold text-text-muted uppercase tracking-wider mb-1">
              Còn nợ
            </p>
            <p className="text-[14px] font-semibold text-interactive">
              {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
        </div>

        {/* Payment Items — compact list */}
        {sortedPayments.length > 0 && (
          <div className="space-y-3 pt-1">
            {sortedPayments.map((payment, index) => {
              const isRefund = payment.amount < 0;
              return (
                <div key={payment.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isRefund ? (
                      <Clock size={18} className="text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-body-sm font-medium text-text-primary">
                        {payment.notes || payment.payment_stage || `Đợt ${index + 1}`}
                      </p>
                      <p className="text-caption">
                        {formatDate(payment.payment_date)}
                        {payment.payment_method && (
                          <> · {getPaymentMethodLabel(payment.payment_method)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-body-sm font-semibold text-text-primary shrink-0">
                    {formatCurrency(Math.abs(payment.amount))} {CURRENCY_SYMBOL}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA — full width, h-12 */}
        {remainingAmount > 0 && (
          <button
            onClick={onPaymentClick}
            className="btn btn-interactive w-full h-12 text-[15px]"
          >
            <Banknote size={20} />
            Thu tiền
          </button>
        )}
      </div>

      {/* ══════════ DESKTOP OPTIMIZED (Phase 1) ══════════ */}
      <div className="max-lg:hidden space-y-6">
        {/* Header */}
        <h3 className="text-h3">Tài chính</h3>

        {/* Total */}
        <div>
          <p className="text-overline mb-1">Tổng cộng</p>
          <p className="text-amount">{formatCurrency(totalAmount)} {CURRENCY_SYMBOL}</p>
          {discountAmount > 0 && subtotal != null && (
            <p className="text-caption mt-1">
              Tạm tính: {formatCurrency(subtotal)} · Giảm: −{formatCurrency(discountAmount)}
            </p>
          )}
        </div>

        {/* Status Banner */}
        {remainingAmount <= 0 ? (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-md">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-body-sm font-semibold">Đã thanh toán đầy đủ</span>
          </div>
        ) : progress === 0 ? (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-md">
            <Clock size={18} className="shrink-0" />
            <span className="text-body-sm font-semibold">Chưa thanh toán</span>
          </div>
        ) : null}

        {/* Progress — only show when partial payment */}
        {progress > 0 && remainingAmount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-body-sm font-medium text-primary">
                Đã thanh toán: {formatCurrency(paidAmount)} {CURRENCY_SYMBOL}
              </span>
              <span className="text-caption">{progress}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Grid 2-col: Đã thu + Còn nợ — match mobile */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-3 rounded-md inset-success">
            <p className="text-tiny font-semibold text-text-muted uppercase tracking-wider mb-1">
              Đã thu
            </p>
            <p className="text-body font-semibold text-emerald-600">
              {formatCurrency(paidAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-md inset-warning">
            <p className="text-tiny font-semibold text-text-muted uppercase tracking-wider mb-1">
              Còn nợ
            </p>
            <p className="text-body font-semibold text-interactive">
              {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
        </div>

        {/* Payment Items */}
        {sortedPayments.length > 0 && (
          <div className="space-y-4 pt-2" style={{ borderTop: '1px solid var(--color-border)' }}>
            {sortedPayments.map((payment, index) => {
              const isRefund = payment.amount < 0;
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {isRefund ? (
                      <Clock size={20} className="text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2
                        size={20}
                        className="text-emerald-500 shrink-0"
                      />
                    )}
                    <div>
                      <p className="text-body-sm font-medium text-text-primary">
                        {payment.notes ||
                          payment.payment_stage ||
                          `Đợt ${index + 1}`}
                      </p>
                      <p className="text-caption">
                        {formatDate(payment.payment_date)}
                        {payment.payment_method && (
                          <> · {getPaymentMethodLabel(payment.payment_method)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="text-body-sm font-semibold text-text-primary shrink-0">
                    {formatCurrency(Math.abs(payment.amount))} {CURRENCY_SYMBOL}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        {remainingAmount > 0 && (
          <button onClick={onPaymentClick} className="btn-cta">
            Thu tiền
          </button>
        )}

      </div>
    </div>
  );
}
