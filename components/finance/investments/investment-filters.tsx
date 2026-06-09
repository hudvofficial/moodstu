"use client";

import { Button } from "@/components/ui/button";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { TierSwitch } from "@/components/ui/tier-switch";

interface FilterTab {
  label: string;
  value: string;
  count?: number;
}

interface FilterOption {
  value: string;
  label: string;
}

interface InvestmentFiltersProps {
  scope: string;
  category: string;
  condition: string;
  sort: string;
  tabs: FilterTab[];
  categoryOptions: FilterOption[];
  conditionOptions: FilterOption[];
  sortOptions: FilterOption[];
  hasActiveFilters: boolean;
  onScopeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onConditionChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onReset: () => void;
}

export function InvestmentFilters({
  scope,
  category,
  condition,
  sort,
  tabs,
  categoryOptions,
  conditionOptions,
  sortOptions,
  hasActiveFilters,
  onScopeChange,
  onCategoryChange,
  onConditionChange,
  onSortChange,
  onReset,
}: InvestmentFiltersProps) {
  const mobileTabs = tabs.map(({ label, value }) => ({ label, value }));

  return (
    <TierSwitch
      phone={
        <div className="space-y-3">
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
            <TabsFilter tabs={mobileTabs} activeTab={scope} onChange={onScopeChange} variant="pills" />
            <div className="h-5 shrink-0 border-l border-border" />
            <SelectPill value={category} onChange={onCategoryChange} options={categoryOptions} placeholder="Danh mục" />
            <SelectPill value={condition} onChange={onConditionChange} options={conditionOptions} placeholder="Tình trạng" />
            <SelectPill value={sort} onChange={onSortChange} options={sortOptions} placeholder="Sắp xếp" defaultValue="newest" />
          </div>
          {hasActiveFilters ? (
            <div className="flex items-center justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>Xóa lọc</Button>
            </div>
          ) : null}
        </div>
      }
      desktop={
        <div className="flex items-center justify-between gap-4">
          <TabsFilter tabs={tabs} activeTab={scope} onChange={onScopeChange} />
          <div className="flex items-center gap-2">
            <SelectPill value={category} onChange={onCategoryChange} options={categoryOptions} placeholder="Danh mục" />
            <SelectPill value={condition} onChange={onConditionChange} options={conditionOptions} placeholder="Tình trạng" />
            <SelectPill value={sort} onChange={onSortChange} options={sortOptions} placeholder="Sắp xếp" defaultValue="newest" />
            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>Xóa lọc</Button>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
