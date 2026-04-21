"use client";

import { TabsFilter } from "@/components/ui/tabs-filter";

export type CloseStatusFilter = "all" | "draft" | "in_progress" | "pending_review" | "locked";

interface CloseFilterCounts {
  all: number;
  draft: number;
  inProgress: number;
  pendingReview: number;
  locked: number;
}

interface CloseFiltersProps {
  activeStatus: CloseStatusFilter;
  onStatusChange: (value: CloseStatusFilter) => void;
  counts: CloseFilterCounts;
}

const CLOSE_STATUS_TABS: Array<{ label: string; value: CloseStatusFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Đang xử lý", value: "in_progress" },
  { label: "Chờ duyệt", value: "pending_review" },
  { label: "Đã khóa", value: "locked" },
];

function getCount(value: CloseStatusFilter, counts: CloseFilterCounts) {
  if (value === "all") return counts.all;
  if (value === "draft") return counts.draft;
  if (value === "in_progress") return counts.inProgress;
  if (value === "pending_review") return counts.pendingReview;
  return counts.locked;
}

export function CloseFilters({ activeStatus, onStatusChange, counts }: CloseFiltersProps) {
  const tabsWithCounts = CLOSE_STATUS_TABS.map((tab) => ({
    ...tab,
    count: getCount(tab.value, counts),
  }));

  return (
    <>
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={CLOSE_STATUS_TABS}
          activeTab={activeStatus}
          onChange={(value) => onStatusChange(value as CloseStatusFilter)}
          variant="pills"
        />
      </div>

      <div className="hidden lg:block">
        <TabsFilter
          tabs={tabsWithCounts}
          activeTab={activeStatus}
          onChange={(value) => onStatusChange(value as CloseStatusFilter)}
        />
      </div>
    </>
  );
}
