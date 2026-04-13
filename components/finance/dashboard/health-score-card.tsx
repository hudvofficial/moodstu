import { Activity, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceIntelligenceResult } from "@/types/finance-intelligence";

interface HealthScoreCardProps {
  data: FinanceIntelligenceResult | null;
}

export function HealthScoreCard({ data }: HealthScoreCardProps) {
  if (!data) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "CRITICAL": return { icon: ShieldAlert, color: "text-error", bg: "bg-error/10", label: "Nguy hiểm" };
      case "WARNING": return { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Cần chú ý" };
      case "STABLE": return { icon: Activity, color: "text-info", bg: "bg-info/10", label: "Ổn định" };
      case "EXCELLENT": return { icon: ShieldCheck, color: "text-success", bg: "bg-success/10", label: "Xuất sắc" };
      default: return { icon: Activity, color: "text-text-secondary", bg: "bg-background-secondary", label: "Chưa xác định" };
    }
  };

  const config = getStatusConfig(data.health_status);
  const Icon = config.icon;

  return (
    <div className="stats-card flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className={cn("icon-box", config.bg)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <span className={cn("text-caption font-bold px-2 py-0.5 rounded-full", config.bg, config.color)}>
            {config.label}
          </span>
        </div>
        <p className="text-label mb-2">Điểm Sức Khỏe</p>
        <div className="flex items-baseline gap-2">
          <h2 className="text-h1">{data.health_score}</h2>
          <span className="text-label">/ 100</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-body-sm text-text-secondary line-clamp-2">
          {data.health_message}
        </p>
      </div>
    </div>
  );
}
