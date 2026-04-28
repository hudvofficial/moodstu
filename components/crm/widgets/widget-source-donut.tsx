import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetSourceDonutProps {
  bySource: Record<string, number>;
  total: number;
}

export function WidgetSourceDonut({ bySource, total }: WidgetSourceDonutProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const countedLeads = Object.values(bySource).reduce((sum, count) => sum + count, 0);
  const totalLeads = total || countedLeads;

  const sourceData = Object.entries(bySource)
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

  const visibleData = isExpanded ? sourceData : sourceData.slice(0, 4);

  return (
    <div className="card-base p-5 flex flex-col">
      <h3 className="text-h3 mb-1">Nguồn khách (Source)</h3>
      <p className="text-caption text-text-secondary mb-4">Tỉ trọng phân bổ các kênh</p>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        {totalLeads === 0 ? (
          <div className="text-sm text-text-muted py-8">Chưa có dữ liệu</div>
        ) : (
          <DonutChart 
            data={sourceData} 
            hoveredIndex={hoveredIndex} 
            setHoveredIndex={setHoveredIndex} 
          />
        )}
      </div>

      {/* Legend */}
      {totalLeads > 0 && (
        <div className="mt-5 flex flex-col gap-1.5">
          {visibleData.map((item, idx) => (
            <div 
              key={item.source} 
              className={`flex items-center gap-2.5 p-2 -mx-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                hoveredIndex === idx ? "bg-bg-input" : "hover:bg-bg-input/60"
              }`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div 
                className={`w-2 h-2 rounded-full shrink-0 transition-transform duration-200 ${hoveredIndex === idx ? "scale-125" : ""}`} 
                style={{ backgroundColor: item.color }} 
              />
              <span 
                className={`text-sm truncate flex-1 transition-colors duration-200 ${
                  hoveredIndex === idx ? "text-text-primary font-medium" : "text-text-secondary"
                }`} 
                title={item.source}
              >
                {item.source}
              </span>
              <span className="text-xs text-text-muted w-14 text-right shrink-0">{item.count} khách</span>
              <span 
                className={`text-sm font-semibold w-10 text-right shrink-0 transition-colors duration-200 ${
                  hoveredIndex === idx ? "text-primary" : "text-text-primary"
                }`}
              >
                {item.percent}%
              </span>
            </div>
          ))}

          {/* Show More/Less Button */}
          {sourceData.length > 4 && (
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-center gap-1.5 h-8 mt-1 text-text-muted hover:text-text-primary hover:bg-bg-input/50 transition-colors duration-200"
            >
              {isExpanded ? (
                <>Thu gọn <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Tất cả {sourceData.length} kênh <ChevronDown className="w-4 h-4" /></>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SVG DONUT CHART (Zero Dependencies) ───────────

function DonutChart({ 
  data, 
  hoveredIndex, 
  setHoveredIndex 
}: { 
  data: Array<{ source: string; count: number; percent: number; color: string }>;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
}) {

  const size = 140;
  const strokeWidth = 24;
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
          const isAnyHovered = hoveredIndex !== null;
          const opacity = isAnyHovered ? (isHovered ? 1 : 0.3) : 1;

          return (
            <circle
              key={item.source}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ opacity }}
              className="cursor-pointer transition-opacity duration-300 origin-center"
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
