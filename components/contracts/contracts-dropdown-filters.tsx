"use client";

import { SlidersHorizontal } from "lucide-react";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { Button } from "@/components/ui/button";
import { SERVICE_TYPE_MAP } from "@/types/contract-constants";

const TIME_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_year", label: "Năm nay" },
];

const SERVICE_OPTIONS = [
  { value: "all", label: "Dịch vụ" },
  ...Object.entries(SERVICE_TYPE_MAP).map(([value, { label }]) => ({
    value,
    label,
  })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "amount_desc", label: "Giá cao" },
  { value: "amount_asc", label: "Giá thấp" },
];

interface ContractsDropdownFiltersProps {
  time: string;
  service: string;
  sort: string;
  onTimeChange: (value: string) => void;
  onServiceChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onToggleAdvanced: () => void;
  isAdvancedOpen: boolean;
}

export function ContractsDropdownFilters({
  time,
  service,
  sort,
  onTimeChange,
  onServiceChange,
  onSortChange,
  onToggleAdvanced,
  isAdvancedOpen,
}: ContractsDropdownFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <SelectPill
        options={TIME_OPTIONS}
        value={time}
        onChange={onTimeChange}
        placeholder="Tháng"
        defaultValue="all"
      />

      <SelectPill
        options={SERVICE_OPTIONS}
        value={service}
        onChange={onServiceChange}
        placeholder="Dịch vụ"
        defaultValue="all"
      />

      <SelectPill
        options={SORT_OPTIONS}
        value={sort}
        onChange={onSortChange}
        placeholder="Mới nhất"
        defaultValue="newest"
      />

      <Button
        unstyled
        onClick={onToggleAdvanced}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isAdvancedOpen
            ? "text-primary bg-primary/10 shadow-sm"
            : "text-primary bg-primary/5 hover:bg-primary/10 shadow-xs"
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="max-lg:hidden">Lọc nâng cao</span>
      </Button>
    </div>
  );
}
