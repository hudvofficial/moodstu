"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Link2Off } from "lucide-react";
import { ProductivityDetailDrawer } from "@/components/productivity/productivity-detail-drawer";
import { ProductivitySelfView } from "@/components/productivity/productivity-self-view";
import { ProductivityStatsBar } from "@/components/productivity/productivity-stats-bar";
import { ProductivityTeamView } from "@/components/productivity/productivity-team-view";
import { ProductivityErrorBanner } from "@/components/productivity/productivity-toolbar";
import ProductivityLoading from "@/app/(protected)/productivity/loading";
import { formatRole, sortEmployees } from "@/components/productivity/utils";
import { EmptyState } from "@/components/ui/ux-states";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { ProductivityRealtimeBindings } from "@/components/productivity/productivity-realtime";
import {
  useProductivityDetail,
  useProductivityOverview,
} from "@/lib/hooks/use-productivity";
import type { ActionResult } from "@/types/common";
import type {
  EmployeeJobGroup,
  ProductivityPagePayload,
  ProductivityPeriod,
  ProductivitySortDirection,
  ProductivitySortKey,
  WorkloadLevel,
} from "@/types/productivity";
import {
  DEFAULT_PRODUCTIVITY_SORT,
  isProductivityPeriod,
  PRODUCTIVITY_ROLE_OPTIONS,
  PRODUCTIVITY_SORT_OPTIONS,
  WORKLOAD_FILTER_TABS,
} from "@/types/productivity-constants";

interface ProductivityPageClientProps {
  initialPayload?: ProductivityPagePayload;
  initialPeriod: ProductivityPeriod;
}

export default function ProductivityPageClient({
  initialPayload,
  initialPeriod,
}: ProductivityPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const searchParamPeriod = searchParams.get("period");
  const normalizedSearchPeriod = isProductivityPeriod(searchParamPeriod || undefined)
    ? searchParamPeriod
    : "month";

  const searchQuery = searchParams.get("q") ?? "";
  const [sortKey, setSortKey] = useState<ProductivitySortKey>(DEFAULT_PRODUCTIVITY_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProductivitySortDirection>(DEFAULT_PRODUCTIVITY_SORT.direction);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // ── Filter state (ported from Contract pattern) ──
  const [workloadFilter, setWorkloadFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const period = normalizedSearchPeriod as ProductivityPeriod;

  const initialOverviewResult = useMemo<ActionResult<ProductivityPagePayload> | undefined>(
    () => initialPayload ? {
      success: true,
      data: initialPayload,
    } : undefined,
    [initialPayload],
  );

  const overviewFallback = period === initialPeriod ? initialOverviewResult : undefined;

  const {
    cacheKey: overviewKey,
    result: overviewResult,
    payload,
    error: overviewError,
    mutate: mutateOverview,
  } = useProductivityOverview({
    period,
    viewMode: initialPayload?.viewer?.viewMode || "team",
    fallbackData: overviewFallback,
  });

  const effectivePayload = payload ?? initialPayload;

  const viewer = effectivePayload?.viewer;
  const overview = effectivePayload?.overview;
  const selfEmployee = overview?.employees[0] || null;

  const detailEmployeeId = viewer?.viewMode === "self" ? viewer.currentEmployeeId : selectedEmployeeId;

  const initialDetailResult = useMemo<ActionResult<EmployeeJobGroup[]> | undefined>(
    () =>
      initialPayload?.initialDetail
        ? { success: true, data: initialPayload.initialDetail }
        : undefined,
    [initialPayload],
  );

  const detailFallback =
    viewer?.viewMode === "self" && period === initialPeriod
      ? initialDetailResult
      : undefined;

  const {
    cacheKey: detailKey,
    groups: detailGroups,
    result: detailResult,
    error: detailError,
    isLoading: isDetailLoading,
    mutate: mutateDetail,
  } = useProductivityDetail({
    employeeId: detailEmployeeId || null,
    startDate: overview?.date_range.start || "",
    endDate: overview?.date_range.end || "",
    fallbackData: detailEmployeeId ? detailFallback : undefined,
  });

  const selectedEmployee =
    viewer?.viewMode === "self"
      ? selfEmployee
      : overview?.employees.find(
          (employee) => employee.employee_id === selectedEmployeeId,
        ) || null;
  const isDrawerOpen = viewer?.viewMode === "team" && Boolean(selectedEmployee);

  // ── Workload tabs with counts (Contract tabsWithCounts pattern) ──
  const workloadTabsWithCounts = useMemo(
    () =>
      WORKLOAD_FILTER_TABS.map((tab) => ({
        ...tab,
        count:
          tab.value === "all"
            ? (overview?.employees.length || 0)
            : (overview?.employees.filter((e) => e.workload_level === tab.value).length || 0),
      })),
    [overview?.employees],
  );

  const teamEmployees = useMemo(() => {
    if (!overview?.employees.length) return [];

    const query = searchQuery.trim().toLowerCase();
    const hasQuery = query.length > 0;

    const result = overview.employees.filter((employee) => {
      // Workload filter
      if (workloadFilter !== "all" && employee.workload_level !== workloadFilter) return false;
      
      // Role filter
      if (roleFilter !== "all" && employee.role !== roleFilter) return false;
      
      // Search
      if (hasQuery) {
        const nameMatch = employee.full_name.toLowerCase().includes(query);
        const roleMatch = formatRole(employee.role).toLowerCase().includes(query);
        if (!nameMatch && !roleMatch) return false;
      }
      
      return true;
    });

    return sortEmployees(result, sortKey, sortDirection);
  }, [searchQuery, overview, sortDirection, sortKey, workloadFilter, roleFilter]);

  const overviewErrorMessage = overviewResult && !overviewResult.success
    ? overviewResult.error : overviewError?.message;
  const detailErrorMessage = detailResult && !detailResult.success
    ? detailResult.error : detailError?.message;
  const hasSearch = searchQuery.trim().length > 0;

  if (!effectivePayload || !viewer || !overview) {
    return <ProductivityLoading />;
  }

  function handlePeriodChange(nextPeriod: string) {
    if (!isProductivityPeriod(nextPeriod) || nextPeriod === period) return;
    setSelectedEmployeeId(null);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextPeriod === "month") params.delete("period");
      else params.set("period", nextPeriod);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function handleSortChange(
    nextKey: Extract<ProductivitySortKey, "active_tasks" | "completed_tasks" | "overdue_tasks" | "total_cost">,
  ) {
    if (sortKey === nextKey) {
      setSortDirection((c) => (c === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(nextKey);
      setSortDirection("desc");
    }
  }

  return (
    <>
      <ProductivityRealtimeBindings
        overviewKey={overviewKey}
        detailKey={isDrawerOpen || viewer.viewMode === "self" ? detailKey : null}
      />

      <div className="main-container gap-3!">
        {overviewErrorMessage && (
          <ProductivityErrorBanner
            message={overviewErrorMessage}
            onRetry={() => mutateOverview()}
          />
        )}

        {!viewer.isLinkedEmployee && viewer.viewMode === "self" ? (
          <EmptyState
            icon={Link2Off}
            title="Tài khoản chưa liên kết nhân sự"
            description="Hãy nhờ quản lý liên kết tài khoản này với hồ sơ nhân sự để xem năng suất cá nhân."
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
              <ProductivityStatsBar
                summary={overview.summary}
                viewMode={viewer.viewMode}
              />
            </div>

            {/* ── MOBILE: Workload pills + Period/Sort/Role pills (Contract mobile pattern) ── */}
            {viewer.viewMode === "team" && (
              <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide pb-2 -mb-2">
                <TabsFilter
                  tabs={WORKLOAD_FILTER_TABS as unknown as { label: string; value: string }[]}
                  activeTab={workloadFilter}
                  onChange={setWorkloadFilter}
                  variant="pills"
                />
                <div className="h-5 border-l border-border shrink-0" />
                <SelectPill
                  value={period}
                  onChange={handlePeriodChange}
                  defaultValue="month"
                  placeholder="Thời gian"
                  options={[
                    { value: "week", label: "Tuần này" },
                    { value: "month", label: "Tháng này" },
                    { value: "quarter", label: "Quý này" }
                  ]}
                />
                <SelectPill
                  value={sortKey === "default" ? "default" : `${sortKey.replace("_tasks", "").replace("total_", "")}_desc`}
                  onChange={(v) => {
                    const map: Record<string, ProductivitySortKey> = {
                      default: "default",
                      overdue_desc: "overdue_tasks",
                      hours_desc: "active_tasks",
                      cost_desc: "total_cost",
                    };
                    const key = map[v] || "default";
                    setSortKey(key);
                    if (key !== "default") setSortDirection("desc");
                  }}
                  defaultValue="default"
                  placeholder="Sắp xếp"
                  options={PRODUCTIVITY_SORT_OPTIONS as unknown as { value: string; label: string }[]}
                />
                <SelectPill
                  value={roleFilter}
                  onChange={setRoleFilter}
                  defaultValue="all"
                  placeholder="Vai trò"
                  options={PRODUCTIVITY_ROLE_OPTIONS as unknown as { value: string; label: string }[]}
                />
              </div>
            )}

            {/* ── DESKTOP: Workload tabs + Period/Sort/Role pills (Contract desktop pattern) ── */}
            {viewer.viewMode === "team" && (
              <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
                <TabsFilter
                  tabs={workloadTabsWithCounts}
                  activeTab={workloadFilter}
                  onChange={setWorkloadFilter}
                />
                <div className="flex items-center gap-2">
                  <SelectPill
                    value={period}
                    onChange={handlePeriodChange}
                    defaultValue="month"
                    placeholder="Thời gian"
                    options={[
                      { value: "week", label: "Tuần này" },
                      { value: "month", label: "Tháng này" },
                      { value: "quarter", label: "Quý này" }
                    ]}
                  />
                  <SelectPill
                    value={sortKey === "default" ? "default" : `${sortKey.replace("_tasks", "").replace("total_", "")}_desc`}
                    onChange={(v) => {
                      const map: Record<string, ProductivitySortKey> = {
                        default: "default",
                        overdue_desc: "overdue_tasks",
                        hours_desc: "active_tasks",
                        cost_desc: "total_cost",
                      };
                      const key = map[v] || "default";
                      setSortKey(key);
                      if (key !== "default") setSortDirection("desc");
                    }}
                    defaultValue="default"
                    placeholder="Sắp xếp"
                    options={PRODUCTIVITY_SORT_OPTIONS as unknown as { value: string; label: string }[]}
                  />
                  <SelectPill
                    value={roleFilter}
                    onChange={setRoleFilter}
                    defaultValue="all"
                    placeholder="Vai trò"
                    options={PRODUCTIVITY_ROLE_OPTIONS as unknown as { value: string; label: string }[]}
                  />
                </div>
              </div>
            )}


            {viewer.viewMode === "team" ? (
              <ProductivityTeamView
                employees={teamEmployees}
                allEmployees={overview.employees}
                canViewCost={viewer.canViewCost}
                hasSearch={hasSearch}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                onSelectEmployee={(employee) =>
                  setSelectedEmployeeId(employee.employee_id)
                }
              />
            ) : (
              <ProductivitySelfView
                employee={selfEmployee}
                groups={detailGroups}
                today={overview.date_range.end}
                isLoading={isDetailLoading}
                errorMessage={detailErrorMessage}
                onRetry={() => mutateDetail()}
              />
            )}
          </>
        )}
      </div>

      {viewer.viewMode === "team" && (
        <ProductivityDetailDrawer
          isOpen={isDrawerOpen}
          employee={selectedEmployee}
          groups={detailGroups}
          canViewCost={viewer.canViewCost}
          today={overview.date_range.end}
          isLoading={Boolean(selectedEmployeeId) && isDetailLoading}
          errorMessage={detailErrorMessage}
          onClose={() => setSelectedEmployeeId(null)}
          onRetry={() => mutateDetail()}
        />
      )}
    </>
  );
}
