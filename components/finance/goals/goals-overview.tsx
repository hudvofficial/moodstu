"use client";

import { useMemo } from "react";
import { AlertTriangle, BadgeCheck, BarChart3, Coins, Lightbulb, Wallet } from "lucide-react";
import { formatVnd } from "@/components/finance/finance-format";
import { Badge } from "@/components/ui/badge";
import { GoalsComparison } from "@/components/finance/goals/goals-comparison";
import type { GoalsCashflowData } from "@/app/actions/finance-operations-queries";
import type { GoalItem } from "@/types/finance-operations";

function normalizeStatus(status: string | null | undefined) {
  return (status || "").toLowerCase().trim();
}

function isActiveGoal(goal: GoalItem) {
  const s = normalizeStatus(goal.status);
  return s !== "completed" && s !== "cancelled" && s !== "canceled";
}

function safeDiv(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : numerator / denominator;
}

interface GoalsOverviewProps {
  goals: GoalItem[];
  cashflow: GoalsCashflowData | null;
}

export function GoalsOverview({ goals, cashflow }: GoalsOverviewProps) {
  const activeGoals = useMemo(() => goals.filter(isActiveGoal), [goals]);
  const completedCount = useMemo(() => goals.filter((g) => normalizeStatus(g.status) === "completed").length, [goals]);

  const totalMonthlyNeeded = useMemo(
    () => activeGoals.reduce((sum, goal) => sum + (goal.monthly_needed || 0), 0),
    [activeGoals],
  );

  const totals = useMemo(() => {
    const totalTarget = activeGoals.reduce((sum, goal) => sum + (goal.target_amount || 0), 0);
    const totalSaved = activeGoals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);
    const remaining = activeGoals.reduce((sum, goal) => sum + (goal.remaining || 0), 0);
    const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
    return { totalTarget, totalSaved, remaining, overallProgress };
  }, [activeGoals]);

  const availableForGoals = cashflow?.availableForGoals || 0;
  const gap = availableForGoals - totalMonthlyNeeded;
  const isFeasible = totalMonthlyNeeded === 0 || gap >= 0;

  const recommendedGoalCount = useMemo(() => {
    if (availableForGoals <= 0) return 0;
    if (activeGoals.length === 0) return 0;
    if (totalMonthlyNeeded <= 0) return activeGoals.length;

    const feasibleCount = activeGoals.filter((goal) =>
      goal.monthly_needed !== null && goal.monthly_needed <= availableForGoals
    ).length;
    if (feasibleCount >= activeGoals.length) return activeGoals.length;

    const avgNeeded = safeDiv(totalMonthlyNeeded, activeGoals.length);
    return Math.max(1, Math.floor(availableForGoals / (avgNeeded || 1)));
  }, [activeGoals, availableForGoals, totalMonthlyNeeded]);

  const advisory = useMemo(() => {
    if (totalMonthlyNeeded === 0) {
      return { tone: "neutral" as const, title: "Chưa có deadline", suggestions: [] as string[] };
    }
    if (isFeasible) {
      return {
        tone: "positive" as const,
        title: "Khả thi với dòng tiền hiện tại",
        suggestions: gap > 0 ? [`Dư ${formatVnd(gap)}/tháng sau khi góp`] : [],
      };
    }

    const needMore = Math.abs(gap);
    const suggestions: string[] = [`Tăng dòng tiền thêm +${formatVnd(needMore)}/tháng`];

    if (activeGoals.length > 1 && recommendedGoalCount < activeGoals.length) {
      suggestions.push(`Hoặc tập trung ${recommendedGoalCount} mục tiêu trước`);
    }

    return {
      tone: "warning" as const,
      title: "Chưa đạt với dòng tiền hiện tại",
      suggestions,
    };
  }, [activeGoals.length, gap, isFeasible, recommendedGoalCount, totalMonthlyNeeded]);

  const showAdvisorStrip = activeGoals.length > 1 && availableForGoals > 0 && !isFeasible;

  return (
    <div className="space-y-4">
      {showAdvisorStrip ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3">
          <div className="icon-box bg-warning/10">
            <Lightbulb className="w-5 h-5 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-text-primary">
              Dư {formatVnd(availableForGoals)}/tháng → nên tập trung khoảng {recommendedGoalCount} mục tiêu.
            </p>
            <p className="text-caption text-text-secondary mt-0.5">
              Đang theo đuổi {activeGoals.length} mục tiêu → dòng tiền bị chia nhỏ.
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Cashflow */}
        <div className="stats-card flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-box bg-info/10">
                <Wallet className="w-5 h-5 text-info" />
              </div>
              <Badge variant={cashflow ? (cashflow.netCashflow >= 0 ? "success" : "error") : "neutral"}>
                {cashflow ? `T${cashflow.currentPeriod}` : "Đang tính"}
              </Badge>
            </div>

            <p className="text-label mb-2">Dòng tiền tháng</p>
            <div className="space-y-2 text-body-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Thu</span>
                <span className="font-semibold tabular-nums text-success">
                  +{formatVnd(cashflow?.monthlyIncome || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Chi</span>
                <span className="font-semibold tabular-nums text-error">
                  -{formatVnd(cashflow?.monthlyExpense || 0)}
                </span>
              </div>
              {(cashflow?.salaryComponent || 0) > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Lương</span>
                  <span className="font-semibold tabular-nums text-error">
                    -{formatVnd(cashflow?.salaryComponent || 0)}
                  </span>
                </div>
              ) : null}
              {(cashflow?.fixedCostComponent || 0) > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Chi co dinh</span>
                  <span className="font-semibold tabular-nums text-error">
                    -{formatVnd(cashflow?.fixedCostComponent || 0)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-body-sm">
            <span className="font-semibold text-text-primary">Dư khả dụng</span>
            <span className={`font-bold tabular-nums ${availableForGoals >= 0 ? "text-success" : "text-error"}`}>
              {formatVnd(availableForGoals)}
            </span>
          </div>
        </div>

        {/* Card 2: Overall progress */}
        <div className="stats-card flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-box bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <Badge variant={totals.overallProgress >= 100 ? "success" : "primary"}>
                {totals.overallProgress}%
              </Badge>
            </div>

            <p className="text-label mb-2">Tiến độ tổng</p>
            <p className="text-caption text-text-secondary">
              {activeGoals.length} mục tiêu đang theo đuổi{completedCount > 0 ? ` • ${completedCount} đã đạt` : ""}
            </p>

            <div className="mt-3 space-y-2">
              <div className="progress-track">
                <div
                  className={totals.overallProgress >= 100 ? "progress-fill-success" : "progress-fill-interactive"}
                  style={{ width: `${Math.min(100, totals.overallProgress)}%` }}
                />
              </div>
              <div className="flex justify-between text-caption text-text-muted">
                <span>Đã góp: <span className="font-semibold text-success">{formatVnd(totals.totalSaved)}</span></span>
                <span>Mục tiêu: <span className="font-semibold text-text-secondary">{formatVnd(totals.totalTarget)}</span></span>
              </div>
            </div>
          </div>

          {totalMonthlyNeeded > 0 ? (
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-body-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <Coins className="w-4 h-4 text-interactive" />
                <span>Cam kết góp</span>
              </div>
              <span className="font-bold tabular-nums">{formatVnd(totalMonthlyNeeded)}/tháng</span>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-border text-caption text-text-muted italic">
              Chưa có deadline → chưa tính góp/tháng.
            </div>
          )}
        </div>

        {/* Card 3: Feasibility */}
        <div className="stats-card flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="icon-box bg-warning/10">
                {isFeasible ? (
                  <BadgeCheck className="w-5 h-5 text-success" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-warning" />
                )}
              </div>
              <Badge variant={isFeasible ? "success" : "warning"}>
                {isFeasible ? "Khả thi" : "Cần điều chỉnh"}
              </Badge>
            </div>

            <p className="text-label mb-2">Khả thi</p>
            <p className="text-caption text-text-secondary">{advisory.title}</p>

            <div className="mt-3 space-y-2 text-body-sm">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Cần/tháng</span>
                <span className="font-semibold tabular-nums">{formatVnd(totalMonthlyNeeded)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Dư/tháng</span>
                <span className="font-semibold tabular-nums">{formatVnd(availableForGoals)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Gap</span>
                <span className={`font-bold tabular-nums ${gap >= 0 ? "text-success" : "text-error"}`}>
                  {gap >= 0 ? "+" : ""}{formatVnd(gap)}
                </span>
              </div>
            </div>
          </div>

          {advisory.suggestions.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-border space-y-1.5">
              {advisory.suggestions.map((s) => (
                <p key={s} className="text-caption text-text-secondary">
                  {s}
                </p>
              ))}
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-border text-caption text-text-muted italic">
              {advisory.tone === "neutral" ? "Thêm deadline để hệ thống tính góp/tháng." : " "}
            </div>
          )}
        </div>
      </section>

      <GoalsComparison goals={goals} availableForGoals={availableForGoals} />
    </div>
  );
}
