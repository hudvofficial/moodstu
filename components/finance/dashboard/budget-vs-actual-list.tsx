import { formatVnd } from "@/components/finance/finance-format";
import type { BudgetVsActualItem } from "@/types/finance-intelligence";

interface BudgetVsActualListProps {
  data: BudgetVsActualItem[] | null;
}

export function BudgetVsActualList({ data }: BudgetVsActualListProps) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-text-secondary stats-card">Chưa có dữ liệu ngân sách.</div>;
  }

  const itemsWithBudget = data.filter(d => d.budget > 0 || d.actual > 0).sort((a, b) => b.budget - a.budget);

  return (
    <div className="stats-card h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-h3">Thực tế vs Ngân sách</h3>
      </div>
      
      <div className="space-y-4">
        {itemsWithBudget.map((item, i) => {
          const isOverBudget = item.actual > item.budget;
          const percent = item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 100;
          
          return (
            <div key={i}>
              <div className="flex justify-between items-center mb-1 text-body-sm">
                <span className="font-medium truncate max-w-[50%]">{item.category}</span>
                <div className="flex gap-2">
                  <span className={isOverBudget ? "text-error" : "text-text-primary"}>
                    {formatVnd(item.actual)}
                  </span>
                  <span className="text-text-secondary">/ {formatVnd(item.budget)}</span>
                </div>
              </div>
              <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${isOverBudget ? "bg-error" : "bg-primary"}`} 
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
