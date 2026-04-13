"use client";

import { useEffect, useState, useCallback } from "react";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGoal } from "@/app/actions/goal-budget-actions";
import { fetchGoals } from "@/app/actions/finance-operations-queries";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { GoalContributionModal } from "@/components/finance/goals/goal-contribution-modal";
import { GoalFormModal } from "@/components/finance/goals/goal-form-modal";
import { Button } from "@/components/ui/button";
import { SkeletonCard } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, GoalItem } from "@/types/finance-operations";

interface GoalsClientProps {
  initialData: GoalItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function GoalsClient({ initialData }: GoalsClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [contributing, setContributing] = useState<GoalItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleOpenCreate = useCallback(() => setIsFormOpen(true), []);
  const handleCloseForm = useCallback(() => setIsFormOpen(false), []);
  const handleCloseContribution = useCallback(() => setContributing(null), []);

  const key = cacheKeys.goals();
  const { data, error, isLoading } = useSWR(key, async () => { const r = await requireData(fetchGoals()); return r.items; }, { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được mục tiêu.");
  }, [error]);

  const goals = data || initialData;
  const refresh = () => void mutate(key);

  const remove = async (goal: GoalItem) => {
    if (!window.confirm(`Xóa mục tiêu ${goal.name}?`)) return;
    setBusyId(goal.id);
    const result = await deleteGoal(goal.id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa mục tiêu.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-success/10">
            <PiggyBank className="w-4 h-4 text-success" />
          </div>
          <div>
            <h1 className="text-h1">Mục tiêu tài chính</h1>
            <p className="text-body-sm text-text-secondary">Theo dõi tiến độ tích lũy và khoản cần góp mỗi tháng.</p>
          </div>
        </div>
        <Button type="button" onClick={handleOpenCreate} className="btn-cta gap-2">
          <Plus className="w-4 h-4" />
          Thêm mục tiêu
        </Button>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 entrance entrance-1">
        {isLoading && !data ? (
          <SkeletonCard />
        ) : goals.length === 0 ? (
          <div className="card-base p-5 text-center text-text-muted">Chưa có mục tiêu tài chính.</div>
        ) : (
          goals.map((goal) => (
            <article key={goal.id} className="card-interactive p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-h3">{goal.name}</h2>
                  <p className="text-caption text-text-muted">Hạn: {formatFinanceDate(goal.deadline)}</p>
                </div>
                <span className={goal.status === "completed" ? "badge badge-success" : "badge badge-primary"}>
                  {goal.status === "completed" ? "Hoàn thành" : "Đang góp"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-text-secondary">Tiến độ</span>
                  <span className="tabular-nums font-bold">{goal.progress_percent}%</span>
                </div>
                <div className="h-2 rounded-md bg-border overflow-hidden">
                  <div className="h-full bg-success" style={{ width: `${goal.progress_percent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="accent-card accent-card-green">
                  <div className="text-caption text-text-muted">Đã góp</div>
                  <div className="tabular-nums font-bold">{formatVnd(goal.current_amount)}</div>
                </div>
                <div className="accent-card accent-card-gold">
                  <div className="text-caption text-text-muted">Còn lại</div>
                  <div className="tabular-nums font-bold">{formatVnd(goal.remaining)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-caption text-text-muted">
                  Cần góp: {goal.monthly_needed ? formatVnd(goal.monthly_needed) : "-"} / tháng
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="interactive" size="sm" onClick={() => setContributing(goal)}>
                    Góp
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(goal)} disabled={busyId === goal.id} className="text-error">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <GoalFormModal isOpen={isFormOpen} onClose={handleCloseForm} onSaved={refresh} />
      <GoalContributionModal goal={contributing} onClose={handleCloseContribution} onSaved={refresh} />
    </>
  );
}
