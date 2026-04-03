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
import { ProductivityErrorBanner, ProductivityPeriodControl } from "@/components/productivity/productivity-toolbar";
import { formatRole, sortEmployees } from "@/components/productivity/utils";
import { EmptyState } from "@/components/ui/ux-states";
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
} from "@/types/productivity";
import {
  DEFAULT_PRODUCTIVITY_SORT,
  isProductivityPeriod,
} from "@/types/productivity-constants";

interface ProductivityPageClientProps {
  initialPayload: ProductivityPagePayload;
  initialPeriod: ProductivityPeriod;
}

export default function ProductivityPageClient({
  initialPayload,
  initialPeriod,
}: ProductivityPageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const searchParamPeriod = searchParams.get("period");
  const normalizedSearchPeriod = isProductivityPeriod(searchParamPeriod || undefined)
    ? searchParamPeriod
    : "month";

  const searchQuery = searchParams.get("q") ?? "";
  const [sortKey, setSortKey] = useState<ProductivitySortKey>(DEFAULT_PRODUCTIVITY_SORT.key);
  const [sortDirection, setSortDirection] = useState<ProductivitySortDirection>(DEFAULT_PRODUCTIVITY_SORT.direction);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const period = normalizedSearchPeriod as ProductivityPeriod;

  const initialOverviewResult = useMemo<ActionResult<ProductivityPagePayload>>(
    () => ({
      success: true,
      data: initialPayload,
    }),
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
    viewMode: initialPayload.viewer.viewMode,
    fallbackData: overviewFallback,
  });

  const effectivePayload = payload ?? initialPayload;
  const viewer = effectivePayload.viewer;
  const overview = effectivePayload.overview;
  const selfEmployee = overview.employees[0] || null;

  const detailEmployeeId = viewer.viewMode === "self" ? viewer.currentEmployeeId : selectedEmployeeId;

  const initialDetailResult = useMemo<ActionResult<EmployeeJobGroup[]> | undefined>(
    () =>
      initialPayload.initialDetail
        ? { success: true, data: initialPayload.initialDetail }
        : undefined,
    [initialPayload.initialDetail],
  );

  const detailFallback =
    viewer.viewMode === "self" && period === initialPeriod
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
    employeeId: detailEmployeeId,
    startDate: overview.date_range.start,
    endDate: overview.date_range.end,
    fallbackData: detailEmployeeId ? detailFallback : undefined,
  });

  const selectedEmployee =
    viewer.viewMode === "self"
      ? selfEmployee
      : overview.employees.find(
          (employee) => employee.employee_id === selectedEmployeeId,
        ) || null;
  const isDrawerOpen = viewer.viewMode === "team" && Boolean(selectedEmployee);

  const teamEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = query
      ? overview.employees.filter((employee) => {
          const name = employee.full_name.toLowerCase();
          const roleLabel = formatRole(employee.role).toLowerCase();
          return name.includes(query) || roleLabel.includes(query);
        })
      : overview.employees;

    return sortEmployees(filtered, sortKey, sortDirection);
  }, [searchQuery, overview.employees, sortDirection, sortKey]);

  const overviewErrorMessage = overviewResult && !overviewResult.success
    ? overviewResult.error : overviewError?.message;
  const detailErrorMessage = detailResult && !detailResult.success
    ? detailResult.error : detailError?.message;
  const hasSearch = searchQuery.trim().length > 0;

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
            <div className="card-base flex items-center justify-between gap-4 px-5 py-3">
              <ProductivityStatsBar
                summary={overview.summary}
                viewMode={viewer.viewMode}
              />
            </div>

            <ProductivityPeriodControl
              period={period}
              dateRange={overview.date_range}
              isPending={isPending}
              onChange={handlePeriodChange}
            />

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
