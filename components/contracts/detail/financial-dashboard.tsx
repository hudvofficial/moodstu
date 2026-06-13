import { CheckCircle2, Clock, Banknote } from "lucide-react";
import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  onPaymentClick?: () => void;
  subtotal?: number;
  discountAmount?: number;
  estimatedProfit?: number | null;
  hrCost?: number;
  printingCost?: number;
}

export default function FinancialDashboard({
  totalAmount,
  paidAmount,
  remainingAmount,
  onPaymentClick,
  subtotal,
  discountAmount = 0,
  estimatedProfit = null,
  hrCost,
  printingCost,
}: Props) {
  const progress =
    totalAmount > 0
      ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
      : 0;

  return (
    <div className="card-base p-5 lg:p-6">
      <div className="space-y-5 lg:hidden">
        <div className="text-center">
          <p className="mb-1 text-caption font-bold uppercase tracking-widest">
            Tổng giá trị hợp đồng
          </p>
          <p className="text-amount tracking-tight text-text-primary">
            {formatCurrency(totalAmount)} {CURRENCY_SYMBOL}
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
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

        {estimatedProfit != null && (
          <div className="rounded-md bg-bg-hover/50 p-3 space-y-2">
            {hrCost && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-text-secondary">Chi phí nhân sự</span>
                <span className="text-body-sm font-medium text-text-primary">
                  −{formatCurrency(hrCost)} {CURRENCY_SYMBOL}
                </span>
              </div>
            )}
            {printingCost && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-text-secondary">Chi phí in ấn</span>
                <span className="text-body-sm font-medium text-text-primary">
                  −{formatCurrency(printingCost)} {CURRENCY_SYMBOL}
                </span>
              </div>
            )}
            {(hrCost || printingCost) && <div className="border-t border-border border-dashed" />}
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-sm font-semibold text-text-secondary">
                Lợi nhuận ròng
              </span>
              <span className="text-body font-bold text-success">
                {formatCurrency(estimatedProfit)} {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-success/10 p-4 inset-success flex flex-col justify-center text-center">
            <p className="mb-1 text-caption font-bold uppercase tracking-widest text-success/80">
              Đã thu
            </p>
            <p className="text-body font-bold text-success truncate">
              {formatCurrency(paidAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
          <div className="rounded-xl bg-warning/10 p-4 inset-warning flex flex-col justify-center text-center">
            <p className="mb-1 text-caption font-bold uppercase tracking-widest text-interactive/80">
              Còn nợ
            </p>
            <p className="text-body font-bold text-interactive truncate">
              {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
        </div>

        {remainingAmount > 0 && (
          <Button
            unstyled
            type="button"
            onClick={onPaymentClick}
            className="btn btn-interactive h-12 w-full mt-4 text-sm font-bold shadow-md active:translate-y-0.5"
          >
            <Banknote size={20} />
            Thu tiền
          </Button>
        )}
      </div>

      <div className="hidden space-y-6 lg:block">
        <h3 className="text-h3">Tài chính</h3>

        <div>
          <p className="mb-1 text-overline">Tổng cộng</p>
          <p className="text-amount">
            {formatCurrency(totalAmount)} {CURRENCY_SYMBOL}
          </p>
          {discountAmount > 0 && subtotal != null && (
            <p className="mt-1 text-caption">
              Tạm tính: {formatCurrency(subtotal)} · Giảm: −{formatCurrency(discountAmount)}
            </p>
          )}
        </div>

        {remainingAmount <= 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-4 py-2.5 text-success">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-body-sm font-semibold">Đã thanh toán đầy đủ</span>
          </div>
        ) : progress === 0 ? (
          <div className="flex items-center gap-2 rounded-md bg-error/10 px-4 py-2.5 text-error">
            <Clock size={18} className="shrink-0" />
            <span className="text-body-sm font-semibold">Chưa thanh toán</span>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-caption font-semibold text-text-secondary">
              Tiến độ thanh toán
            </span>
            <span className="text-caption font-bold text-text-primary">{progress}%</span>
          </div>
          <div className="progress-track h-2">
            <div
              className={remainingAmount <= 0 ? "progress-fill-interactive bg-success" : "progress-fill"}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {estimatedProfit != null && (
          <div className="rounded-md bg-bg-hover/50 p-3 space-y-2">
            {hrCost && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-text-secondary">Chi phí nhân sự</span>
                <span className="text-body-sm font-medium text-text-primary">
                  −{formatCurrency(hrCost)} {CURRENCY_SYMBOL}
                </span>
              </div>
            )}
            {printingCost && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-body-sm text-text-secondary">Chi phí in ấn</span>
                <span className="text-body-sm font-medium text-text-primary">
                  −{formatCurrency(printingCost)} {CURRENCY_SYMBOL}
                </span>
              </div>
            )}
            {(hrCost || printingCost) && <div className="border-t border-border border-dashed" />}
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-sm font-semibold text-text-secondary">
                Lợi nhuận ròng
              </span>
              <span className="text-body font-bold text-success">
                {formatCurrency(estimatedProfit)} {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-bg-hover p-3 inset-success">
            <p className="mb-1 text-tiny font-semibold uppercase tracking-wider text-text-muted">
              Đã thu
            </p>
            <p className="text-body font-semibold text-success">
              {formatCurrency(paidAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
          <div className="rounded-md bg-bg-hover p-3 inset-warning">
            <p className="mb-1 text-tiny font-semibold uppercase tracking-wider text-text-muted">
              Còn nợ
            </p>
            <p className="text-body font-semibold text-interactive">
              {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
            </p>
          </div>
        </div>

        {remainingAmount > 0 && (
          <Button
            unstyled
            type="button"
            onClick={onPaymentClick}
            className="btn-cta"
          >
            Thu tiền
          </Button>
        )}
      </div>
    </div>
  );
}
