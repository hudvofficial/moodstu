import React from "react";
import type { CrmLead } from "@/types/crm";
import { PIPELINE_STAGES, LEAD_STATUS_MAP } from "@/types/crm";
import { TrendingDown, TrendingUp, Users } from "lucide-react";

interface WidgetSalesFunnelProps {
  leads: CrmLead[];
}

export function WidgetSalesFunnel({ leads }: WidgetSalesFunnelProps) {
  const totalLeads = leads.length;
  
  const funnelData = PIPELINE_STAGES.map((stage, index) => {
    const snapshotCount = leads.filter((l) => l.status === stage).length;
    let cumulativeCount = 0;
    for (let j = index; j < PIPELINE_STAGES.length; j++) {
      cumulativeCount += leads.filter((l) => l.status === PIPELINE_STAGES[j]).length;
    }

    const prevCumulative =
      index === 0 ? cumulativeCount : (() => {
        let prevSum = 0;
        for (let j = index - 1; j < PIPELINE_STAGES.length; j++) {
          prevSum += leads.filter((l) => l.status === PIPELINE_STAGES[j]).length;
        }
        return prevSum;
      })();

    const conversionRate = prevCumulative > 0 ? (cumulativeCount / prevCumulative) * 100 : 0;
    const dropOffRate = 100 - conversionRate;

    return {
      stage,
      label: LEAD_STATUS_MAP[stage].label,
      color: LEAD_STATUS_MAP[stage].color || "var(--color-primary)",
      snapshotCount,
      cumulativeCount,
      conversionRate: Math.round(conversionRate),
      dropOffRate: Math.round(dropOffRate),
    };
  });

  return (
    <div className="card-base p-5 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-h3 mb-1">Phễu chuyển đổi (Funnel)</h3>
          <p className="text-caption text-text-secondary">Tỉ lệ rụng khách qua từng giai đoạn</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-lg text-primary text-sm font-medium">
          <Users className="w-3.5 h-3.5" />
          <span>{totalLeads}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {funnelData.map((data, idx) => {
          const maxCount = funnelData[0]?.cumulativeCount || 1;
          const barWidth = Math.max((data.cumulativeCount / maxCount) * 100, 5);

          return (
            <div key={data.stage} className="relative flex flex-col gap-1 group">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-text-primary">{data.label}</span>
                {idx > 0 && (
                  <span className="text-caption">
                    {data.dropOffRate >= 50 ? (
                      <span className="text-error flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> -{data.dropOffRate}%
                      </span>
                    ) : (
                      <span className="text-success flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {data.conversionRate}%
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 bg-bg-input rounded-full overflow-hidden flex-1 relative">
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${barWidth}%`, backgroundColor: data.color }}
                  />
                </div>
                <span className="text-xs text-text-muted shrink-0 text-right w-6 font-medium">{data.cumulativeCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}