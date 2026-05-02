"use client";

import { useMemo, useState, useCallback, type FormEvent } from "react";
import { CalendarClock, Edit3, Wallet } from "lucide-react";
import { toast } from "sonner";
import { addContribution } from "@/app/actions/goal-budget-actions";
import type { GoalsCashflowData } from "@/app/actions/finance-operations-queries";
import { formatVnd } from "@/components/finance/finance-format";
import { GoalIcon, resolveGoalColor } from "@/components/finance/goals/goal-visual";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { cacheKeys, mutate } from "@/lib/swr";
import type { GoalItem } from "@/types/finance-operations";

type GoalMilestone = 25 | 50 | 75 | 100;

interface GoalContributionModalProps {
  goal: GoalItem | null;
  cashflow?: GoalsCashflowData | null;
  onCelebrate?: (milestone: GoalMilestone) => void;
  onClose: () => void;
  onSaved: () => void;
}

export function GoalContributionModal({ goal, cashflow = null, onCelebrate, onClose, onSaved }: GoalContributionModalProps) {
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<"commitment" | "surplus" | "custom">("custom");

  const handleChangeNotes = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value), []);

  const suggested = useMemo(() => {
    if (!goal) return { commitment: 0, surplus: 0 };
    const remaining = Math.max(0, goal.remaining || 0);
    const commitment = goal.monthly_needed && goal.monthly_needed > 0 ? Math.min(goal.monthly_needed, remaining || goal.monthly_needed) : 0;
    const surplus = Math.max(0, cashflow?.availableForGoals || 0);
    return { commitment, surplus: remaining > 0 ? Math.min(surplus, remaining) : surplus };
  }, [cashflow?.availableForGoals, goal]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!goal) return;
    setSaving(true);
    const result = await addContribution(goal.id, amount, notes || undefined);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã ghi nhận khoản góp.");

    const prevProgress = goal.progress_percent || 0;
    const target = goal.target_amount || 0;
    const current = goal.current_amount || 0;
    if (target > 0 && amount > 0) {
      const nextProgress = Math.min(100, Math.round(((current + amount) / target) * 100));
      const milestones: GoalMilestone[] = [25, 50, 75, 100];
      for (const m of milestones) {
        if (prevProgress < m && nextProgress >= m) {
          onCelebrate?.(m);
          break;
        }
      }
    }

    void mutate(cacheKeys.goalContributions(goal.id));

    setAmount(0);
    setNotes("");
    onClose();
    onSaved();
  };

  const palette = goal ? resolveGoalColor(goal.color) : null;

  const optionClass = (active: boolean) =>
    `w-full justify-start gap-3 px-3 py-3 rounded-xl border transition-colors text-left ${active ? "border-primary bg-primary/5" : "border-border hover:bg-bg-sidebar/30"}`;

  const radioClass = (active: boolean) =>
    `w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? "border-primary" : "border-border"}`;

  return (
    <UnifiedModal
      isOpen={Boolean(goal)}
      onClose={onClose}
      title={goal ? `Góp vào ${goal.name}` : "Góp mục tiêu"}
      size="lg"
      footer={
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form="goal-contribution-form" disabled={saving || amount <= 0}>
            {saving ? "Đang lưu" : "Lưu khoản góp"}
          </Button>
        </div>
      }
    >
      <form id="goal-contribution-form" onSubmit={submit} className="space-y-4">
        {goal ? (
          <div className="card-base p-4 flex items-start gap-3">
            <div className={`icon-box ${palette?.iconBg || "bg-primary/10"}`}>
              <GoalIcon value={goal.icon} className={`w-5 h-5 ${palette?.iconColor || "text-primary"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-sm font-semibold text-text-primary truncate">{goal.name}</p>
              <p className="text-caption text-text-secondary mt-0.5">
                Đã góp: <span className="font-semibold tabular-nums">{formatVnd(goal.current_amount)}</span> / {formatVnd(goal.target_amount)}
              </p>
              <p className="text-caption text-text-muted">
                Còn thiếu: <span className="font-semibold tabular-nums">{formatVnd(goal.remaining)}</span>
              </p>
            </div>
            {cashflow ? (
              <div className="text-right shrink-0">
                <p className="text-caption text-text-muted">Dư/tháng</p>
                <p className="text-body-sm font-bold tabular-nums">{formatVnd(cashflow.availableForGoals)}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {goal ? (
          <div className="space-y-2">
            <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide">Chọn cách góp</p>
            <div className="space-y-2">
              {suggested.commitment > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setMode("commitment");
                    setAmount(suggested.commitment);
                  }}
                  className={optionClass(mode === "commitment")}
                >
                  <CalendarClock className="w-4 h-4 text-success shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-semibold text-text-primary">Góp theo cam kết tháng</p>
                    <p className="text-caption text-text-secondary">{formatVnd(suggested.commitment)}</p>
                  </div>
                  <div className={radioClass(mode === "commitment")}>{mode === "commitment" ? <div className="w-2.5 h-2.5 bg-primary rounded-full" /> : null}</div>
                </Button>
              ) : null}

              {suggested.surplus > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setMode("surplus");
                    setAmount(suggested.surplus);
                  }}
                  className={optionClass(mode === "surplus")}
                >
                  <Wallet className="w-4 h-4 text-info shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-semibold text-text-primary">Góp theo dư hiện tại</p>
                    <p className="text-caption text-text-secondary">{formatVnd(suggested.surplus)}</p>
                  </div>
                  <div className={radioClass(mode === "surplus")}>{mode === "surplus" ? <div className="w-2.5 h-2.5 bg-primary rounded-full" /> : null}</div>
                </Button>
              ) : null}

              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setMode("custom");
                  setAmount(0);
                }}
                className={optionClass(mode === "custom")}
              >
                <Edit3 className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm font-semibold text-text-primary">Góp tùy chỉnh</p>
                  <p className="text-caption text-text-secondary">Nhập số tiền bạn muốn</p>
                </div>
                <div className={radioClass(mode === "custom")}>{mode === "custom" ? <div className="w-2.5 h-2.5 bg-primary rounded-full" /> : null}</div>
              </Button>
            </div>
          </div>
        ) : null}

        <CurrencyInput
          label="Số tiền góp"
          value={amount}
          onChange={(value) => {
            if (mode !== "custom") setMode("custom");
            setAmount(value);
          }}
          required
        />
        <Textarea label="Ghi chú" value={notes} onChange={handleChangeNotes} rows={3} />
      </form>
    </UnifiedModal>
  );
}
