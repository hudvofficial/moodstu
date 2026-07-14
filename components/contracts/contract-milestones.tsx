"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ChevronDown, Clock3, Heart } from "lucide-react";
import { getContractOnSetMilestones, type ContractMilestone } from "@/lib/contracts/contract-workflow";
import { formatDate } from "@/lib/utils";
import type { Contract } from "@/types/contract";

function dayDistance(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function milestoneState(milestone: ContractMilestone) {
  if (milestone.status === "hoan_thanh") return { label: "Đã xong", className: "text-success" };
  if (milestone.status === "da_huy") return { label: "Đã hủy", className: "text-error" };
  if (!milestone.date) return { label: "Chưa cập nhật", className: "text-warning" };
  const days = dayDistance(milestone.date);
  if (days < 0) return { label: "Đã qua", className: "text-error" };
  if (days === 0) return { label: "Hôm nay", className: "text-error" };
  if (days <= 7) return { label: `${days} ngày`, className: "text-error" };
  if (days <= 30) return { label: `${days} ngày`, className: "text-warning" };
  return { label: `${days} ngày`, className: "text-text-muted" };
}

function MilestoneIcon({ milestone }: { milestone: ContractMilestone }) {
  const Icon = milestone.eventType === "ngay_to_chuc" ? Heart : Camera;
  return <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />;
}

function compactSummary(milestones: ContractMilestone[]) {
  const active = milestones.filter((item) => item.status !== "da_huy");
  const completed = active.filter((item) => item.status === "hoan_thanh").length;
  const total = active.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pending = active.filter((item) => item.status !== "hoan_thanh");
  const missing = pending.filter((item) => !item.date).length;
  const overdue = pending.filter((item) => item.date && dayDistance(item.date) < 0).length;
  const next = pending
    .filter((item) => item.date && dayDistance(item.date) >= 0)
    .sort((left, right) => Date.parse(left.date || "") - Date.parse(right.date || ""))[0];

  if (total === 0) {
    return {
      completed: 0,
      total: 0,
      pct: 0,
      label: "Chưa có sự kiện",
      barClassName: "bg-text-muted",
      textClassName: "text-text-muted",
      cardClassName: "bg-bg-hover opacity-60",
      icon: Clock3,
    };
  }
  if (completed === total) {
    return {
      completed,
      total,
      pct,
      label: "Hoàn tất",
      barClassName: "bg-success",
      textClassName: "text-success",
      cardClassName: "bg-success/10",
      icon: CheckCircle2,
    };
  }
  if (missing > 0) {
    return {
      completed,
      total,
      pct,
      label: `Thiếu ngày${missing > 1 ? ` ${missing}` : ""}`,
      barClassName: "bg-error",
      textClassName: "text-error",
      cardClassName: "bg-error/10",
      icon: AlertTriangle,
    };
  }
  if (overdue > 0) {
    return {
      completed,
      total,
      pct,
      label: `Quá hạn${overdue > 1 ? ` ${overdue}` : ""}`,
      barClassName: "bg-error",
      textClassName: "text-error",
      cardClassName: "bg-error/10",
      icon: AlertTriangle,
    };
  }
  return {
    completed,
    total,
    pct,
    label: next ? `→ ${next.label}` : "Chờ cập nhật",
    barClassName: "bg-warning",
    textClassName: "text-warning",
    cardClassName: "bg-bg-hover shadow-xs",
    icon: Clock3,
  };
}

function milestoneDisplayLabel(milestone: ContractMilestone) {
  if (milestone.eventType === "ngay_chup" && milestone.label.trim().toLowerCase() === "thực hiện studio") {
    return "Studio";
  }
  return milestone.label;
}

function MilestoneRows({ milestones }: { milestones: ContractMilestone[] }) {
  return milestones.map((milestone) => {
    const state = milestoneState(milestone);
    return (
      <div key={milestone.key} className="flex min-w-0 items-start gap-1.5 text-xs leading-4">
        <MilestoneIcon milestone={milestone} />
        <span className="min-w-0 flex-1 truncate font-medium text-text-secondary" title={milestoneDisplayLabel(milestone)}>
          {milestoneDisplayLabel(milestone)}
        </span>
        <span className="shrink-0 tabular-nums text-text-primary">
          {milestone.date ? formatDate(milestone.date) : "—"}
        </span>
        <span className={`shrink-0 font-semibold ${state.className}`}>{state.label}</span>
      </div>
    );
  });
}

export function ContractMilestones({
  contract,
  className = "",
  limit = 2,
  compact = false,
}: {
  contract: Contract;
  className?: string;
  limit?: number;
  compact?: boolean;
}) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const milestones = getContractOnSetMilestones(contract);

  const open = useCallback(() => {
    const rect = badgeRef.current?.getBoundingClientRect();
    setFlipUp(Boolean(rect && rect.bottom + 180 > window.innerHeight));
    setIsOpen(true);
  }, []);

  if (milestones.length === 0 && !compact) return <span className="text-sm text-text-muted">—</span>;

  const visible = milestones.slice(0, limit);
  const hiddenCount = Math.max(0, milestones.length - visible.length);

  if (compact) {
    const summary = compactSummary(milestones);
    const SummaryIcon = summary.icon;
    return (
      <div
        ref={badgeRef}
        tabIndex={0}
        onMouseEnter={open}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={open}
        onBlur={() => setIsOpen(false)}
        className={`relative inline-block w-full outline-none ${className}`}
        aria-label={`${summary.completed}/${summary.total} mốc sự kiện, ${summary.label}`}
      >
        <div className={`flex min-w-30 cursor-help flex-col gap-1 rounded-md px-2 py-1.5 transition-all ${summary.cardClassName}`}>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/30">
              <div
                className={`h-full rounded-full transition-all duration-500 ${summary.barClassName}`}
                style={{ width: `${summary.pct}%` }}
              />
            </div>
            <span className={`shrink-0 text-xs font-bold ${summary.textClassName}`}>
              {summary.total > 0 ? `${summary.completed}/${summary.total}` : "—"}
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-1">
            <span className={`flex min-w-0 items-center gap-1 truncate text-tiny font-medium ${summary.textClassName}`}>
              <SummaryIcon className="size-3 shrink-0" />
              <span className="truncate">{summary.label}</span>
            </span>
            <ChevronDown className={`size-3 shrink-0 opacity-40 ${summary.textClassName}`} />
          </div>
        </div>
        {isOpen && milestones.length > 0 ? (
          <div className={`absolute left-1/2 z-50 w-72 -translate-x-1/2 rounded-lg bg-bg-card p-3 text-left shadow-xl ${flipUp ? "bottom-full mb-2" : "top-full mt-2"}`}>
            <div className="mb-2 text-xs font-semibold text-text-secondary">Mốc sự kiện</div>
            <div className="space-y-2"><MilestoneRows milestones={milestones} /></div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <MilestoneRows milestones={visible} />
      {hiddenCount > 0 ? <p className="pl-5 text-tiny text-text-muted">+{hiddenCount} mốc khác</p> : null}
    </div>
  );
}
