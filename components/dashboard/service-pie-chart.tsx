"use client";

import { PieChart as PieChartIcon } from "lucide-react";

const MOCK_DATA = [
  { name: "Cưới", value: 65, color: "var(--color-primary)" },
  { name: "Baby", value: 15, color: "var(--color-secondary)" },
  { name: "Concept", value: 10, color: "var(--color-text-primary)" },
  { name: "Hình thẻ", value: 5, color: "var(--color-text-muted)" },
  { name: "Khác", value: 5, color: "var(--color-bg-hover)" },
];

export function ServicePieChart() {
  const total = MOCK_DATA.reduce((sum, d) => sum + d.value, 0);

  // Build conic-gradient (immutable — no let reassignment)
  const gradientParts = MOCK_DATA.reduce<{ parts: string[]; offset: number }>(
    (acc, item) => {
      const start = acc.offset;
      const end = start + (item.value / total) * 100;
      acc.parts.push(`${item.color} ${start}% ${end}%`);
      return { parts: acc.parts, offset: end };
    },
    { parts: [], offset: 0 }
  ).parts;

  const gradient = `conic-gradient(${gradientParts.join(", ")})`;

  return (
    <div className="card-base h-full p-5 entrance entrance-4">
      <div className="flex items-center gap-2 mb-5">
        <div className="icon-box bg-accent/10">
          <PieChartIcon className="w-4 h-4 text-accent" />
        </div>
        <h3 className="text-h3">Phân bổ dịch vụ</h3>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <div
            className="w-35 h-35 rounded-full"
            style={{ background: gradient }}
          />
          <div className="absolute inset-[30px] rounded-full bg-bg-card flex items-center justify-center">
            <span className="text-h3">{total}%</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 flex-1">
          {MOCK_DATA.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-body-sm flex-1">{item.name}</span>
              <span className="text-label font-bold">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
