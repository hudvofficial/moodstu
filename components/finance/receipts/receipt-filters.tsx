"use client";

/**
 * 🔍 ReceiptFilters — Status tabs for receipt filtering
 * Clone pattern: inventory/inventory-filters.tsx
 */

import { TabsFilter } from "@/components/ui/tabs-filter";
import type { ReceiptStats } from "@/app/actions/finance-operations-queries";

// ─── CONSTANTS ──────────────────────────────────────

const RECEIPT_TYPE_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Thu hợp đồng", value: "contract_payment" },
  { label: "Cọc hợp đồng", value: "contract_deposit" },
  { label: "Bán vật tư", value: "sale_receipt" },
  { label: "Thu khác", value: "other_income" },
];

// ─── COMPONENT ──────────────────────────────────────

interface ReceiptFiltersProps {
  activeType: string;
  onTypeChange: (type: string) => void;
  stats: ReceiptStats | null;
}

export function ReceiptFilters({ activeType, onTypeChange, stats }: ReceiptFiltersProps) {
  // Chỉ thêm count cho "Tất cả" tab
  const tabsWithCounts = RECEIPT_TYPE_TABS.map((tab) => {
    if (tab.value === "all") return { ...tab, count: stats?.totalReceipts };
    return tab;
  });

  return (
    <>
      {/* ── MOBILE: pills scroll ngang ── */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={RECEIPT_TYPE_TABS}
          activeTab={activeType}
          onChange={onTypeChange}
          variant="pills"
        />
      </div>

      {/* ── DESKTOP: segmented control ── */}
      <div className="hidden lg:block">
        <TabsFilter
          tabs={tabsWithCounts}
          activeTab={activeType}
          onChange={onTypeChange}
        />
      </div>
    </>
  );
}
