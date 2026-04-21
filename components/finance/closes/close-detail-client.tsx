"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, PlayCircle, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { advanceCloseTask, getCloseDetail } from "@/app/actions/finance-close-actions";
import { formatFinanceDate, formatVnd, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, CloseDetailData, CloseTaskItem } from "@/types/finance-operations";

interface CloseDetailClientProps {
  closeId: string;
  initialData: CloseDetailData | null;
}

type CloseSnapshotMetrics = {
  period?: string | null;
  totalInflow?: number | string | null;
  totalOutflow?: number | string | null;
  paymentRevenue?: number | string | null;
  standaloneReceiptRevenue?: number | string | null;
  operatingOutflow?: number | string | null;
  salaryCost?: number | string | null;
  fixedCost?: number | string | null;
  netCashflow?: number | string | null;
  generatedAt?: string | null;
};

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function normalizeTaskStatus(status: string | null | undefined) {
  return status === "dang_lam" ? "dang_thuc_hien" : status || "chua_bat_dau";
}

function taskBadge(task: CloseTaskItem) {
  const status = normalizeTaskStatus(task.status);
  if (status === "hoan_thanh") return { className: "badge badge-success", label: "Hoàn thành" };
  if (status === "dang_thuc_hien") return { className: "badge badge-warning", label: "Đang thực hiện" };
  if (status === "cho_duyet") return { className: "badge badge-info", label: "Chờ duyệt" };
  if (status === "co_van_de") return { className: "badge badge-error", label: "Có vấn đề" };
  return { className: "badge badge-neutral", label: "Chưa bắt đầu" };
}

function taskAction(task: CloseTaskItem) {
  const status = normalizeTaskStatus(task.status);
  if (status === "chua_bat_dau") return { nextStatus: "dang_thuc_hien", label: "Bắt đầu", Icon: PlayCircle, variant: "interactive" as const };
  if (status === "dang_thuc_hien") return { nextStatus: "cho_duyet", label: "Gửi duyệt", Icon: Send, variant: "outline" as const };
  if (status === "cho_duyet") return { nextStatus: "hoan_thanh", label: "Hoàn thành", Icon: CheckCircle, variant: "primary" as const };
  if (status === "co_van_de") return { nextStatus: "dang_thuc_hien", label: "Làm lại", Icon: RotateCcw, variant: "outline" as const };
  return null;
}

function getSnapshotMetrics(value: unknown): CloseSnapshotMetrics | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as CloseSnapshotMetrics;
  const hasMetric = [
    snapshot.totalInflow,
    snapshot.totalOutflow,
    snapshot.netCashflow,
    snapshot.paymentRevenue,
    snapshot.standaloneReceiptRevenue,
    snapshot.operatingOutflow,
    snapshot.salaryCost,
    snapshot.fixedCost,
  ].some((item) => item !== undefined && item !== null);
  return hasMetric ? snapshot : null;
}

function snapshotNumber(value: number | string | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function CloseDetailClient({ closeId, initialData }: CloseDetailClientProps) {
  const [busyStep, setBusyStep] = useState<number | null>(null);
  const key = cacheKeys.financeCloseDetail(closeId);
  const { data, error, isLoading } = useSWR(key, () => requireData(getCloseDetail(closeId)), { fallbackData: initialData || undefined });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được chi tiết chốt sổ.");
  }, [error]);

  const detail = data || initialData;

  const advance = async (task: CloseTaskItem, nextStatus: string) => {
    setBusyStep(task.step_number);
    const result = await advanceCloseTask(closeId, task.step_number, nextStatus);
    setBusyStep(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã cập nhật bước chốt sổ.");
    void mutate(key);
  };

  if (isLoading && !detail) return <SkeletonCard className="h-80" />;
  if (!detail) return <div className="card-base p-5 text-text-muted">Không tìm thấy kỳ chốt sổ.</div>;

  const snapshot = getSnapshotMetrics(detail.close.snapshot_metrics);
  const netCashflow = snapshotNumber(snapshot?.netCashflow);

  return (
    <>
      <div>
        <h1 className="text-h1">Kỳ chốt {detail.close.period}</h1>
        <p className="text-body-sm text-text-secondary">Theo dõi tiến độ từng bước trước khi khóa sổ.</p>
      </div>

      <section className="detail-grid entrance entrance-1">
        <div className="detail-main space-y-3">
          {detail.tasks.map((task) => {
            const badge = taskBadge(task);
            const action = taskAction(task);
            const status = normalizeTaskStatus(task.status);
            const Icon = action?.Icon;
            return (
              <article key={task.id} className={status === "hoan_thanh" ? "card-base inset-success p-4" : "card-base p-4"}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="tag-badge">Bước {task.step_number}</span>
                      <span className={badge.className}>{badge.label}</span>
                    </div>
                    <h2 className="text-h3 mt-2">{task.step_name}</h2>
                    <p className="text-caption text-text-muted">
                      Bắt đầu: {formatFinanceDate(task.started_at)} · Xong: {formatFinanceDate(task.completed_at)}
                    </p>
                  </div>
                  {action && Icon ? (
                    <div className="flex gap-2">
                      <Button type="button" variant={action.variant} size="sm" onClick={() => advance(task, action.nextStatus)} disabled={busyStep === task.step_number}>
                        <Icon className="w-4 h-4" />
                        {action.label}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <aside className="detail-sidebar">
          <div className="card-base p-5 space-y-3">
            <h2 className="text-h3">Thông tin kỳ</h2>
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Trạng thái</span>
              <span className={`badge badge-${financeStatusVariant(detail.close.status)}`}>
                {financeStatusLabel(detail.close.status)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Tạo bởi</span>
              <span>{detail.close.created_user_name || "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-text-secondary">Khóa lúc</span>
              <span>{formatFinanceDate(detail.close.locked_at)}</span>
            </div>
          </div>

          {snapshot ? (
            <div className="card-base p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-h3">Snapshot SSOT</h2>
                <span className="tag-badge">{snapshot.period || detail.close.period}</span>
              </div>
              <div className="space-y-2 text-body-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-text-secondary">Tổng thu</span>
                  <span className="font-semibold">{formatVnd(snapshotNumber(snapshot.totalInflow))}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-text-secondary">Tổng chi</span>
                  <span className="font-semibold">{formatVnd(snapshotNumber(snapshot.totalOutflow))}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-text-secondary">Lương</span>
                  <span>{formatVnd(snapshotNumber(snapshot.salaryCost))}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-text-secondary">Chi phí cố định</span>
                  <span>{formatVnd(snapshotNumber(snapshot.fixedCost))}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between gap-3">
                  <span className="text-text-secondary">Dòng tiền ròng</span>
                  <span className={`font-semibold ${netCashflow >= 0 ? "text-success" : "text-error"}`}>
                    {formatVnd(netCashflow)}
                  </span>
                </div>
              </div>
              {snapshot.generatedAt ? (
                <p className="text-caption text-text-muted flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Cập nhật: {formatFinanceDate(snapshot.generatedAt)}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </section>
    </>
  );
}
