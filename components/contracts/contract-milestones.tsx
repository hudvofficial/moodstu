"use client";

import { Camera, Heart } from "lucide-react";
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

export function ContractMilestones({
  contract,
  className = "",
  limit = 2,
}: {
  contract: Contract;
  className?: string;
  limit?: number;
}) {
  const milestones = getContractOnSetMilestones(contract);
  if (milestones.length === 0) return <span className="text-sm text-text-muted">—</span>;

  const visible = milestones.slice(0, limit);
  const hiddenCount = Math.max(0, milestones.length - visible.length);

  return (
    <div className={`space-y-1 ${className}`}>
      {visible.map((milestone) => {
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
      })}
      {hiddenCount > 0 ? <p className="pl-5 text-tiny text-text-muted">+{hiddenCount} mốc khác</p> : null}
    </div>
  );
}
