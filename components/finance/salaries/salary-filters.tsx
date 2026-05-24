"use client";

import { Button } from "@/components/ui/button";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { TabsFilter } from "@/components/ui/tabs-filter";

interface FilterTab {
  label: string;
  value: string;
  count?: number;
}

interface FilterOption {
  value: string;
  label: string;
}

interface SalaryFiltersProps {
  scope: string;
  position: string;
  role: string;
  sort: string;
  month: string;
  year: string;
  tabs: FilterTab[];
  positionOptions: FilterOption[];
  roleOptions: FilterOption[];
  sortOptions: FilterOption[];
  monthOptions: FilterOption[];
  yearOptions: FilterOption[];
  hasActiveFilters: boolean;
  onScopeChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onReset: () => void;
}

export function SalaryFilters({
  scope,
  position,
  role,
  sort,
  month,
  year,
  tabs,
  positionOptions,
  roleOptions,
  sortOptions,
  monthOptions,
  yearOptions,
  hasActiveFilters,
  onScopeChange,
  onPositionChange,
  onRoleChange,
  onSortChange,
  onMonthChange,
  onYearChange,
  onReset,
}: SalaryFiltersProps) {
  const mobileTabs = tabs.map(({ label, value }) => ({ label, value }));

  return (
    <>
      <div className="space-y-3 lg:hidden">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
          <TabsFilter
            tabs={mobileTabs}
            activeTab={scope}
            onChange={onScopeChange}
            variant="pills"
          />
          <div className="h-5 shrink-0 border-l border-border" />
          <SelectPill
            value={position}
            onChange={onPositionChange}
            options={positionOptions}
            placeholder="Vị trí"
          />
          <SelectPill
            value={role}
            onChange={onRoleChange}
            options={roleOptions}
            placeholder="Loại"
          />
          <SelectPill
            value={sort}
            onChange={onSortChange}
            options={sortOptions}
            placeholder="Sắp xếp"
            defaultValue="default"
          />
          <SelectPill
            value={month}
            onChange={onMonthChange}
            options={monthOptions}
            placeholder="Tháng"
          />
          <SelectPill
            value={year}
            onChange={onYearChange}
            options={yearOptions}
            placeholder="Năm"
          />
        </div>

        {hasActiveFilters ? (
          <div className="flex items-center justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              Xóa lọc
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-4">
        <TabsFilter tabs={tabs} activeTab={scope} onChange={onScopeChange} />

        <div className="flex items-center gap-2">
          <SelectPill
            value={position}
            onChange={onPositionChange}
            options={positionOptions}
            placeholder="Vị trí"
          />
          <SelectPill
            value={role}
            onChange={onRoleChange}
            options={roleOptions}
            placeholder="Loại"
          />
          <SelectPill
            value={sort}
            onChange={onSortChange}
            options={sortOptions}
            placeholder="Sắp xếp"
            defaultValue="default"
          />
          <SelectPill
            value={month}
            onChange={onMonthChange}
            options={monthOptions}
            placeholder="Tháng"
          />
          <SelectPill
            value={year}
            onChange={onYearChange}
            options={yearOptions}
            placeholder="Năm"
          />
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              Xóa lọc
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
