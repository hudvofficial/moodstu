"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { DEPARTMENT_OPTIONS, ROLE_LABELS } from "@/types/employee-constants";
import { TierSwitch } from "@/components/ui/tier-switch";

// ═══════════════════════════════════════════
// EmployeeFilters — Gold Standard layout
// Phase 3: TabsFilter + SelectPill (giống /contracts)
// Layout: [TabsFilter left] ... [SelectPill x3 right]
// ═══════════════════════════════════════════

interface Props {
  stats: { total: number; active: number; inactive: number };
}

// ── OPTIONS ──────────────────────────────────────────

const DEPT_OPTIONS = [
  { value: "all", label: "Phòng ban" },
  ...DEPARTMENT_OPTIONS.map((d) => ({ value: d.value, label: d.label })),
];

const ROLE_OPTIONS = [
  { value: "all", label: "Vai trò" },
  ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "name_asc", label: "A → Z" },
  { value: "name_desc", label: "Z → A" },
  { value: "code_asc", label: "Mã NV ↑" },
  { value: "code_desc", label: "Mã NV ↓" },
];

// ── COMPONENT ──────────────────────────────────────────

export default function EmployeeFilters({ stats }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

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
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams]
  );

  // ── Status tabs data ──
  const currentStatus = searchParams.get("status") || "all";
  const STATUS_TABS = [
    { value: "all", label: "Tất cả", count: stats.total },
    { value: "active", label: "Đang làm", count: stats.active },
    { value: "inactive", label: "Nghỉ việc", count: stats.inactive },
  ];

  return (
    <div className="flex flex-col gap-3">
      <TierSwitch
        phone={
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
            <TabsFilter
              tabs={STATUS_TABS}
              activeTab={currentStatus}
              onChange={(value) => updateParam("status", value)}
              variant="pills"
            />
            {/* Separator */}
            <div className="h-5 border-l border-border shrink-0" />
            <SelectPill
              options={DEPT_OPTIONS}
              value={searchParams.get("dept") || "all"}
              onChange={(v) => updateParam("dept", v)}
              placeholder="Phòng ban"
              defaultValue="all"
            />
            <SelectPill
              options={ROLE_OPTIONS}
              value={searchParams.get("role") || "all"}
              onChange={(v) => updateParam("role", v)}
              placeholder="Vai trò"
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
                options={DEPT_OPTIONS}
                value={searchParams.get("dept") || "all"}
                onChange={(v) => updateParam("dept", v)}
                placeholder="Phòng ban"
                defaultValue="all"
              />
              <SelectPill
                options={ROLE_OPTIONS}
                value={searchParams.get("role") || "all"}
                onChange={(v) => updateParam("role", v)}
                placeholder="Vai trò"
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
    </div>
  );
}
