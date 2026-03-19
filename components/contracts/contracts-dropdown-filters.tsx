"use client";

/**
 * ContractsDropdownFilters
 *
 * MIGRATED: FilterSelect (native <select>) → SelectPill (Radix)
 * Desktop filter bar giờ nhất quán với mobile SelectPill.
 * Không còn native <select> nào.
 */

import { SlidersHorizontal } from "lucide-react";
import { SelectPill } from "@/components/ui/select/SelectPill";

// ─── OPTIONS ─────────────────────────────────────────

const TIME_OPTIONS = [
  { value: "all",        label: "Tất cả" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_year",  label: "Năm nay" },
];

const SERVICE_OPTIONS = [
  { value: "all",       label: "Dịch vụ" },
  { value: "Studio",    label: "Studio" },
  { value: "Ngày Cưới", label: "Ngày Cưới" },
  { value: "Combo",     label: "Combo" },
  { value: "Baby",      label: "Baby" },
  { value: "Gia đình",  label: "Gia đình" },
  { value: "Bầu",       label: "Bầu" },
  { value: "Couple",    label: "Couple" },
  { value: "Concept",   label: "Concept" },
  { value: "Kỷ yếu",   label: "Kỷ yếu" },
  { value: "Sinh Nhật", label: "Sinh Nhật" },
  { value: "Media",     label: "Media" },
  { value: "Khác",      label: "Khác" },
];

const SORT_OPTIONS = [
  { value: "newest",     label: "Mới nhất" },
  { value: "oldest",     label: "Cũ nhất" },
  { value: "amount_desc", label: "Giá cao" },
  { value: "amount_asc",  label: "Giá thấp" },
];

// ─── PROPS ──────────────────────────────────────────

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

// ─── COMPONENT ──────────────────────────────────────

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
      {/* Time filter pill */}
      <SelectPill
        options={TIME_OPTIONS}
        value={time}
        onChange={onTimeChange}
        placeholder="Tháng"
        defaultValue="all"
      />

      {/* Service filter pill */}
      <SelectPill
        options={SERVICE_OPTIONS}
        value={service}
        onChange={onServiceChange}
        placeholder="Dịch vụ"
        defaultValue="all"
      />

      {/* Sort filter pill */}
      <SelectPill
        options={SORT_OPTIONS}
        value={sort}
        onChange={onSortChange}
        placeholder="Mới nhất"
        defaultValue="newest"
      />

      {/* Advanced Filter toggle — unchanged */}
      <button
        onClick={onToggleAdvanced}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          isAdvancedOpen
            ? "text-primary bg-primary/10 shadow-sm"
            : "text-primary bg-primary/5 hover:bg-primary/10 shadow-xs"
        }`}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span className="max-lg:hidden">Lọc nâng cao</span>
      </button>
    </div>
  );
}
