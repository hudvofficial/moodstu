import { Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ═══════════════════════════════════════════
// FinancialSummary — Bottom financial summary card
// Phase 04c: V1 "dark luxury theme" adapted for V2
// ═══════════════════════════════════════════

interface Props {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

export default function FinancialSummary({
  subtotal,
  discountAmount,
  totalAmount,
  paidAmount,
  remainingAmount,
}: Props) {
  return (
    <div className="card-base overflow-hidden">
      {/* Dark header */}
      <div className="bg-text-primary px-4 lg:px-6 py-3 lg:py-4 flex items-center gap-2">
        <Calculator size={16} className="text-accent" />
        <h3 className="text-body-sm font-bold text-white">
          Tổng kết tài chính
        </h3>
      </div>

      {/* Financial rows */}
      <div className="px-4 lg:px-6 py-4 space-y-2.5">
        <SummaryRow label="Tạm tính" amount={subtotal} />
        {discountAmount > 0 && (
          <SummaryRow
            label="Giảm giá"
            amount={-discountAmount}
            color="text-red-600"
          />
        )}
        <div className="h-px bg-border my-1" />
        <SummaryRow label="Tổng hợp đồng" amount={totalAmount} bold />
        <SummaryRow label="Đã thanh toán" amount={paidAmount} color="text-emerald-700" />
        <div className="h-px bg-border my-1" />
        <SummaryRow
          label="Còn phải thu"
          amount={remainingAmount}
          color={remainingAmount > 0 ? "text-red-700" : "text-emerald-700"}
          bold
          large
        />
      </div>
    </div>
  );
}

// ─── Helper: Summary row ──────────────────────

function SummaryRow({
  label,
  amount,
  color,
  bold,
  large,
}: {
  label: string;
  amount: number;
  color?: string;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`${bold ? "font-bold text-text-primary" : "text-text-secondary"} ${large ? "text-body-sm" : "text-caption"}`}
      >
        {label}
      </span>
      <span
        className={`${bold ? "font-bold" : "font-medium"} ${large ? "text-h3" : "text-body-sm"} ${color || "text-text-primary"}`}
      >
        {amount < 0 ? `−${formatCurrency(Math.abs(amount))}` : formatCurrency(amount)}
      </span>
    </div>
  );
}
