"use client";

import { BookLock, ClipboardList, Clock3, LockKeyhole } from "lucide-react";
import { StatsBar } from "@/components/ui/stats-bar";

interface CloseStatsCounts {
  all: number;
  draft: number;
  inProgress: number;
  pendingReview: number;
  locked: number;
}

interface CloseStatsBarProps {
  counts: CloseStatsCounts;
}

export function CloseStatsBar({ counts }: CloseStatsBarProps) {
  const activeCount = counts.inProgress + counts.pendingReview;

  const items = [
    {
      icon: BookLock,
      label: "kỳ chốt",
      value: String(counts.all),
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      icon: ClipboardList,
      label: "nháp",
      value: String(counts.draft),
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      icon: Clock3,
      label: "đang xử lý",
      value: String(activeCount),
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
    },
    {
      icon: LockKeyhole,
      label: "đã khóa",
      value: String(counts.locked),
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
  ];

  return <StatsBar items={items} />;
}
