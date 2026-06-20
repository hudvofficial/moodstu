"use client";

import { formatCurrency, CURRENCY_SYMBOL } from "@/lib/utils";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { UseContractFinancialsReturn } from "./hooks/useContractFinancials";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        {/* Financial rows — right-aligned, all values use whitespace-nowrap + tabular-nums
            để số tiền dài (vd "8.900.000 VND") không bị wrap khi sidebar thu hẹp. */}
        <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-sm text-text-secondary shrink-0">Tạm tính</span>
          <span className="text-body-sm font-medium text-text-primary whitespace-nowrap tabular-nums">
            {formatCurrency(subtotal)} {CURRENCY_SYMBOL}
          </span>
        </div>

        {/* Discount with VND/% toggle */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="text-body-sm text-text-secondary shrink-0">Giảm giá</span>
            {/* Toggle VND / % */}
            <div className="flex overflow-hidden rounded-md bg-neutral-100 p-0.5 shrink-0">
              <Button unstyled
                type="button"
                onClick={() => { setDiscountType("fixed"); updateDiscount(0); }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  discountType === "fixed"
                    ? "bg-interactive text-text-inverse"
                    : "bg-bg-card text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {CURRENCY_SYMBOL}
              </Button>
              <Button unstyled
                type="button"
                onClick={() => { setDiscountType("percent"); updateDiscount(0); }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                  discountType === "percent"
                    ? "bg-interactive text-text-inverse"
                    : "bg-bg-card text-text-secondary hover:bg-bg-hover"
                }`}
              >
                %
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-body-sm text-text-muted">−</span>
            {discountType === "fixed" ? (
              <CurrencyInput
                value={discount}
                onChange={updateDiscount}
                className="w-32 py-1"
              />
            ) : (
              <>
                <Input unstyled
                  type="number"
                  min={0}
                  max={100}
                  value={discount || ""}
                  onChange={(e) => updateDiscount(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="input-base w-24 px-2 py-1 text-right"
                />
                <span className="text-body-sm text-text-muted">%</span>
              </>
            )}
          </div>
        </div>

        {/* Show actual discount amount when using % */}
        {discountType === "percent" && discount > 0 && (
          <div className="mt-1 text-right">
            <span className="text-caption text-text-muted whitespace-nowrap tabular-nums">
              = {formatCurrency(discountAmount)} {CURRENCY_SYMBOL}
            </span>
          </div>
        )}

        {/* Separator */}
        <div className="my-2 h-px bg-border/30" />

        {/* Total — emphasized */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-bold text-text-primary shrink-0">Tổng thanh toán</span>
          <span className="text-amount text-interactive whitespace-nowrap tabular-nums">
            {formatCurrency(totalAmount)} {CURRENCY_SYMBOL}
          </span>
        </div>

        {/* Paid + Remaining (edit mode or after payment) */}
        {(isEditMode || paidAmount > 0) && (
          <div className="mt-3 space-y-2">
            <Row label="Đã thanh toán" value={paidAmount} className="text-success" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-body-sm font-medium text-text-secondary shrink-0">Còn lại</span>
              <span
                className={`text-body-sm font-bold whitespace-nowrap tabular-nums ${
                  remainingAmount <= 0 ? "text-success" : "text-warning"
                }`}
              >
                {formatCurrency(remainingAmount)} {CURRENCY_SYMBOL}
              </span>
            </div>
          </div>
        )}
        </div>{/* close financial rows */}
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
    <div className="flex items-center justify-between gap-2">
      <span className="text-body-sm text-text-secondary shrink-0">{label}</span>
      <span className={`text-body-sm font-medium text-text-primary whitespace-nowrap tabular-nums ${className}`}>
        {formatCurrency(value)} {CURRENCY_SYMBOL}
      </span>
    </div>
  );
}
