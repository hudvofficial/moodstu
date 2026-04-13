import { Hourglass } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { FinanceIntelligenceResult } from "@/types/finance-intelligence";

interface CashflowRunwayCardProps {
  data: FinanceIntelligenceResult | null;
}

export function CashflowRunwayCard({ data }: CashflowRunwayCardProps) {
  if (!data) return null;
  const runway = data.cashflow.runwayMonths;
  
  return (
    <div className="stats-card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="icon-box bg-info/10">
            <Hourglass className="w-5 h-5 text-info" />
          </div>
          {data.cashflow.lowCashWarning ? (
            <span className="text-caption font-bold text-error bg-error/10 px-2 py-0.5 rounded-full">
              Báo động
            </span>
          ) : (
            <span className="text-caption font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
              An toàn
            </span>
          )}
        </div>
        <p className="text-label mb-2">Cashflow Runway</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-h1">{runway < 0 ? "0" : runway > 99 ? "∞" : runway}</h2>
          <span className="text-label">tháng</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <div className="flex justify-between items-center text-body-sm">
          <span className="text-text-secondary">Tiền mặt hiện tại</span>
          <span className="font-medium text-text-primary">{formatVnd(data.cashflow.currentCash)}</span>
        </div>
        <div className="flex justify-between items-center text-body-sm">
          <span className="text-text-secondary">Burn Rate (Tháng)</span>
          <span className="font-medium text-error">{formatVnd(data.cashflow.burnRate)}</span>
        </div>
      </div>
    </div>
  );
}
