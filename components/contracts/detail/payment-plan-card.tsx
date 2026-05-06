"use client";

import { CalendarCheck2, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency, formatDate, CURRENCY_SYMBOL } from "@/lib/utils";
import type { PaymentPlan } from "@/types/contract";
import { getPaymentStageLabel } from "@/types/contract-constants";

interface Props {
  paymentPlans: PaymentPlan[];
  onCollectPlan?: (planId: string) => void;
}

type PlanState = "paid" | "partial" | "pending" | "cancelled";

function normalizeStatus(status: string | null | undefined): string {
  return String(status || "pending").trim().toLowerCase();
}

function getPlanPaidAmount(plan: PaymentPlan) {
  if (typeof plan.paid_amount === "number") return Math.max(0, plan.paid_amount);
  return (plan.allocations || []).reduce((sum, allocation) => sum + Number(allocation.amount || 0), 0);
}

function getPlanState(plan: PaymentPlan): PlanState {
  const status = normalizeStatus(plan.status);
  const planned = Number(plan.amount || 0);
  const paid = getPlanPaidAmount(plan);

  if (status === "cancelled" || status === "da_huy" || status === "huy") return "cancelled";
  if (status === "paid" || status === "closed" || status === "da_thanh_toan") return "paid";
  if (planned > 0 && paid + 0.01 >= planned) return "paid";
  if (paid > 0) return "partial";
  return "pending";
}

function getPlanLabel(plan: PaymentPlan) {
  return getPaymentStageLabel(
    plan.stage_key || plan.stage_name,
    plan.stage_name || "Đợt thanh toán",
  );
}

function getNextPlan(plans: PaymentPlan[]) {
  const openPlans = plans.filter((plan) => {
    const state = getPlanState(plan);
    return state !== "paid" && state !== "cancelled";
  });

  return openPlans.find((plan) => getPlanPaidAmount(plan) <= 0) || openPlans[0] || null;
}

function getStatusLabel(state: PlanState) {
  if (state === "paid") return "Đã thu";
  if (state === "partial") return "Đang thu";
  if (state === "cancelled") return "Đã hủy";
  return "Chưa thu";
}

function getAmountLabel(plan: PaymentPlan) {
  const planned = Number(plan.amount || 0);
  if (planned > 0) return `${formatCurrency(planned)} ${CURRENCY_SYMBOL}`;
  return "Nhập khi thu";
}

export default function PaymentPlanCard({ paymentPlans, onCollectPlan }: Props) {
  const sortedPlans = [...paymentPlans].sort((a, b) => {
    if ((a.sort_order || 0) !== (b.sort_order || 0)) return (a.sort_order || 0) - (b.sort_order || 0);
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
  });

  const totalPlanned = sortedPlans.reduce((sum, plan) => sum + Number(plan.amount || 0), 0);
  const totalPaid = sortedPlans.reduce((sum, plan) => sum + getPlanPaidAmount(plan), 0);
  const progress = totalPlanned > 0
    ? Math.min(100, Math.round((totalPaid / totalPlanned) * 100))
    : 0;
  const nextPlan = getNextPlan(sortedPlans);
  const nextState = nextPlan ? getPlanState(nextPlan) : "paid";
  const openPlanCount = sortedPlans.filter((plan) => {
    const state = getPlanState(plan);
    return state !== "paid" && state !== "cancelled";
  }).length;
  const canCollectNext = Boolean(nextPlan && onCollectPlan && nextState !== "cancelled");

  return (
    <section className="card-base p-5">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-info/10 text-info">
            <CalendarCheck2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="section-heading text-text-primary">Kế hoạch thanh toán</h3>
            <p className="text-caption text-text-secondary">
              {sortedPlans.length > 0 ? `${sortedPlans.length} đợt theo hợp đồng` : "Chưa có kế hoạch"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="progress-track flex-1 bg-bg-hover">
              <div className="progress-fill-interactive" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-9 text-right text-label text-interactive">
              {progress}%
            </span>
          </div>
          <p className="text-caption text-text-muted">
            Đã thu {formatCurrency(totalPaid)} / {formatCurrency(totalPlanned)}
          </p>
        </div>

        {nextPlan ? (
          <Button
            unstyled
            type="button"
            disabled={!canCollectNext}
            onClick={() => {
              if (nextPlan) onCollectPlan?.(nextPlan.id);
            }}
            className={cn(
              "group w-full rounded-md bg-bg-hover/60 p-4 text-left transition-colors",
              canCollectNext && "hover:bg-interactive/5",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-overline text-interactive">
                  Tiếp theo
                </p>
                <p className="mt-1 truncate text-label text-text-primary">
                  {getPlanLabel(nextPlan)}
                </p>
                <p className="mt-1 text-caption text-text-secondary">
                  {nextPlan.due_date ? `Hạn thu: ${formatDate(nextPlan.due_date)}` : "Chưa có hạn thu"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-label text-text-primary">
                  {getAmountLabel(nextPlan)}
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  {getStatusLabel(nextState)}
                </p>
                {canCollectNext && (
                  <p className="mt-2 text-label text-interactive group-hover:underline">
                    Thu
                  </p>
                )}
              </div>
            </div>
          </Button>
        ) : (
          <div className="flex items-center gap-3 rounded-md bg-success/5 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <div>
              <p className="text-label text-text-primary">Đã hoàn tất kế hoạch</p>
              <p className="text-caption text-text-secondary">Không còn đợt cần thu.</p>
            </div>
          </div>
        )}

        {openPlanCount > 1 && (
          <div className="mt-3 flex items-center gap-2 px-1 text-caption text-text-secondary">
            <Circle className="h-3 w-3 text-text-muted" />
            <span>Còn {openPlanCount - 1} đợt sau mốc này</span>
          </div>
        )}
      </div>
    </section>
  );
}
