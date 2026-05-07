"use client";

import { Layers3, Percent, WalletCards } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { Badge } from "@/components/ui/badge";
import { formatReportPercent, getReportRevenueLabel } from "@/lib/report-labels";
import type { ReportRevenueBreakdownItem, ReportSummary } from "@/types/reports";

interface ReportsOverviewPanelsProps {
  revenueBreakdown: ReportRevenueBreakdownItem[];
  summary: ReportSummary;
}

export function ReportsOverviewPanels({ revenueBreakdown, summary }: ReportsOverviewPanelsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RevenueBreakdownCard revenueBreakdown={revenueBreakdown} summary={summary} />
      <CostStructureCard summary={summary} />
    </div>
  );
}

function RevenueBreakdownCard({
  revenueBreakdown,
  summary,
}: ReportsOverviewPanelsProps) {
  return (
    <div className="card-base p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="icon-box bg-primary/10">
            <WalletCards className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-h3">Nguồn doanh thu</h3>
            <p className="text-caption text-text-muted">Tách rõ gói cơ bản và phát sinh trong kỳ.</p>
          </div>
        </div>
        <Badge variant="primary">{summary.totalContracts} HĐ</Badge>
      </div>

      <div className="space-y-3">
        {revenueBreakdown.map((item) => (
          <div key={item.label} className="rounded-xl bg-bg-base px-3 py-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-body-sm font-semibold text-text-primary">{getReportRevenueLabel(item.label)}</span>
              <span className="text-body-sm font-bold text-text-primary">{formatVnd(item.amount)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-caption text-text-muted">
              <span>Tỷ trọng doanh thu</span>
              <span>{formatReportPercent(item.percentage)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Giá trị TB / HĐ" value={formatVnd(summary.avgContractValue)} />
        <Metric label="Khuyến mãi" value={formatVnd(summary.totalDiscount)} />
        <Metric label="Phát sinh" value={formatVnd(summary.addonRevenue)} />
        <Metric label="SL phát sinh" value={String(summary.addonCount)} />
      </div>
    </div>
  );
}

function CostStructureCard({ summary }: { summary: ReportSummary }) {
  const items = [
    { label: "Chi trực tiếp khác", value: Math.max(0, summary.directCost - summary.inventoryCost) },
    { label: "Giá vốn vật tư", value: summary.inventoryCost },
    { label: "Vận hành", value: summary.operatingCost },
    { label: "Lương", value: summary.salaryCost },
    { label: "Cố định", value: summary.fixedCost },
  ];

  return (
    <div className="card-base p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="icon-box bg-warning/10">
            <Layers3 className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="text-h3">Cấu trúc chi phí</h3>
            <p className="text-caption text-text-muted">Tổng hợp các lớp chi phí đang ăn vào biên lợi nhuận.</p>
          </div>
        </div>
        <Badge variant={summary.netProfit >= 0 ? "success" : "error"}>
          <span className="inline-flex items-center gap-1">
            <Percent className="h-3.5 w-3.5" />
            Biên LN {formatReportPercent(summary.profitMargin)}
          </span>
        </Badge>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const share = summary.totalCost > 0 ? Math.round((item.value / summary.totalCost) * 1000) / 10 : 0;

          return (
            <div key={item.label} className="rounded-xl bg-bg-base px-3 py-2">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-body-sm font-semibold text-text-primary">{item.label}</span>
                <span className="text-body-sm font-bold text-text-primary">{formatVnd(item.value)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-caption text-text-muted">
                <span>Tỷ trọng tổng chi</span>
                <span>{formatReportPercent(share)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-primary/5 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-body-sm font-semibold text-text-primary">Tổng chi phí</span>
          <span className="text-body font-bold text-text-primary">{formatVnd(summary.totalCost)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-caption text-text-muted">
          <span>Lợi nhuận ròng</span>
          <span className={summary.netProfit >= 0 ? "text-success font-semibold" : "text-error font-semibold"}>
            {formatVnd(summary.netProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg-base px-3 py-2">
      <p className="text-caption text-text-muted">{label}</p>
      <p className="mt-1 text-body-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
