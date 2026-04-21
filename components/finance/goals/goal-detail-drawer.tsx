"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { fetchGoalContributions } from "@/app/actions/finance-operations-queries";
import { undoContribution } from "@/app/actions/goal-budget-actions";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { GoalContributionInsights, GoalMilestoneBadges, GoalSparkline, MonthlyContributionChart } from "@/components/finance/goals/goal-analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Drawer } from "@/components/ui/drawer";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { PaginatedResult } from "@/types/finance-dashboard";
import type { ActionResult, GoalContributionItem, GoalItem } from "@/types/finance-operations";
import type { GoalsCashflowData } from "@/app/actions/finance-operations-queries";

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function goalStatusLabel(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "Hoàn thành";
  if (s === "cancelled" || s === "canceled") return "Đã hủy";
  return "Đang góp";
}

function goalStatusVariant(status: string | null | undefined) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "success" as const;
  if (s === "cancelled" || s === "canceled") return "error" as const;
  return "primary" as const;
}

function isUndoable(contribution: GoalContributionItem) {
  if (!contribution.created_at) return false;
  const createdAt = new Date(contribution.created_at).getTime();
  if (!Number.isFinite(createdAt)) return false;
  const hours = (Date.now() - createdAt) / 3_600_000;
  return Number.isFinite(hours) && hours >= 0 && hours <= 24;
}

interface GoalDetailDrawerProps {
  goal: GoalItem | null;
  cashflow?: GoalsCashflowData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (goal: GoalItem) => void;
  onContribute?: (goal: GoalItem) => void;
  onCancelToggle?: (goal: GoalItem) => void;
  onDelete?: (goal: GoalItem) => void;
}

export function GoalDetailDrawer({
  goal,
  cashflow = null,
  open,
  onOpenChange,
  onEdit,
  onContribute,
  onCancelToggle,
  onDelete,
}: GoalDetailDrawerProps) {
  const [confirmingUndo, setConfirmingUndo] = useState<GoalContributionItem | null>(null);
  const [nowMs] = useState(() => Date.now());

  const contributionsKey = open && goal?.id ? cacheKeys.goalContributions(goal.id) : null;

  const { data, isLoading, error } = useSWR<PaginatedResult<GoalContributionItem>>(
    contributionsKey,
    async () => {
      if (!goal) throw new Error("Missing goal");
      return requireData(fetchGoalContributions(goal.id, { page: 1, pageSize: 20 }));
    },
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được lịch sử góp.");
  }, [error]);

  const contributions = data?.items || [];
  const tooMany = Boolean(data && data.total > contributions.length);

  const handleUndo = useCallback(async (item: GoalContributionItem) => {
    setConfirmingUndo(item);
  }, []);

  const handleConfirmUndo = async () => {
    if (!confirmingUndo) return;

    const result = await undoContribution(confirmingUndo.id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã hoàn tác khoản góp.");
    await mutate(cacheKeys.goals());
    if (goal?.id) await mutate(cacheKeys.goalContributions(goal.id));
    setConfirmingUndo(null);
  };

  const titleBadge = goal ? (
    <Badge variant={goalStatusVariant(goal.status)}>{goalStatusLabel(goal.status)}</Badge>
  ) : undefined;

  const disabledContribute = useMemo(() => {
    const s = (goal?.status || "").toLowerCase();
    return s === "completed" || s === "cancelled" || s === "canceled";
  }, [goal?.status]);

  const disableCancelToggle = useMemo(() => {
    const s = (goal?.status || "").toLowerCase();
    return s === "completed";
  }, [goal?.status]);

  const health = useMemo(() => {
    if (!goal?.deadline || !goal?.created_at) return null;
    const created = new Date(goal.created_at).getTime();
    const deadline = new Date(goal.deadline).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(deadline) || deadline <= created) return null;
    const elapsed = nowMs - created;
    const expectedProgress = Math.min(100, (elapsed / (deadline - created)) * 100);
    const diff = (goal.progress_percent || 0) - expectedProgress;

    if (diff > 5) return { label: "Vượt tiến độ", tone: "up" as const };
    if (diff < -5) return { label: "Chậm tiến độ", tone: "down" as const };
    return { label: "Đúng tiến độ", tone: "ok" as const };
  }, [goal?.created_at, goal?.deadline, goal?.progress_percent, nowMs]);

  const timeline = (() => {
    if (!goal?.deadline || disabledContribute) return null;
    const available = cashflow?.availableForGoals || 0;
    if (available <= 0) return { planned: goal.deadline, projected: null, delayMonths: null, feasible: false };
    const remaining = goal.remaining || 0;
    const months = Math.ceil(remaining / available);
    const projected = new Date(nowMs);
    projected.setMonth(projected.getMonth() + Math.max(0, months));

    const planned = new Date(goal.deadline);
    const diffMonths = (projected.getFullYear() - planned.getFullYear()) * 12 + projected.getMonth() - planned.getMonth();
    return {
      planned: goal.deadline,
      projected: projected.toISOString().slice(0, 10),
      delayMonths: Math.max(0, diffMonths),
      feasible: diffMonths <= 0,
    };
  })();

  return (
    <>
      <Drawer
        isOpen={open}
        onClose={() => onOpenChange(false)}
        title={goal?.name || "Chi tiết mục tiêu"}
        titleBadge={titleBadge}
        size="lg"
      >
        {!goal ? null : (
          <div className="space-y-6">
            <section className="card-base p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="accent-card accent-card-green">
                  <div className="text-caption text-text-muted">Đã góp</div>
                  <div className="tabular-nums font-bold">{formatVnd(goal.current_amount)}</div>
                </div>
                <div className="accent-card accent-card-gold">
                  <div className="text-caption text-text-muted">Mục tiêu</div>
                  <div className="tabular-nums font-bold">{formatVnd(goal.target_amount)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="accent-card accent-card-gold">
                  <div className="text-caption text-text-muted">Còn lại</div>
                  <div className="tabular-nums font-bold">{formatVnd(goal.remaining)}</div>
                </div>
                <div className="accent-card accent-card-green">
                  <div className="text-caption text-text-muted">Cần góp/tháng</div>
                  <div className="tabular-nums font-bold">
                    {goal.monthly_needed !== null ? formatVnd(goal.monthly_needed) : "-"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <GoalMilestoneBadges progress={goal.progress_percent || 0} />
                {health ? (
                  <Badge
                    variant={health.tone === "up" ? "info" : health.tone === "down" ? "warning" : "success"}
                    className="gap-1"
                  >
                    {health.tone === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : null}
                    {health.tone === "down" ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                    {health.label}
                  </Badge>
                ) : null}
              </div>

              {goal.monthly_needed !== null ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
                  <span className="text-text-muted">
                    Gap:{" "}
                    <span
                      className={`font-semibold tabular-nums ${((cashflow?.availableForGoals || 0) - goal.monthly_needed) >= 0 ? "text-success" : "text-error"}`}
                    >
                      {((cashflow?.availableForGoals || 0) - goal.monthly_needed) >= 0 ? "+" : ""}
                      {formatVnd((cashflow?.availableForGoals || 0) - goal.monthly_needed)}
                    </span>
                  </span>

                  {timeline ? (
                    <span className="text-text-muted">
                      Dự kiến:{" "}
                      <span className="font-semibold text-text-secondary">
                        {timeline.projected ? formatFinanceDate(timeline.projected) : "Chưa khả thi"}
                      </span>
                      {timeline.projected && timeline.delayMonths && timeline.delayMonths > 0 ? (
                        <span className="ml-1 text-warning font-semibold">
                          (+{timeline.delayMonths}th)
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-caption text-text-muted">
                  Hạn: <span className="font-semibold text-text-secondary">{formatFinanceDate(goal.deadline)}</span>
                </div>
                {goal.notes ? (
                  <div className="text-caption text-text-secondary line-clamp-2 max-w-full">{goal.notes}</div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="interactive"
                  onClick={() => onContribute?.(goal)}
                  disabled={disabledContribute}
                >
                  Góp thêm
                </Button>
                <Button type="button" variant="secondary" onClick={() => onEdit?.(goal)}>
                  Sửa
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onCancelToggle?.(goal)}
                  disabled={disableCancelToggle}
                >
                  {goalStatusLabel(goal.status) === "Đã hủy" ? "Khôi phục" : "Hủy"}
                </Button>
                <Button type="button" variant="ghost" className="text-error" onClick={() => onDelete?.(goal)}>
                  Xóa
                </Button>
              </div>
            </section>

            <section className="card-base p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-h3">Phân tích</h3>
                {cashflow ? (
                  <Badge variant="neutral">Dư: {formatVnd(cashflow.availableForGoals)}/th</Badge>
                ) : null}
              </div>

              {isLoading && !data ? (
                <SkeletonTable rows={4} />
              ) : contributions.length === 0 ? (
                <p className="text-caption text-text-muted italic">Chưa có dữ liệu để phân tích.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-caption text-text-muted font-semibold">Lịch sử góp (tích lũy)</p>
                      <GoalSparkline contributions={contributions} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-caption text-text-muted font-semibold">Góp theo tháng (6 tháng gần nhất)</p>
                      <MonthlyContributionChart contributions={contributions} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <GoalContributionInsights contributions={contributions} monthlyNeeded={goal.monthly_needed} />
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-h3">Lịch sử góp</h3>
                <div className="text-caption text-text-muted flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Hoàn tác trong 24h
                </div>
              </div>

              {isLoading && !data ? (
                <div className="card-base p-5">
                  <SkeletonTable rows={4} />
                </div>
              ) : contributions.length === 0 ? (
                <div className="card-base p-5 text-caption text-text-muted italic">
                  Chưa có khoản góp nào.
                </div>
              ) : (
                <div className="card-base divide-y divide-border/50">
                  {contributions.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="font-semibold tabular-nums">{formatVnd(item.amount)}</div>
                        <div className="text-caption text-text-muted">
                          {formatFinanceDate(item.contribution_date || item.created_at)}
                        </div>
                        {item.notes ? (
                          <div className="text-caption text-text-secondary mt-1 line-clamp-2">{item.notes}</div>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-error"
                          disabled={!isUndoable(item)}
                          onClick={() => handleUndo(item)}
                          aria-label={`Hoàn tác khoản góp ${formatVnd(item.amount)}`}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tooMany ? (
                <div className="text-caption text-text-muted">
                  Đang hiển thị {contributions.length}/{data?.total} khoản góp gần nhất.
                </div>
              ) : null}
            </section>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={Boolean(confirmingUndo)}
        onClose={() => setConfirmingUndo(null)}
        onConfirm={() => void handleConfirmUndo()}
        title="Hoàn tác khoản góp"
        message="Khoản góp sẽ bị xóa và số tiền trong mục tiêu sẽ được trừ lại. Bạn có chắc chắn muốn tiếp tục?"
        confirmLabel="Hoàn tác"
        variant="warning"
      />
    </>
  );
}
