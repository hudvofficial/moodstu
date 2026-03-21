"use client";

import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { UseContractFinancialsReturn } from "./hooks/useContractFinancials";

// ═══════════════════════════════════════════
// ContractFinancialSummary — Always-visible totals card
// All calcs from useContractFinancials hook (NOT here)
// ═══════════════════════════════════════════

interface Props {
  financials: UseContractFinancialsReturn;
  isEditMode: boolean;
}

export function ContractFinancialSummary({ financials, isEditMode }: Props) {
  const {
    discount,
    discountType,
    discountAmount,
    totalAmount,
    paidAmount,
    remainingAmount,
    updateDiscount,
    setDiscountType,
  } = financials;

  // Subtotal comes from items hook, passed through financials
  const subtotal = totalAmount + discountAmount; // reverse calc for display

  return (
    <section>
      <div className="card-base p-6 space-y-4">
        <h3 className="form-section-heading">
          4. Tổng kết tài chính
        </h3>
        {/* Financial rows — right-aligned per Stitch */}
        <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-text-secondary">Tạm tính</span>
          <span className="text-body-sm font-medium text-text-primary">
            {formatCurrency(subtotal)} {CURRENCY_SYMBOL}
          </span>
        </div>

        {/* Discount with VNĐ/% toggle */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-text-secondary">Giảm giá</span>
            {/* Toggle VNĐ / % */}
            <div className="flex overflow-hidden rounded-md bg-neutral-100 p-0.5">
              <button
                type="button"
                onClick={() => { setDiscountType("fixed"); updateDiscount(0); }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  discountType === "fixed"
                    ? "bg-interactive text-text-inverse"
                    : "bg-bg-card text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {CURRENCY_SYMBOL}
              </button>
              <button
                type="button"
                onClick={() => { setDiscountType("percent"); updateDiscount(0); }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  discountType === "percent"
                    ? "bg-interactive text-text-inverse"
                    : "bg-bg-card text-text-secondary hover:bg-bg-hover"
                }`}
              >
                %
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-body-sm text-text-muted">−</span>
            {discountType === "fixed" ? (
              <CurrencyInput
                value={discount}
                onChange={updateDiscount}
                className="w-40 py-1"
              />
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discount || ""}
                  onChange={(e) => updateDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base w-32 px-2 py-1 text-right"
                />
                <span className="text-body-sm text-text-muted">%</span>
              </>
            )}
          </div>
        </div>

        {/* Show actual discount amount when using % */}
        {discountType === "percent" && discount > 0 && (
          <div className="mt-1 text-right">
            <span className="text-caption text-text-muted">
              = {formatCurrency(discountAmount)} {CURRENCY_SYMBOL}
            </span>
          </div>
        )}

        {/* Separator */}
        <div className="my-2 h-px bg-border/30" />

        {/* Total — emphasized */}
        <div className="flex items-center justify-between">
          <span className="text-body font-bold text-text-primary">Tổng thanh toán</span>
          <span className="text-amount text-interactive">
            {formatCurrency(totalAmount)} {CURRENCY_SYMBOL}
          </span>
        </div>

        {/* Paid + Remaining (edit mode or after payment) */}
        {(isEditMode || paidAmount > 0) && (
          <div className="mt-3 space-y-2">
            <Row label="Đã thanh toán" value={paidAmount} className="text-success" />
            <div className="flex items-center justify-between">
              <span className="text-body-sm font-medium text-text-secondary">Còn lại</span>
              <span
                className={`text-body-sm font-bold ${
                  remainingAmount <= 0 ? "text-success" : "text-warning"
                }`}
              >
                {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>
        )}
        </div>{/* close max-w-sm */}
      </div>
    </section>
  );
}

// ── Row helper ──
function Row({
  label,
  value,
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <span className={`text-body-sm font-medium text-text-primary ${className}`}>
        {formatCurrency(value)} {CURRENCY_SYMBOL}
      </span>
    </div>
  );
}
