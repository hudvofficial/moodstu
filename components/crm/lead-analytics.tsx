"use client";

import React, { useState } from "react";
import type { CrmLead } from "@/types/crm";
import { PIPELINE_STAGES, LEAD_STATUS_MAP } from "@/types/crm";
import { TrendingDown, TrendingUp, Users } from "lucide-react";

interface LeadAnalyticsProps {
  leads: CrmLead[];
}

export default function LeadAnalytics({ leads }: LeadAnalyticsProps) {
  // 1. Calculate Pipeline Funnel data (Cumulative + Snapshot)
  const totalLeads = leads.length;
  // We exclude 'huy' from pipeline stages count, but include them in Total.
  
  const funnelData = PIPELINE_STAGES.map((stage, index) => {
    // Cumulative: all leads currently in this stage or any stage AFTER it
    // Note: If you want strict historical conversion, you'd parse logs. Snapshot is standard for lightweight SaaS.
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

    // Conversion rate from the immediate previous stage
    const conversionRate = prevCumulative > 0 ? (cumulativeCount / prevCumulative) * 100 : 0;
    // Drop-off rate
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

  // 2. Calculate Source data
  const sourceGroups = leads.reduce((acc, lead) => {
    const s = lead.source || "Khác";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourceData = Object.entries(sourceGroups)
    .sort((a, b) => b[1] - a[1]) // highest first
    .map(([source, count], index) => {
      // Dynamic color palette based on standard neutral/brand colors to avoid hardcoded arbitrary hex
      const colors = [
        "var(--color-primary)",
        "var(--color-success)",
        "var(--color-warning)",
        "var(--color-info)",
        "var(--color-error)",
        "var(--color-text-muted)",
      ];
      return {
        source,
        count,
        percent: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0,
        color: colors[index % colors.length],
      };
    });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      {/* ── FUNNEL ANALYTICS (2/3 width) ── */}
      <div className="lg:col-span-2 bg-bg-card rounded-xl p-5 shadow-xs border border-border">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Phễu chuyển đổi (Sales Funnel)</h3>
            <p className="text-xs text-text-secondary mt-1">Đo lường tỉ lệ rụng khách qua từng giai đoạn</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg text-primary text-sm font-medium">
            <Users className="w-4 h-4" />
            <span>Tổng {totalLeads}</span>
          </div>
        </div>

        {/* Funnel Layout */}
        <div className="flex flex-col gap-4">
          {funnelData.map((data, idx) => {
            // Find max count to scale widths relatively
            const maxCount = funnelData[0]?.cumulativeCount || 1;
            const barWidth = Math.max((data.cumulativeCount / maxCount) * 100, 5); // min 5% width for visibility

            return (
              <div key={data.stage} className="relative flex items-center justify-between group">
                
                {/* Left: Label & Bar */}
                <div className="flex-1 right-padding-gap">
                  <div className="flex gap-2 mb-1.5 items-end">
                    <span className="text-xs font-medium text-text-primary w-24 shrink-0">{data.label}</span>
                    <span className="text-xs text-text-muted shrink-0 text-right w-8">{data.cumulativeCount}</span>
                  </div>
                  <div className="h-2 bg-bg-input rounded-full overflow-hidden w-full relative">
                    <div 
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                      style={{ 
                        width: `${barWidth}%`, 
                        backgroundColor: data.color 
                      }}
                    />
                  </div>
                </div>

                {/* Right: Conversion/Warning Badges */}
                <div className="w-[120px] shrink-0 flex items-center justify-end pl-2">
                  {idx > 0 && (
                    <div className="flex flex-col items-end gap-1">
                      {data.dropOffRate >= 50 ? (
                        <div className="flex items-center gap-1 text-tiny bg-error/10 text-error px-1.5 py-0.5 rounded font-medium border border-error/20">
                          <TrendingDown className="w-3 h-3" />
                          <span>-{data.dropOffRate}% (Rụng rát)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-tiny bg-success/10 text-success px-1.5 py-0.5 rounded font-medium">
                          <TrendingUp className="w-3 h-3" />
                          <span>Qua trọt {data.conversionRate}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SOURCE CHART DONUT (1/3 width) ── */}
      <div className="bg-bg-card rounded-xl p-5 shadow-xs border border-border flex flex-col">
        <h3 className="text-sm font-semibold text-text-primary mb-1">Nguồn khách (Source)</h3>
        <p className="text-xs text-text-secondary mb-6">Tỉ trọng phân bổ các kênh</p>

        <div className="flex-1 flex flex-col items-center justify-center relative">
          {totalLeads === 0 ? (
            <div className="text-sm text-text-muted">Chưa có dữ liệu</div>
          ) : (
            <DonutChart data={sourceData} />
          )}
        </div>

        {/* Legend */}
        {totalLeads > 0 && (
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
            {sourceData.map((item) => (
              <div key={item.source} className="flex items-center gap-1.5 w-[calc(50%-8px)]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-tiny text-text-secondary truncate flex-1">{item.source}</span>
                <span className="text-xs font-semibold text-text-primary">{item.percent}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SVG DONUT CHART (Zero Dependencies) ───────────

function DonutChart({ data }: { data: Array<{ source: string; count: number; percent: number; color: string }> }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const size = 160;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pre-compute dash lengths and cumulative offsets (React Compiler safe — no mid-render mutation)
  const segments = data.reduce<Array<{ dash: number; offset: number }>>((acc, item) => {
    const dash = (item.percent / 100) * circumference;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
    acc.push({ dash, offset });
    return acc;
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-bg-input)"
          strokeWidth={strokeWidth}
        />

        {data.map((item, idx) => {
          const { dash, offset } = segments[idx];
          const isHovered = hoveredIndex === idx;
          const currentStrokeWidth = isHovered ? strokeWidth + 6 : strokeWidth;

          return (
            <circle
              key={item.source}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={currentStrokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-300 origin-center"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <title>{`${item.source}: ${item.count} leads (${item.percent}%)`}</title>
            </circle>
          );
        })}
      </svg>
      
      {/* Center Label (Displays default or hovered slice stats) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none fade-in">
        <span className="text-2xl font-bold text-text-primary">
          {hoveredIndex !== null ? data[hoveredIndex].percent + "%" : data.reduce((sum, i) => sum + i.count, 0)}
        </span>
        <span className="text-tiny text-text-secondary uppercase tracking-widest mt-0.5">
          {hoveredIndex !== null ? data[hoveredIndex].source.slice(0,10) : "Tổng"}
        </span>
      </div>
    </div>
  );
}
