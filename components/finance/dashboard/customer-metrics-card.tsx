import { Repeat2, Target, Users } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { CustomerMetrics } from "@/types/finance-intelligence";

interface CustomerMetricsCardProps {
  data: CustomerMetrics;
}

function percent(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

export function CustomerMetricsCard({ data }: CustomerMetricsCardProps) {
  if (!data) return null;

  return (
    <div className="card-base h-full min-w-0 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-text-muted">Customer economics</p>
          <h3 className="text-h3">Hiệu quả khách hàng</h3>
        </div>
        <div className="icon-box bg-primary/10">
          <Users className="h-4 w-4 text-primary" />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="dashboard-surface min-w-0">
          <div className="mb-2 flex items-center gap-2 text-caption text-text-muted">
            <Users className="h-3.5 w-3.5" />
            Tổng khách
          </div>
          <p className="tabular-nums text-h3">{data.totalCustomers}</p>
        </div>

        <div className="dashboard-surface min-w-0">
          <div className="mb-2 flex items-center gap-2 text-caption text-text-muted">
            <Repeat2 className="h-3.5 w-3.5" />
            Tỷ lệ quay lại
          </div>
          <p className="tabular-nums text-h3">{percent(data.repeatCustomerRate)}</p>
        </div>

        <div className="dashboard-surface min-w-0">
          <div className="mb-2 flex items-center gap-2 text-caption text-text-muted">
            <Target className="h-3.5 w-3.5" />
            Conversion
          </div>
          <p className="tabular-nums text-h3">{percent(data.conversionRate)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <p className="text-caption text-text-muted">Giá trị HĐ trung bình</p>
          <p className="tabular-nums text-body font-semibold">{formatVnd(data.avgContractValue)}</p>
        </div>
        <div>
          <p className="text-caption text-text-muted">CLV ước tính</p>
          <p className="tabular-nums text-body font-semibold">{formatVnd(data.estimatedCLV)}</p>
        </div>
        <div>
          <p className="text-caption text-text-muted">Lead đã chốt</p>
          <p className="tabular-nums text-body font-semibold">
            {data.wonLeads}/{data.totalLeads}
          </p>
        </div>
        <div>
          <p className="text-caption text-text-muted">Nguồn dữ liệu</p>
          <p className="text-body-sm font-semibold">CRM + Hợp đồng</p>
        </div>
      </div>
    </div>
  );
}
