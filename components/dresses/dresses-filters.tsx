"use client";

/**
 * 🔍 DressesFilters — Filter bar for dresses list
 * Pattern: EXACT clone from employee-filters.tsx (Gold Standard)
 *
 * Mobile:  TabsFilter pills + separator + SelectPill x2 (scroll ngang)
 * Desktop: TabsFilter tabs left + SelectPill x2 right (justify-between)
 *
 * State: URL searchParams (share link, back button, bookmark)
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { DRESS_CATEGORY_MAP } from "@/types/dress-constants";
import { DRESS_CATEGORIES } from "@/lib/validations/dress.schema";
import type { DressStats } from "@/types/dress";
import { TierSwitch } from "@/components/ui/tier-switch";

// ── Filter options (static, hoisted) ──────────────────

const CATEGORY_OPTIONS = [
  { value: "all", label: "Tất cả loại" },
  ...DRESS_CATEGORIES.map((c) => ({ value: c, label: DRESS_CATEGORY_MAP[c].label })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_desc", label: "Giá cao" },
  { value: "price_asc", label: "Giá thấp" },
  { value: "name_asc", label: "Tên A → Z" },
];

// ── Props ─────────────────────────────────────────────
interface DressesFiltersProps {
  stats: DressStats;
}

// ── Component ─────────────────────────────────────────
export default function DressesFilters({ stats }: DressesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all" && value !== "newest") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // ── Status tabs with counts ──
  const currentStatus = searchParams.get("status") || "all";
  const STATUS_TABS = [
    { value: "all", label: "Tất cả", count: stats.total },
    { value: "available", label: "Sẵn sàng", count: stats.available },
    { value: "reserved", label: "Đã đặt", count: stats.reserved },
    { value: "rented", label: "Đang thuê", count: stats.rented },
  ];

  return (
    <TierSwitch
      phone={
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
        <TabsFilter
          tabs={STATUS_TABS}
          activeTab={currentStatus}
          onChange={(value) => updateParam("status", value)}
          variant="pills"
        />
        <div className="h-5 border-l border-border shrink-0" />
        <SelectPill
          options={CATEGORY_OPTIONS}
          value={searchParams.get("category") || "all"}
          onChange={(v) => updateParam("category", v)}
          placeholder="Loại"
          defaultValue="all"
        />
        <SelectPill
          options={SORT_OPTIONS}
          value={searchParams.get("sort") || "newest"}
          onChange={(v) => updateParam("sort", v)}
          placeholder="Mới nhất"
          defaultValue="newest"
        />
        </div>
      }
      desktop={
        <div className="flex items-center justify-between gap-3">
        <TabsFilter
          tabs={STATUS_TABS}
          activeTab={currentStatus}
          onChange={(value) => updateParam("status", value)}
        />
        <div className="flex items-center gap-2">
          <SelectPill
            options={CATEGORY_OPTIONS}
            value={searchParams.get("category") || "all"}
            onChange={(v) => updateParam("category", v)}
            placeholder="Loại"
            defaultValue="all"
          />
          <SelectPill
            options={SORT_OPTIONS}
            value={searchParams.get("sort") || "newest"}
            onChange={(v) => updateParam("sort", v)}
            placeholder="Mới nhất"
            defaultValue="newest"
          />
        </div>
        </div>
      }
    />
  );
}
