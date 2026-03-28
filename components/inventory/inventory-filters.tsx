"use client";

/**
 * 🔍 InventoryFilters — Mobile pills + Desktop tabs/pills
 * Clone: contracts-list-client.tsx filter section
 * Pattern: TabsFilter variant="pills" (mobile) + default (desktop)
 *          SelectPill for category/sort (KHÔNG SelectForm — đây là filter, không phải form)
 */

import { TabsFilter } from "@/components/ui/tabs-filter";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { INVENTORY_CATEGORY_MAP } from "@/types/inventory-constants";
import type { InventoryStats } from "@/types/inventory";

// ─── CONSTANTS ──────────────────────────────────────

const STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Đang dùng", value: "active" },
  { label: "Ngưng", value: "discontinued" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "Phân loại" },
  ...Object.entries(INVENTORY_CATEGORY_MAP).map(([value, { label }]) => ({
    value,
    label,
  })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Sắp xếp" },
  { value: "name_asc", label: "Tên A-Z" },
  { value: "stock_asc", label: "Tồn kho ↑" },
  { value: "stock_desc", label: "Tồn kho ↓" },
];

// ─── PROPS ──────────────────────────────────────────

interface InventoryFiltersProps {
  status: string;
  category: string;
  sort: string;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  stats: InventoryStats | null;
}

// ─── COMPONENT ──────────────────────────────────────

export function InventoryFilters({
  status,
  category,
  sort,
  onStatusChange,
  onCategoryChange,
  onSortChange,
  stats,
}: InventoryFiltersProps) {
  // Build dynamic tab counts from stats
  const tabsWithCounts = STATUS_TABS.map((tab) => {
    if (tab.value === "all") return { ...tab, count: stats?.total };
    if (tab.value === "active") return { ...tab, count: stats?.active };
    return tab;
  });

  return (
    <>
      {/* ── MOBILE: Status pills + Dropdowns (1 hàng cuộn ngang) ── */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={STATUS_TABS}
          activeTab={status}
          onChange={onStatusChange}
          variant="pills"
        />
        {/* Separator */}
        <div className="h-5 border-l border-border shrink-0" />
        <SelectPill
          value={category}
          onChange={onCategoryChange}
          defaultValue="all"
          placeholder="Phân loại"
          options={CATEGORY_OPTIONS}
        />
        <SelectPill
          value={sort}
          onChange={onSortChange}
          defaultValue="newest"
          placeholder="Sắp xếp"
          options={SORT_OPTIONS}
        />
      </div>

      {/* ── DESKTOP: Tabs + Pills ── */}
      <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
        <TabsFilter
          tabs={tabsWithCounts}
          activeTab={status}
          onChange={onStatusChange}
        />
        <div className="flex items-center gap-2">
          <SelectPill
            value={category}
            onChange={onCategoryChange}
            defaultValue="all"
            placeholder="Phân loại"
            options={CATEGORY_OPTIONS}
          />
          <SelectPill
            value={sort}
            onChange={onSortChange}
            defaultValue="newest"
            placeholder="Sắp xếp"
            options={SORT_OPTIONS}
          />
        </div>
      </div>
    </>
  );
}
