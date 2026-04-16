"use client";

/**
 * 🔍 ExpenseFilters — Approval status tabs for expense filtering
 * Clone pattern: finance/receipts/receipt-filters.tsx
 */

import { TabsFilter } from "@/components/ui/tabs-filter";
import type { ExpenseStats } from "@/app/actions/finance-operations-queries";

// ─── CONSTANTS ──────────────────────────────────────

const EXPENSE_APPROVAL_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ duyệt", value: "pending" },
  { label: "Đã duyệt", value: "approved" },
];

// ─── COMPONENT ──────────────────────────────────────

interface ExpenseFiltersProps {
  activeApproval: string;
  onApprovalChange: (approval: string) => void;
  stats: ExpenseStats | null;
}

export function ExpenseFilters({ activeApproval, onApprovalChange, stats }: ExpenseFiltersProps) {
  // Add count for the "Tất cả", "Chờ duyệt" and "Đã duyệt" tabs based on stats
  const tabsWithCounts = EXPENSE_APPROVAL_TABS.map((tab) => {
    if (tab.value === "all") return { ...tab, count: stats?.totalExpenses };
    if (tab.value === "pending") return { ...tab, count: stats?.pendingCount };
    if (tab.value === "approved") return { ...tab, count: stats?.approvedCount };
    return tab;
  });

  return (
    <>
      {/* ── MOBILE: pills scroll ngang ── */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={EXPENSE_APPROVAL_TABS}
          activeTab={activeApproval}
          onChange={onApprovalChange}
          variant="pills"
        />
      </div>

      {/* ── DESKTOP: segmented control ── */}
      <div className="hidden lg:block">
        <TabsFilter
          tabs={tabsWithCounts}
          activeTab={activeApproval}
          onChange={onApprovalChange}
        />
      </div>
    </>
  );
}
