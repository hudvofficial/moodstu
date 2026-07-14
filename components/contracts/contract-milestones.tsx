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
  const missing = milestones.filter((item) => !item.date && item.status !== "hoan_thanh" && item.status !== "da_huy").length;
  if (missing > 0) return { label: "Thiếu", count: missing, className: "bg-error/10 text-error", icon: AlertTriangle };

  const active = milestones.filter((item) => item.status !== "hoan_thanh" && item.status !== "da_huy");
  if (active.length === 0) return { label: "Đã xong", count: 0, className: "bg-success/10 text-success", icon: CheckCircle2 };

  const overdue = active.filter((item) => item.date && dayDistance(item.date) < 0).length;
  if (overdue > 0) return { label: "Quá hạn", count: overdue, className: "bg-error/10 text-error", icon: AlertTriangle };

  return { label: "Sắp tới", count: active.length, className: "bg-warning/10 text-warning", icon: Clock3 };
}

function MilestoneRows({ milestones }: { milestones: ContractMilestone[] }) {
  return milestones.map((milestone) => {
    const state = milestoneState(milestone);
    return (
      <div key={milestone.key} className="flex min-w-0 items-start gap-1.5 text-xs leading-4">
        <MilestoneIcon milestone={milestone} />
        <span className="min-w-0 flex-1 truncate text-text-secondary" title={milestone.label}>
          {milestone.label}
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

  if (milestones.length === 0) return <span className="text-sm text-text-muted">—</span>;

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
        className={`relative inline-block outline-none ${className}`}
        aria-label={`${summary.label}${summary.count ? ` ${summary.count}` : ""} mốc sự kiện`}
      >
        <div className={`inline-flex cursor-help items-center gap-1 rounded-md px-2 py-1 text-tiny font-bold uppercase tracking-tight ${summary.className}`}>
          <SummaryIcon className="size-3" />
          <span>{summary.label}</span>
          {summary.count > 0 ? <span className="rounded bg-white/30 px-1 py-0.5">{summary.count}</span> : null}
          <ChevronDown className="size-3 opacity-40" />
        </div>
        {isOpen ? (
          <div className={`absolute left-1/2 z-50 w-72 -translate-x-1/2 rounded-lg bg-bg-card p-3 text-left shadow-xl ${flipUp ? "bottom-full mb-2" : "top-full mt-2"}`}>
            <div className="mb-2 text-tiny font-black uppercase tracking-widest text-primary/60">Mốc sự kiện</div>
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
