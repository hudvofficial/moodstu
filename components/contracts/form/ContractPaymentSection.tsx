"use client";

import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Input } from "@/components/ui/input";
import type { UseContractFinancialsReturn } from "./hooks/useContractFinancials";
import {
  PAYMENT_METHOD_MAP,
  PAYMENT_STATUS_MAP,
} from "@/types/contract-constants";

// ═══════════════════════════════════════════
// ContractPaymentSection — CREATE mode only
// Payment form: amount, method, stage, notes
// Hidden on edit (V1-proven UX)
// ═══════════════════════════════════════════

// ─── Options from SSOT ────────────────────────
const PAYMENT_METHODS = Object.entries(PAYMENT_METHOD_MAP).map(([value, label]) => ({ value, label }));
// Status badge config — labels from SSOT, styling local
const STATUS_STYLES: Record<string, string> = {
  chua_thanh_toan: "bg-text-muted/10 text-text-secondary",
  da_coc: "bg-warning/10 text-warning",
  thanh_toan_mot_phan: "bg-info/10 text-info",
  da_thanh_toan: "bg-success/10 text-success",
};

interface Props {
  financials: UseContractFinancialsReturn;
}

export function ContractPaymentSection({ financials }: Props) {
  const {
    paymentForm,
    totalAmount,
    hasInitialPayment,
    initialPaymentRemainingAmount,
    initialPaymentStatus,
    updatePaymentForm,
  } = financials;

  const statusLabel = PAYMENT_STATUS_MAP[initialPaymentStatus] || initialPaymentStatus;
  const statusStyle = STATUS_STYLES[initialPaymentStatus] || STATUS_STYLES.chua_thanh_toan;

  const handleAmountChange = (value: number) => {
    const amount = totalAmount > 0 ? Math.min(Math.max(0, value), totalAmount) : 0;
    updatePaymentForm("amount", amount);
    if (amount <= 0 && paymentForm.notes) {
      updatePaymentForm("notes", "");
    }
  };

  return (
    <section>
      <div className="card-base p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="form-section-heading">
            5. Thanh toán ban đầu
          </h3>
          <span className={`badge ${statusStyle}`}>
            {statusLabel.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <CurrencyInput
              label="Số tiền thanh toán ban đầu"
              value={paymentForm.amount || 0}
              onChange={handleAmountChange}
              suffix={CURRENCY_SYMBOL}
              emptyWhenZero
              placeholder="0"
            />
            {!hasInitialPayment && (
              <p className="mt-1 text-caption text-text-muted">
                Bỏ trống nếu chưa phát sinh thanh toán.
              </p>
            )}
            {totalAmount > 0 && (
              <p className="mt-1 text-caption text-text-muted">
                Tổng: {formatCurrency(totalAmount)} {CURRENCY_SYMBOL}
              </p>
            )}
          </div>

          {hasInitialPayment && (
            <>
              <div className="rounded-md bg-bg-base px-3 py-2 text-caption text-text-secondary">
                Đã ghi nhận {formatCurrency(paymentForm.amount)} {CURRENCY_SYMBOL}
                {initialPaymentRemainingAmount > 0
                  ? `, còn lại ${formatCurrency(initialPaymentRemainingAmount)} ${CURRENCY_SYMBOL}`
                  : ", hợp đồng đã thanh toán đủ"}
              </div>

              <div>
                <SimpleSelect
                  label="Phương thức"
                  value={paymentForm.payment_method}
                  onChange={(v) => updatePaymentForm("payment_method", v as "tien_mat" | "chuyen_khoan")}
                  options={PAYMENT_METHODS}
                />
              </div>

              <div>
                <label className="label-base">
                  Ghi chú thanh toán
                </label>
                <Input unstyled
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => updatePaymentForm("notes", e.target.value)}
                  placeholder="Ghi chú..."
                  className="input-base"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
