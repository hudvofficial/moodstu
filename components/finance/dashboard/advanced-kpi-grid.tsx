import type { LucideIcon } from "lucide-react";
import { BarChart3, DollarSign, PackageCheck, ReceiptText, Shirt, Target } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { AdvancedKpis } from "@/types/finance-intelligence";

interface AdvancedKpiGridProps {
  data: AdvancedKpis;
}

type KpiItem = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  className: string;
};

function percent(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

export function AdvancedKpiGrid({ data }: AdvancedKpiGridProps) {
  if (!data) return null;

  const items: KpiItem[] = [
    {
      label: "Conversion",
      value: percent(data.conversionRate),
      hint: `${data.totalLeads} lead`,
      icon: Target,
      className: "bg-success/10 text-success",
    },
    {
      label: "AOV",
      value: formatVnd(data.avgOrderValue),
      hint: "Giá trị HĐ trung bình",
      icon: ReceiptText,
      className: "bg-primary/10 text-primary",
    },
    {
      label: "CAC",
      value: formatVnd(data.cac),
      hint: "Marketing / HĐ tháng",
      icon: DollarSign,
      className: "bg-warning/10 text-warning",
    },
    {
      label: "Vòng quay kho",
      value: Number(data.inventoryTurnover || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 }),
      hint: "Xuất kho / item",
      icon: PackageCheck,
      className: "bg-info/10 text-info",
    },
    {
      label: "Hợp đồng tháng",
      value: data.totalContracts.toLocaleString("vi-VN"),
      hint: "Không tính hợp đồng hủy",
      icon: BarChart3,
      className: "bg-interactive/10 text-interactive",
    },
    {
      label: "Váy & lượt thuê",
      value: `${data.totalDresses}/${data.totalRentals}`,
      hint: "Tổng váy / tổng lượt thuê",
      icon: Shirt,
      className: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="stats-card">
            <div className={`icon-box mb-3 ${item.className}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-caption text-text-muted">{item.label}</p>
            <p className="mt-1 truncate tabular-nums text-h3">{item.value}</p>
            <p className="mt-1 truncate text-caption text-text-secondary">{item.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
