"use client";

import { Scale } from "lucide-react";
import { formatFinanceDate, formatVnd } from "@/components/finance/finance-format";
import type { GoalItem } from "@/types/finance-operations";

function normalizeStatus(status: string | null | undefined) {
  return (status || "").toLowerCase().trim();
}

function isActiveGoal(goal: GoalItem) {
  const s = normalizeStatus(goal.status);
  return s !== "completed" && s !== "cancelled" && s !== "canceled";
}

interface GoalsComparisonProps {
  goals: GoalItem[];
  availableForGoals: number;
}

export function GoalsComparison({ goals, availableForGoals }: GoalsComparisonProps) {
  const activeGoals = goals.filter(isActiveGoal);
  if (activeGoals.length < 2) return null;

  return (
    <div className="card-base overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="icon-box bg-info/10">
          <Scale className="w-5 h-5 text-info" />
        </div>
        <div>
          <h3 className="text-h3 font-semibold text-text-primary">So sánh mục tiêu</h3>
          <p className="text-caption text-text-secondary">Nhìn nhanh mức góp/tháng và gap so với dòng tiền hiện tại.</p>
        </div>
      </div>

      {/* Mobile: stacked items */}
      <div className="lg:hidden divide-y divide-border/50">
        {activeGoals.map((goal) => {
          const perGoalGap = goal.monthly_needed !== null ? availableForGoals - goal.monthly_needed : null;
          return (
            <div key={goal.id} className="px-5 py-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary truncate">{goal.name}</div>
                  <div className="text-caption text-text-muted">Hạn: {formatFinanceDate(goal.deadline)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold tabular-nums">{goal.progress_percent}%</div>
                  <div className="text-caption text-text-muted">{goal.monthly_needed !== null ? `${formatVnd(goal.monthly_needed)}/th` : "—"}</div>
                </div>
              </div>

              <div className="progress-track">
                <div className="progress-fill-interactive" style={{ width: `${Math.min(100, goal.progress_percent)}%` }} />
              </div>

              {perGoalGap !== null ? (
                <div className={`text-caption font-semibold ${perGoalGap >= 0 ? "text-success" : "text-error"}`}>
                  Gap: {perGoalGap >= 0 ? "+" : ""}{formatVnd(perGoalGap)}
                </div>
              ) : (
                <div className="text-caption text-text-muted">Chưa có deadline → chưa tính góp/tháng.</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-sidebar/40 text-text-muted font-semibold">
              <th className="text-left px-5 py-2.5">Mục tiêu</th>
              <th className="text-center px-2 py-2.5">Tiến độ</th>
              <th className="text-right px-2 py-2.5">Cần/tháng</th>
              <th className="text-right px-2 py-2.5">Gap</th>
              <th className="text-center px-5 py-2.5">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {activeGoals.map((goal) => {
              const perGoalGap = goal.monthly_needed !== null ? availableForGoals - goal.monthly_needed : null;
              return (
                <tr key={goal.id} className="border-t border-border hover:bg-bg-sidebar/30">
                  <td className="px-5 py-3 font-semibold text-text-primary">{goal.name}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-24 progress-track">
                        <div className="progress-fill-interactive" style={{ width: `${Math.min(100, goal.progress_percent)}%` }} />
                      </div>
                      <span className="font-bold tabular-nums">{goal.progress_percent}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums font-semibold text-text-secondary">
                    {goal.monthly_needed !== null ? formatVnd(goal.monthly_needed) : "—"}
                  </td>
                  <td className={`px-2 py-3 text-right tabular-nums font-semibold ${perGoalGap !== null ? (perGoalGap >= 0 ? "text-success" : "text-error") : "text-text-muted"}`}>
                    {perGoalGap !== null ? `${perGoalGap >= 0 ? "+" : ""}${formatVnd(perGoalGap)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-center text-text-secondary">{formatFinanceDate(goal.deadline)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

