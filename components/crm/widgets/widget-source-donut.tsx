import React, { useState } from "react";
import type { CrmLead } from "@/types/crm";

interface WidgetSourceDonutProps {
  leads: CrmLead[];
}

export function WidgetSourceDonut({ leads }: WidgetSourceDonutProps) {
  const totalLeads = leads.length;

  // 1. Calculate Source data
  const sourceGroups = leads.reduce((acc, lead) => {
    const s = lead.source || "Khác";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourceData = Object.entries(sourceGroups)
    .sort((a, b) => b[1] - a[1]) // highest first
    .map(([source, count], index) => {
      // Dynamic color palette based on standard neutral/brand colors
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
    <div className="card-base p-5 flex flex-col">
      <h3 className="text-h3 mb-1">Nguồn khách (Source)</h3>
      <p className="text-caption text-text-secondary mb-6">Tỉ trọng phân bổ các kênh</p>

      <div className="flex-1 flex flex-col items-center justify-center relative py-2">
        {totalLeads === 0 ? (
          <div className="text-sm text-text-muted py-8">Chưa có dữ liệu</div>
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
              <span className="text-tiny text-text-secondary truncate flex-1" title={item.source}>{item.source}</span>
              <span className="text-xs font-semibold text-text-primary">{item.percent}%</span>
            </div>
          ))}
        </div>
      )}
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

  // Pre-compute dash lengths and cumulative offsets
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
              <title>{`${item.source}: ${item.count} khách (${item.percent}%)`}</title>
            </circle>
          );
        })}
      </svg>
      
      {/* Center Label (Displays default or hovered slice stats) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none fade-in">
        <span className="text-2xl font-bold text-text-primary">
          {hoveredIndex !== null ? data[hoveredIndex].percent + "%" : data.reduce((sum, i) => sum + i.count, 0)}
        </span>
        <span className="text-tiny text-text-secondary uppercase tracking-widest mt-0.5 max-w-[80px] text-center truncate">
          {hoveredIndex !== null ? data[hoveredIndex].source.slice(0,10) : "Tổng"}
        </span>
      </div>
    </div>
  );
}
