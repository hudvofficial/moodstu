import { Layers3 } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import type { RevenueBreakdownItem } from "@/types/finance-intelligence";

interface RevenueBreakdownCardProps {
  data: RevenueBreakdownItem[];
}

const serviceLabels: Record<string, string> = {
  studio: "Studio",
  ngay_cuoi: "Ngày cưới",
  combo: "Combo",
  baby: "Baby",
  gia_dinh: "Gia đình",
  sinh_nhat: "Sinh nhật",
  bau: "Bầu",
  concept: "Concept",
  couple: "Couple",
  ky_yeu: "Kỷ yếu",
  media: "Media",
  khac: "Khác",
};

function getServiceLabel(value: string) {
  return serviceLabels[value] || value || "Khác";
}

export function RevenueBreakdownCard({ data }: RevenueBreakdownCardProps) {
  const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return (
    <div className="card-base h-full p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-overline text-text-muted">Revenue mix</p>
          <h3 className="text-h3">Cơ cấu doanh thu</h3>
        </div>
        <div className="icon-box bg-info/10">
          <Layers3 className="h-4 w-4 text-info" />
        </div>
      </div>

      {data.length === 0 || total === 0 ? (
        <div className="grid h-48 place-items-center text-body-sm text-text-muted">
          Chưa có hợp đồng trong tháng.
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-caption text-text-muted">Tổng giá trị hợp đồng tháng</p>
            <p className="tabular-nums text-h2">{formatVnd(total)}</p>
          </div>

          <div className="space-y-3">
            {data.map((item) => {
              const pct = Math.min(Math.max(Number(item.percentage || 0), 0), 100);

              return (
                <div key={item.service_type}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-body-sm">
                    <span className="truncate font-medium">{getServiceLabel(item.service_type)}</span>
                    <span className="tabular-nums text-caption text-text-muted">{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="h-full rounded-full bg-info" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-3 text-caption text-text-secondary">
                    <span>{item.count} hợp đồng</span>
                    <span className="tabular-nums">{formatVnd(item.total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
