"use client";

/**
 * 🔍 GoalsFilters — Status tabs for goals filtering
 * Pattern: finance/receipts/receipt-filters.tsx
 */

import { TabsFilter } from "@/components/ui/tabs-filter";
import { TierSwitch } from "@/components/ui/tier-switch";

const GOAL_STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Đang góp", value: "active" },
  { label: "Hoàn thành", value: "completed" },
  { label: "Đã hủy", value: "cancelled" },
];

interface GoalsFiltersProps {
  activeStatus: string;
  onStatusChange: (value: string) => void;
  counts: { all: number; active: number; completed: number; cancelled: number };
}

export function GoalsFilters({ activeStatus, onStatusChange, counts }: GoalsFiltersProps) {
  const tabsWithCounts = GOAL_STATUS_TABS.map((tab) => ({
    ...tab,
    count: counts[tab.value as keyof GoalsFiltersProps["counts"]] || 0,
  }));

  return (
    <TierSwitch
      phone={
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
          <TabsFilter tabs={GOAL_STATUS_TABS} activeTab={activeStatus} onChange={onStatusChange} variant="pills" />
        </div>
      }
      desktop={<TabsFilter tabs={tabsWithCounts} activeTab={activeStatus} onChange={onStatusChange} />}
    />
  );
}
