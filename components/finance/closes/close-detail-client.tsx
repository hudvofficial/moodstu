"use client";

import { useEffect, useState } from "react";
import { CheckCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { advanceCloseTask, getCloseDetail } from "@/app/actions/finance-close-actions";
import { formatFinanceDate, financeStatusLabel, financeStatusVariant } from "@/components/finance/finance-format";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, CloseDetailData, CloseTaskItem } from "@/types/finance-operations";

interface CloseDetailClientProps {
  closeId: string;
  initialData: CloseDetailData | null;
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function taskBadge(task: CloseTaskItem) {
  if (task.status === "hoan_thanh") return { className: "badge badge-success", label: "Hoàn thành" };
  if (task.status === "dang_lam") return { className: "badge badge-warning", label: "Đang làm" };
  return { className: "badge badge-neutral", label: "Chưa bắt đầu" };
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
            return (
              <article key={task.id} className={task.status === "hoan_thanh" ? "card-base inset-success p-4" : "card-base p-4"}>
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
                  <div className="flex gap-2">
                    {task.status === "chua_bat_dau" && (
                      <Button type="button" variant="interactive" size="sm" onClick={() => advance(task, "dang_lam")} disabled={busyStep === task.step_number}>
                        <PlayCircle className="w-4 h-4" />
                        Bắt đầu
                      </Button>
                    )}
                    {task.status !== "hoan_thanh" && (
                      <Button type="button" size="sm" onClick={() => advance(task, "hoan_thanh")} disabled={busyStep === task.step_number}>
                        <CheckCircle className="w-4 h-4" />
                        Hoàn thành
                      </Button>
                    )}
                  </div>
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
        </aside>
      </section>
    </>
  );
}
