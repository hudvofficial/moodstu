"use client";

import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import type { UseContractFinancialsReturn } from "./hooks/useContractFinancials";

// ═══════════════════════════════════════════
// ContractPaymentSection — CREATE mode only
// Payment form: amount, method, stage, notes
// Hidden on edit (V1-proven UX)
// ═══════════════════════════════════════════

const PAYMENT_METHODS = [
  { value: "tien_mat", label: "Tiền mặt" },
  { value: "chuyen_khoan", label: "Chuyển khoản" },
];

const PAYMENT_STAGES = [
  { value: "dat_coc", label: "Đặt cọc" },
  { value: "thanh_toan_dot_1", label: "Thanh toán đợt 1" },
  { value: "thanh_toan_dot_2", label: "Thanh toán đợt 2" },
  { value: "tat_toan", label: "Tất toán" },
];

// Status badge config
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  chua_thanh_toan: { label: "Chưa thanh toán", className: "bg-text-muted/10 text-text-secondary" },
  da_coc: { label: "Đã cọc", className: "bg-warning/10 text-warning" },
  thanh_toan_mot_phan: { label: "Thanh toán một phần", className: "bg-info/10 text-info" },
  da_thanh_toan: { label: "Đã thanh toán", className: "bg-success/10 text-success" },
};

interface Props {
  financials: UseContractFinancialsReturn;
}

export function ContractPaymentSection({ financials }: Props) {
  const {
    paymentForm,
    totalAmount,
    paymentStatus,
    updatePaymentForm,
  } = financials;

  const statusConfig = STATUS_CONFIG[paymentStatus] || STATUS_CONFIG.chua_thanh_toan;

  return (
    <section>
      <div className="card-base p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="form-section-heading">
            5. Thanh toán ban đầu
          </h3>
          <span className={`badge ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Amount + Method row */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <CurrencyInput
              label="Số tiền thanh toán"
              value={paymentForm.amount || 0}
              onChange={(v) => updatePaymentForm("amount", v)}
              suffix={CURRENCY_SYMBOL}
            />
            {totalAmount > 0 && (
              <p className="mt-1 text-caption text-text-muted">
                Tổng: {formatCurrency(totalAmount)} {CURRENCY_SYMBOL}
              </p>
            )}
          </div>

          <div>
            <SimpleSelect
              label="Phương thức"
              value={paymentForm.payment_method}
              onChange={(v) => updatePaymentForm("payment_method", v as "tien_mat" | "chuyen_khoan")}
              options={PAYMENT_METHODS}
            />
          </div>
        </div>

        {/* Stage + Notes row */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <SimpleSelect
              label="Giai đoạn thanh toán"
              value={paymentForm.payment_stage}
              onChange={(v) => updatePaymentForm("payment_stage", v)}
              options={PAYMENT_STAGES}
              placeholder="Chọn giai đoạn..."
            />
          </div>

          <div>
            <label className="label-base">
              Ghi chú thanh toán
            </label>
            <input
              type="text"
              value={paymentForm.notes}
              onChange={(e) => updatePaymentForm("notes", e.target.value)}
              placeholder="Ghi chú..."
              className="input-base"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
