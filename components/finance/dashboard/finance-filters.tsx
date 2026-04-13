"use client";

import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { SelectPill } from "@/components/ui/select/SelectPill";

interface FinanceFiltersProps {
  month: number;
  year: number;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  initialYear: number;
}

export function FinanceFilters({
  month,
  year,
  onMonthChange,
  onYearChange,
  initialYear,
}: FinanceFiltersProps) {
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar lg:justify-end">
      <SelectPill
        value={String(month)}
        onChange={onMonthChange}
        options={monthOptions}
        placeholder="Tháng"
        defaultValue="" 
      />
      <SelectPill
        value={String(year)}
        onChange={onYearChange}
        options={yearOptions}
        placeholder="Năm"
        defaultValue=""
      />
    </div>
  );
}
