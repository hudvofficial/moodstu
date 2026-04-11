"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { LEAD_STATUS_MAP, SOURCE_MAP, PIPELINE_STAGES } from "@/types/crm";
import type { LeadStats } from "@/types/crm";

interface Props {
  stats: LeadStats;
}

// ── OPTIONS ──────────────────────────────────────────

const SOURCE_OPTIONS = [
  { value: "all", label: "Nguồn (Tất cả)" },
  ...Object.entries(SOURCE_MAP).map(([value, { label }]) => ({ value, label })),
];

const ASSIGNED_OPTIONS = [
  { value: "all", label: "Nhân viên (Tất cả)" },
  { value: "unassigned", label: "Chưa giao" },
  { value: "me", label: "Của tôi" },
];

// ── COMPONENT ──────────────────────────────────────────

export default function LeadFilters({ stats }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, startTransition]
  );

  // ── Status tabs data ──
  const currentStatus = searchParams.get("status") || "all";
  
  const STATUS_TABS = [
    { value: "all", label: "Tất cả", count: stats.total },
    // Only map pipeline stages and 'huy'
    ...[...PIPELINE_STAGES, "huy"].map((status) => ({
      value: status,
      label: LEAD_STATUS_MAP[status as keyof typeof LEAD_STATUS_MAP]?.label || status,
      count: stats.byStatus?.[status] || 0
    }))
  ];

  return (
    <>
      {/* ── MOBILE: Status pills + Dropdowns (1 hàng cuộn ngang) ── */}
      <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide py-1">
        <TabsFilter
          tabs={STATUS_TABS}
          activeTab={currentStatus}
          onChange={(value) => updateParam("status", value)}
          variant="pills"
        />
        {/* Separator */}
        <div className="h-5 border-l border-border shrink-0 mx-1" />
        <SelectPill
          options={SOURCE_OPTIONS}
          value={searchParams.get("source") || "all"}
          onChange={(v) => updateParam("source", v)}
          placeholder="Nguồn"
          defaultValue="all"
        />
        <SelectPill
          options={ASSIGNED_OPTIONS}
          value={searchParams.get("assigned") || "all"}
          onChange={(v) => updateParam("assigned", v)}
          placeholder="Nhân viên"
          defaultValue="all"
        />
      </div>

      {/* ── DESKTOP: Tabs left + Dropdowns right ── */}
      <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
        <TabsFilter
          tabs={STATUS_TABS}
          activeTab={currentStatus}
          onChange={(value) => updateParam("status", value)}
        />
        <div className="flex items-center gap-2">
          <SelectPill
            options={SOURCE_OPTIONS}
            value={searchParams.get("source") || "all"}
            onChange={(v) => updateParam("source", v)}
            placeholder="Nguồn"
            defaultValue="all"
          />
          <SelectPill
            options={ASSIGNED_OPTIONS}
            value={searchParams.get("assigned") || "all"}
            onChange={(v) => updateParam("assigned", v)}
            placeholder="Nhân viên"
            defaultValue="all"
          />
        </div>
      </div>
    </>
  );
}
