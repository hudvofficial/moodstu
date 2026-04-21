"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteGoal, updateGoal } from "@/app/actions/goal-budget-actions";
import { fetchGoals, fetchGoalsCashflow, type GoalsCashflowData } from "@/app/actions/finance-operations-queries";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import { GoalCelebrationOverlay } from "@/components/finance/goals/goal-celebration-overlay";
import { GoalDetailDrawer } from "@/components/finance/goals/goal-detail-drawer";
import { GoalsFilters } from "@/components/finance/goals/goals-filters";
import { GoalsStatsBar } from "@/components/finance/goals/goals-stats-bar";
import { GoalsOverview } from "@/components/finance/goals/goals-overview";
import { GoalContributionModal } from "@/components/finance/goals/goal-contribution-modal";
import { GoalFormModal } from "@/components/finance/goals/goal-form-modal";
import { GoalIcon, resolveGoalColor } from "@/components/finance/goals/goal-visual";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/ux-states";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, GoalItem } from "@/types/finance-operations";

interface GoalsClientProps {
  initialData: GoalItem[];
  initialCashflow: GoalsCashflowData | null;
}

const SORT_OPTIONS = [
  { value: "default", label: "Mới nhất" },
  { value: "deadline_asc", label: "Hạn gần nhất" },
  { value: "progress_desc", label: "Tiến độ cao" },
  { value: "remaining_asc", label: "Còn lại ít" },
  { value: "name_asc", label: "Tên A-Z" },
];

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function GoalsClient({ initialData, initialCashflow }: GoalsClientProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<GoalItem | null>(null);
  const [contributing, setContributing] = useState<GoalItem | null>(null);
  const [detailingGoalId, setDetailingGoalId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<25 | 50 | 75 | 100 | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<GoalItem | null>(null);
  const [confirmingStatus, setConfirmingStatus] = useState<{ goal: GoalItem; nextStatus: "cancelled" | "active" } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("default");
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setIsFormOpen(true);
  }, []);
  const handleCloseForm = useCallback(() => {
    setIsFormOpen(false);
    setEditing(null);
  }, []);
  const handleCloseContribution = useCallback(() => setContributing(null), []);
  const handleCloseDetail = useCallback(() => setDetailingGoalId(null), []);
  const handleCloseConfirmDelete = useCallback(() => setConfirmingDelete(null), []);
  const handleCloseConfirmStatus = useCallback(() => setConfirmingStatus(null), []);

  const key = cacheKeys.goals();
  const { data, error, isLoading } = useSWR<GoalItem[]>(
    key,
    async () => {
      const result = await requireData(fetchGoals());
      return result.items;
    },
    { fallbackData: initialData },
  );

  const cashflowKey = cacheKeys.goalsCashflow();
  const { data: cashflowData, error: cashflowError } = useSWR<GoalsCashflowData>(
    cashflowKey,
    () => requireData(fetchGoalsCashflow()),
    { fallbackData: initialCashflow || undefined },
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được mục tiêu.");
    if (cashflowError) toast.error(cashflowError.message || "Không tải được dòng tiền mục tiêu.");
  }, [cashflowError, error]);

  const goals = data || initialData;
  const cashflow = cashflowData || initialCashflow || null;
  const refresh = () => void mutate(key);

  const detailingGoal = useMemo(() => {
    if (!detailingGoalId) return null;
    return goals.find((goal) => goal.id === detailingGoalId) || null;
  }, [detailingGoalId, goals]);

  const counts = useMemo(() => {
    let active = 0;
    let completed = 0;
    let cancelled = 0;

    for (const goal of goals) {
      const s = (goal.status || "").toLowerCase();
      if (s === "completed") completed += 1;
      else if (s === "cancelled" || s === "canceled") cancelled += 1;
      else active += 1;
    }

    return { all: goals.length, active, completed, cancelled };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    const normalized = goals.map((goal) => {
      const time = goal.deadline ? new Date(goal.deadline).getTime() : Number.POSITIVE_INFINITY;
      return {
        goal,
        status: (goal.status || "").toLowerCase(),
        deadlineTime: Number.isFinite(time) ? time : Number.POSITIVE_INFINITY,
      };
    });

    const filtered =
      statusFilter === "completed"
        ? normalized.filter((item) => item.status === "completed")
        : statusFilter === "cancelled"
          ? normalized.filter((item) => item.status === "cancelled" || item.status === "canceled")
        : statusFilter === "active"
          ? normalized.filter((item) => item.status !== "completed" && item.status !== "cancelled" && item.status !== "canceled")
          : normalized;

    if (sort === "default") return filtered.map((item) => item.goal);

    const sorted = filtered.slice();
    sorted.sort((a, b) => {
      if (sort === "deadline_asc") return a.deadlineTime - b.deadlineTime;
      if (sort === "progress_desc") return b.goal.progress_percent - a.goal.progress_percent;
      if (sort === "remaining_asc") return a.goal.remaining - b.goal.remaining;
      if (sort === "name_asc") return a.goal.name.localeCompare(b.goal.name, "vi");
      return 0;
    });

    return sorted.map((item) => item.goal);
  }, [goals, sort, statusFilter]);

  const remove = async (goal: GoalItem) => {
    setBusyId(goal.id);
    const result = await deleteGoal(goal.id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa mục tiêu.");
    if (detailingGoalId === goal.id) setDetailingGoalId(null);
    refresh();
  };

  const toggleStatus = async (goal: GoalItem, nextStatus: "cancelled" | "active") => {
    setBusyId(goal.id);
    const result = await updateGoal(goal.id, { status: nextStatus }, goal.updated_at || undefined);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(nextStatus === "cancelled" ? "Đã hủy mục tiêu." : "Đã khôi phục mục tiêu.");
    refresh();
  };

  const openDetail = useCallback((goal: GoalItem) => setDetailingGoalId(goal.id), []);
  const openEdit = useCallback((goal: GoalItem) => {
    setEditing(goal);
    setIsFormOpen(true);
  }, []);

  return (
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Mục tiêu", href: "/finance/goals" },
        ]}
      />

      {/* ——— Stats + Action (unified container) ——— */}
      <section className="entrance entrance-0 space-y-4">
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <GoalsStatsBar goals={goals} />
          </div>
          <div className="hidden lg:flex shrink-0">
            <Button type="button" onClick={handleOpenCreate} variant="primary" className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Thêm mục tiêu
            </Button>
          </div>
        </div>

        <GoalsOverview goals={goals} cashflow={cashflow} />
      </section>

      {/* ——— Filter row ——— */}
      <section className="entrance entrance-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <GoalsFilters activeStatus={statusFilter} onStatusChange={setStatusFilter} counts={counts} />
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide lg:overflow-visible">
          <SelectPill
            value={sort}
            onChange={setSort}
            placeholder="Sắp xếp"
            options={SORT_OPTIONS}
          />
        </div>
      </section>

      <FAB onClick={handleOpenCreate} label="Thêm mục tiêu" />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 entrance entrance-2">
        {isLoading && goals.length === 0 ? (
          <SkeletonCard className="lg:col-span-2" />
        ) : goals.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Chưa có mục tiêu"
            description="Tạo mục tiêu để theo dõi tiến độ tích lũy và kế hoạch góp theo thời gian."
            actionLabel="Thêm mục tiêu đầu tiên"
            onAction={handleOpenCreate}
            className="lg:col-span-2"
          />
        ) : filteredGoals.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Không có mục tiêu phù hợp"
            description="Thử đổi bộ lọc hoặc sắp xếp để xem lại danh sách mục tiêu."
            actionLabel="Xóa bộ lọc"
            onAction={() => {
              setStatusFilter("all");
              setSort("default");
            }}
            className="lg:col-span-2"
          />
        ) : (
          filteredGoals.map((goal) => {
            const palette = resolveGoalColor(goal.color);

            return (
              <article
                key={goal.id}
                className="card-base p-5 space-y-4 cursor-pointer hover:bg-bg-card/60 transition-colors"
                onClick={() => openDetail(goal)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openDetail(goal);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className={`icon-box ${palette.iconBg}`}>
                      <GoalIcon value={goal.icon} className={`w-5 h-5 ${palette.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-h3 truncate">{goal.name}</h2>
                      <p className="text-caption text-text-muted">Hạn: {formatFinanceDate(goal.deadline)}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      (goal.status || "").toLowerCase() === "completed"
                        ? "success"
                        : ["cancelled", "canceled"].includes((goal.status || "").toLowerCase())
                          ? "error"
                          : "primary"
                    }
                  >
                    {(goal.status || "").toLowerCase() === "completed"
                      ? "Hoàn thành"
                      : ["cancelled", "canceled"].includes((goal.status || "").toLowerCase())
                        ? "Đã hủy"
                        : "Đang góp"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-secondary">Tiến độ</span>
                    <span className="tabular-nums font-bold">{goal.progress_percent}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={goal.status === "completed" ? "progress-fill-success" : "progress-fill-interactive"}
                      style={{ width: `${goal.progress_percent}%` }}
                    />
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
                    Cần góp: {goal.monthly_needed !== null ? formatVnd(goal.monthly_needed) : "-"} / tháng
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="interactive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContributing(goal);
                      }}
                      disabled={["completed", "cancelled", "canceled"].includes((goal.status || "").toLowerCase())}
                    >
                      Góp
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingDelete(goal);
                      }}
                      disabled={busyId === goal.id}
                      className="text-error"
                      aria-label={`Xóa mục tiêu ${goal.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {isFormOpen ? (
        <GoalFormModal
          key={editing?.id || "new"}
          isOpen={isFormOpen}
          goal={editing}
          cashflow={cashflow}
          onClose={handleCloseForm}
          onSaved={refresh}
        />
      ) : null}

      {contributing ? (
        <GoalContributionModal
          key={contributing.id}
          goal={contributing}
          cashflow={cashflow}
          onCelebrate={(milestone) => setCelebration(milestone)}
          onClose={handleCloseContribution}
          onSaved={refresh}
        />
      ) : null}

      <GoalDetailDrawer
        goal={detailingGoal}
        cashflow={cashflow}
        open={Boolean(detailingGoalId)}
        onOpenChange={(open) => {
          if (!open) handleCloseDetail();
        }}
        onEdit={openEdit}
        onContribute={(goal) => setContributing(goal)}
        onCancelToggle={(goal) => {
          const s = (goal.status || "").toLowerCase();
          const nextStatus = s === "cancelled" || s === "canceled" ? "active" : "cancelled";
          setConfirmingStatus({ goal, nextStatus });
        }}
        onDelete={(goal) => setConfirmingDelete(goal)}
      />

      <ConfirmDialog
        isOpen={Boolean(confirmingDelete)}
        onClose={handleCloseConfirmDelete}
        onConfirm={() => {
          if (!confirmingDelete) return;
          void remove(confirmingDelete);
        }}
        title="Xóa mục tiêu"
        message={
          confirmingDelete
            ? `Mục tiêu \"${confirmingDelete.name}\" sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?`
            : "Bạn có chắc chắn muốn xóa mục tiêu này?"
        }
        confirmLabel="Xóa"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={Boolean(confirmingStatus)}
        onClose={handleCloseConfirmStatus}
        onConfirm={() => {
          if (!confirmingStatus) return;
          void toggleStatus(confirmingStatus.goal, confirmingStatus.nextStatus);
        }}
        title={confirmingStatus?.nextStatus === "cancelled" ? "Hủy mục tiêu" : "Khôi phục mục tiêu"}
        message={
          confirmingStatus?.nextStatus === "cancelled"
            ? `Mục tiêu \"${confirmingStatus.goal.name}\" sẽ được chuyển sang trạng thái đã hủy. Bạn có chắc chắn muốn tiếp tục?`
            : `Khôi phục mục tiêu \"${confirmingStatus?.goal.name}\" để tiếp tục theo dõi và góp tiền?`
        }
        confirmLabel={confirmingStatus?.nextStatus === "cancelled" ? "Hủy mục tiêu" : "Khôi phục"}
        variant="warning"
      />

      <GoalCelebrationOverlay milestone={celebration || 25} show={Boolean(celebration)} onDone={() => setCelebration(null)} />
    </div>
  );
}
