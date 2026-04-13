import { Target } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { FinanceIntelligenceResult } from "@/types/finance-intelligence";

interface BreakEvenCardProps {
  data: FinanceIntelligenceResult | null;
}

export function BreakEvenCard({ data }: BreakEvenCardProps) {
  if (!data) return null;
  
  const { percent, target, current, remainingAmount } = data.breakeven;
  const isMet = percent >= 100;
  
  return (
    <div className="stats-card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="icon-box bg-primary/10">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${isMet ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            {isMet ? 'Đạt mục tiêu' : 'Đang tiến hành'}
          </span>
        </div>
        <p className="text-label mb-2">Tiến độ Hòa vốn</p>
        <div className="flex items-baseline gap-2 mb-3">
          <h2 className="text-h1">{percent}%</h2>
        </div>
        
        <div className="w-full bg-border rounded-full h-2 mb-1 overflow-hidden">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <div className="flex justify-between items-center text-body-sm">
          <span className="text-text-secondary">Mục tiêu (tháng)</span>
          <span className="font-medium text-text-primary">{formatVnd(target)}</span>
        </div>
        <div className="flex justify-between items-center text-body-sm">
          <span className="text-text-secondary">{isMet ? 'Vượt chỉ tiêu' : 'Còn thiếu'}</span>
          <span className={`font-medium ${isMet ? 'text-success' : 'text-warning'}`}>
            {formatVnd(isMet ? (current - target) : remainingAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
