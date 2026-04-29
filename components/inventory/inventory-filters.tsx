"use client";

import { TabsFilter } from "@/components/ui/tabs-filter";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { INVENTORY_CATEGORY_MAP } from "@/types/inventory-constants";
import type { InventoryStats } from "@/types/inventory";

const STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Đang dùng", value: "active" },
  { label: "Sắp hết", value: "low_stock" },
  { label: "Hết hàng", value: "out_of_stock" },
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
  { value: "stock_asc", label: "Tồn kho tăng" },
  { value: "stock_desc", label: "Tồn kho giảm" },
];

interface InventoryFiltersProps {
  status: string;
  category: string;
  sort: string;
  onStatusChange: (status: string) => void;
  onCategoryChange: (category: string) => void;
  onSortChange: (sort: string) => void;
  stats: InventoryStats | null;
}

export function InventoryFilters({
  status,
  category,
  sort,
  onStatusChange,
  onCategoryChange,
  onSortChange,
  stats,
}: InventoryFiltersProps) {
  const tabsWithCounts = STATUS_TABS.map((tab) => {
    if (tab.value === "all") return { ...tab, count: stats?.total };
    if (tab.value === "active") return { ...tab, count: stats?.active };
    if (tab.value === "low_stock") return { ...tab, count: stats?.lowStock };
    if (tab.value === "out_of_stock") return { ...tab, count: stats?.outOfStock };
    return tab;
  });

  return (
    <>
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={STATUS_TABS}
          activeTab={status}
          onChange={onStatusChange}
          variant="pills"
        />
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
