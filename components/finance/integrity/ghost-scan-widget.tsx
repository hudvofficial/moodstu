"use client";

import { useEffect, useState } from "react";
import { Radar, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { fetchIntegrityReports, runManualIntegrityScan } from "@/app/actions/integrity-actions";
import { formatFinanceDate } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, IntegrityReportItem } from "@/types/finance-operations";

interface GhostScanWidgetProps {
  initialData: IntegrityReportItem[];
  variant?: "sidebar" | "button";
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function GhostScanWidget({ initialData, variant = "sidebar" }: GhostScanWidgetProps) {
  const [running, setRunning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const key = cacheKeys.financeIntegrity();
  const { data, error, isLoading } = useSWR(key, () => requireData(fetchIntegrityReports()), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được báo cáo integrity.");
  }, [error]);

  const latest = (data || initialData)[0];

  const runScan = async () => {
    setRunning(true);
    const result = await runManualIntegrityScan();
    setRunning(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã chạy scan dữ liệu.");
    void mutate(key);
  };

  const widgetContent = (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-warning/10">
            <Radar className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h2 className="text-h3">Ghost scan</h2>
            <p className="text-caption text-text-muted">Quét dữ liệu lệch, thiếu liên kết hoặc cảnh báo.</p>
          </div>
        </div>
        <Button type="button" variant="interactive" size="sm" onClick={runScan} disabled={running}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {isLoading && !data ? (
        <SkeletonText lines={3} />
      ) : latest ? (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="accent-card accent-card-orange p-3">
            <div className="text-caption text-text-muted">Tổng lỗi</div>
            <div className="text-h3 tabular-nums">{latest.total_issues || 0}</div>
          </div>
          <div className="accent-card accent-card-gold p-3">
            <div className="text-caption text-text-muted">Cảnh báo</div>
            <div className="text-h3 tabular-nums">{latest.warning_count || 0}</div>
          </div>
          <div className="accent-card accent-card-sky p-3">
            <div className="text-caption text-text-muted">Info</div>
            <div className="text-h3 tabular-nums">{latest.info_count || 0}</div>
          </div>
          <p className="col-span-3 text-caption text-text-muted pt-2">
            Lần quét: {formatFinanceDate(latest.scan_date || latest.created_at)}
          </p>
        </div>
      ) : (
        <p className="text-body-sm text-text-muted pt-2">Chưa có lần scan nào.</p>
      )}
    </div>
  );

  if (variant === "button") {
    const hasWarnings = latest && (latest.total_issues > 0 || latest.warning_count > 0);
    return (
      <>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className={`gap-2 ${hasWarnings ? "border-warning text-warning hover:bg-warning/10 bg-warning/5" : ""}`}
        >
          <Radar className="w-4 h-4" />
          Ghost scan
        </Button>
        <UnifiedModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          size="sm"
        >
          <div className="p-1">
            {widgetContent}
          </div>
        </UnifiedModal>
      </>
    );
  }

  return (
    <aside className="card-base p-5">
      {widgetContent}
    </aside>
  );
}
