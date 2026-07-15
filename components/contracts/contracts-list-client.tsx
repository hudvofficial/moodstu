"use client";

/**
 * 🎯 ContractsListClient — Main client component for contracts list page
 *
 * V2 WIRED: Uses useContracts() SWR hook → Server Actions → Real DB data.
 * No more MOCK data. All filter/sort/pagination handled server-side.
 */

import {
  memo,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePullToRefreshCallback } from "@/contexts/pull-to-refresh-context";
import dynamic from "next/dynamic";
import { Loader2, Plus, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";
import type { RealtimeMultiConfig } from "@/hooks/use-realtime-multi";
import { realtimeSignalConfig } from "@/hooks/use-realtime-signal";
import type { RealtimePayload } from "@/hooks/use-realtime";
import { ContractsListSkeleton } from "@/components/contracts/contracts-list-skeleton";

import { useContractFilters } from "@/hooks/useContractFilters";
import { useQueryClient } from "@tanstack/react-query";
import {
  useContracts,
  useContractStats,
  prefetchContract,
  revalidateContractListCaches,
  isRecentChecklistSelfMutation,
} from "@/lib/hooks/use-contract-queries";
import { preload } from "swr";
import { fetchContractNotesClient } from "@/lib/client-direct/contract-drawer";
import { CompactStats } from "@/components/contracts/compact-stats";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { ContractsDropdownFilters } from "@/components/contracts/contracts-dropdown-filters";
import type { ContractListItem } from "@/components/contracts/contract-drawer";
import { TierSwitch } from "@/components/ui/tier-switch";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Pagination } from "@/components/ui/pagination";
import DatePicker from "@/components/ui/date-picker";

import { CONTRACT_STATUS_MAP, CONTRACT_STATUS_ORDER, SERVICE_TYPE_MAP } from "@/types/contract-constants";
import type { ContractFilters, ContractStats, Contract } from "@/types/contract";

const ContractDrawer = dynamic(
  () =>
    import("@/components/contracts/contract-drawer").then(
      (mod) => mod.ContractDrawer,
    ),
  { ssr: false, loading: () => null },
);

const REALTIME_REFRESH_DELAY_MS = 600;
const DEFAULT_STATS: ContractStats = {
  total: 0,
  active: 0,
  pending: 0,
  completed: 0,
  revenue: 0,
  outstanding: 0,
  growth: { total: 0, active: 0, pending: 0, completed: 0 },
};

// ─── CONSTANTS (V2 snake_case enum values) ───────────

const STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  ...CONTRACT_STATUS_ORDER.map((value) => ({
    label: CONTRACT_STATUS_MAP[value].label,
    value,
  })),
];

const MOBILE_SERVICE_OPTIONS = [
  { value: "all", label: "Dịch vụ" },
  ...Object.entries(SERVICE_TYPE_MAP).map(([value, { label }]) => ({
    value,
    label,
  })),
];

const TABLET_TIME_OPTIONS = [
  { value: "all", label: "Tháng" },
  { value: "this_month", label: "Tháng này" },
  { value: "last_month", label: "Tháng trước" },
  { value: "this_year", label: "Năm nay" },
];

const MOBILE_SORT_OPTIONS = [
  { value: "newest", label: "Sắp xếp" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "amount_desc", label: "Giá cao" },
  { value: "amount_asc", label: "Giá thấp" },
];

// ─── INNER COMPONENT ─────────────────────────────────

interface ContractsInitialData {
  contracts: Contract[];
  total: number;
  page: number;
  pageSize: number;
}

interface ContractsListClientProps {
  initialData?: ContractsInitialData;
  initialFilters?: ContractFilters;
  initialStats?: ContractStats;
}

function toContractListItem(contractRecord: Contract): ContractListItem {
  return {
    id: (contractRecord.id as string) || "",
    contract_code: (contractRecord.contract_code as string) || null,
    status: (contractRecord.status as ContractListItem["status"]) || null,
    service_type: (contractRecord.service_type as string) || null,
    work_date: (contractRecord.work_date as string) || null,
    contract_date: (contractRecord.contract_date as string) || null,
    total_amount: Number(contractRecord.total_amount) || 0,
    paid_amount: Number(contractRecord.paid_amount) || 0,
    remaining_amount: Number(contractRecord.remaining_amount) || 0,
    customer_id: (contractRecord.customer_id as string) || null,
    customers:
      (contractRecord.customers as ContractListItem["customers"]) ?? null,
    contract_events:
      (contractRecord.contract_events as ContractListItem["contract_events"]) ?? undefined,
    contract_checklists:
      (contractRecord.contract_checklists as ContractListItem["contract_checklists"]) ?? undefined,
    work_tasks:
      (contractRecord.work_tasks as ContractListItem["work_tasks"]) ?? undefined,
    payment_plans:
      ((contractRecord as any).payment_plans as ContractListItem["payment_plans"]) ?? undefined,
    contract_notes:
      ((contractRecord as any).contract_notes as ContractListItem["contract_notes"]) ?? undefined,
  };
}

const ContractsListInner = memo(function ContractsListInner({
  initialData,
  initialFilters,
  initialStats,
}: ContractsListClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    filters,
    isPending,
    setStatus,
    setTime,
    setService,
    setSort,
    toggleAdvanced,
    applyDateRange,
    setPage,
  } = useContractFilters();

  // Local state for advanced date pickers
  const [localStartDate, setLocalStartDate] = useState(filters.startDate);
  const [localEndDate, setLocalEndDate] = useState(filters.endDate);

  // ── SWR: Real data from Server Actions ──
  // Cast: ContractFilterState uses `string`, ContractFilters uses typed enums
  const deferredFilters = useDeferredValue(filters);
  const swrFilters = deferredFilters as unknown as ContractFilters;
  const initialFiltersKey = useMemo(
    () => initialFilters ? JSON.stringify(initialFilters) : null,
    [initialFilters],
  );
  const currentFiltersKey = useMemo(
    () => JSON.stringify(swrFilters),
    [swrFilters],
  );
  const initialDataForCurrentFilters =
    initialFiltersKey === currentFiltersKey ? initialData : undefined;
  const { contracts, total, page, pageSize, isLoading, isFetching, error } = useContracts(
    swrFilters,
    initialDataForCurrentFilters,
  );
  const { stats, isLoading: statsLoading } = useContractStats(initialStats);

  // Pull-to-refresh callback
  usePullToRefreshCallback(async () => {
    await revalidateContractListCaches(queryClient);
  }, [queryClient]);

  // 📡 Realtime — auto-refresh on INSERT/UPDATE/DELETE by any user
  const checklistReconcileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (checklistReconcileTimerRef.current) clearTimeout(checklistReconcileTimerRef.current);
  }, []);

  const handleContractRealtime = useCallback((payload?: RealtimePayload) => {
    // Signal (pattern Signal ≠ Data) KHÔNG mang row data → không thể patch từ payload.
    // Tick checklist của CHÍNH MÌNH đã sync đủ (optimistic patch + server confirm) —
    // echo dội về không refetch NGAY (bảng đứng im). Nhưng vẫn hẹn 1 lần reconcile
    // IM LẶNG sau khi cửa sổ khép: nếu người khác sửa TRÙNG cửa sổ thì data thật về;
    // data không đổi thì structural sharing của React Query giữ reference → không re-render.
    // (staleTime contracts = 30' nên không thể trông chờ refetch-on-focus.)
    if (payload?.table === "contract_checklists" && isRecentChecklistSelfMutation()) {
      if (checklistReconcileTimerRef.current) clearTimeout(checklistReconcileTimerRef.current);
      checklistReconcileTimerRef.current = setTimeout(() => {
        checklistReconcileTimerRef.current = null;
        void revalidateContractListCaches(queryClient);
      }, 3500);
      return;
    }
    void revalidateContractListCaches(queryClient);
  }, [queryClient]);

  const realtimeConfigs = useMemo<RealtimeMultiConfig[]>(
    () => [
      realtimeSignalConfig("contracts"),
      realtimeSignalConfig("customers"),
      realtimeSignalConfig("contract_events"),
      realtimeSignalConfig("contract_checklists"),
    ],
    [],
  );

  useRealtimeMulti(realtimeConfigs, {
    channelName: "contracts-list",
    onChange: handleContractRealtime,
    debounceMs: REALTIME_REFRESH_DELAY_MS,
  });

  const displayStats = stats ?? DEFAULT_STATS;
  // Chỉ hiện skeleton toàn trang khi ĐANG tải list hợp đồng LẦN ĐẦU
  // Không bao giờ bắt người dùng chờ Stats (statsLoading)
  const showInitialSkeleton = isLoading && contracts.length === 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd = total === 0 ? 0 : Math.min(page * pageSize, total);

  // Build dynamic tab counts from stats
  const tabsWithCounts = useMemo(
    () =>
      STATUS_TABS.map((tab) => {
        if (tab.value === "all") return { ...tab, count: displayStats.total };
        if (tab.value === "dang_thuc_hien") {
          return { ...tab, count: displayStats.active };
        }
        if (tab.value === "cho_xu_ly")
          return { ...tab, count: displayStats.pending };
        if (tab.value === "hoan_thanh")
          return { ...tab, count: displayStats.completed };
        return tab;
      }),
    [displayStats],
  );

  // ── Drawer state (0ms Full Inline pattern) ──
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedContractFallback, setSelectedContractFallback] =
    useState<ContractListItem | null>(null);
  const selectedContract = useMemo(() => {
    if (!selectedContractId) return null;

    const currentRecord = contracts.find(
      (contract) => contract.id === selectedContractId,
    );

    return currentRecord ? toContractListItem(currentRecord) : selectedContractFallback;
  }, [contracts, selectedContractFallback, selectedContractId]);
  const isDrawerOpen = selectedContractId !== null && selectedContract !== null;

  // Handlers
  const handleView = useCallback(
    (contractRecord: Contract) => {
      const id = (contractRecord.id as string) || "";
      if (id) {
        router.prefetch(`/contracts/${id}`);
        router.prefetch(`/contracts/${id}/edit`);
      }

      // Drawer-specific data is warmed on intent; full detail waits until the user
      // actually opens the detail route to avoid four parallel requests per row.
      prefetchContract(queryClient, id);
      void preload(["contract-notes", id], () => fetchContractNotesClient(id));

      // Build ContractListItem from Record — drawer sections lazy-loaded by useContractDrawerExtra
      setSelectedContractFallback(toContractListItem(contractRecord));
      setSelectedContractId(id);
    },
    [queryClient, router],
  );

  const handleHover = useCallback(
    (id: string) => {
      if (!id) return;
      router.prefetch(`/contracts/${id}`);
    },
    [router],
  );

  const handleEdit = useCallback(
    (id: string) => {
      if (!id) return;
      router.prefetch(`/contracts/${id}/edit`);
      router.push(`/contracts/${id}/edit`);
    },
    [router],
  );

  const handleDelete = useCallback((id: string) => void id, []); // Delete handled via drawer lifecycle actions

  const handleApplyDateRange = useCallback(() => {
    applyDateRange(localStartDate, localEndDate);
  }, [applyDateRange, localEndDate, localStartDate]);

  if (showInitialSkeleton) {
    return <ContractsListSkeleton />;
  }

  return (
    <>
      <div className="main-container gap-3! lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* ── Stats + Action (unified container — same pattern as employees) ── */}
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <CompactStats stats={displayStats} />
          <div className="hidden md:flex">
            <Button
              unstyled
              onPointerEnter={() => router.prefetch("/contracts/create")}
              onFocus={() => router.prefetch("/contracts/create")}
              onClick={() => router.push("/contracts/create")}
              className="btn btn-primary gap-2 shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Tạo hợp đồng</span>
            </Button>
          </div>
        </div>

        {/* FAB chỉ phone (<768): tablet đã có nút "Tạo hợp đồng" ở trên → tránh nút đôi */}
        <FAB
          onClick={() => router.push("/contracts/create")}
          label="Tạo hợp đồng"
          wrapperClassName="md:hidden"
        />

        {/* ── Filter bar: phone pills vs tablet+desktop tabs ── */}
        <TierSwitch
          phone={
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
              <TabsFilter
                tabs={STATUS_TABS}
                activeTab={filters.status}
                onChange={setStatus}
                variant="pills"
              />
              <div className="h-5 border-l border-border shrink-0" />
              <SelectPill
                value={filters.service}
                onChange={setService}
                defaultValue="all"
                placeholder="Dịch vụ"
                options={MOBILE_SERVICE_OPTIONS}
              />
              <SelectPill
                value={filters.sort}
                onChange={setSort}
                defaultValue="newest"
                placeholder="Sắp xếp"
                options={MOBILE_SORT_OPTIONS}
              />
            </div>
          }
          tablet={
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
              <TabsFilter
                tabs={tabsWithCounts}
                activeTab={filters.status}
                onChange={setStatus}
                variant="pills"
              />
              <div className="h-5 border-l border-border shrink-0" />
              <SelectPill
                value={filters.time}
                onChange={setTime}
                defaultValue="all"
                placeholder="Tháng"
                options={TABLET_TIME_OPTIONS}
              />
              <SelectPill
                value={filters.service}
                onChange={setService}
                defaultValue="all"
                placeholder="Dịch vụ"
                options={MOBILE_SERVICE_OPTIONS}
              />
              <SelectPill
                value={filters.sort}
                onChange={setSort}
                defaultValue="newest"
                placeholder="Sắp xếp"
                options={MOBILE_SORT_OPTIONS}
              />
              <Button
                unstyled
                onClick={toggleAdvanced}
                aria-label="Lọc nâng cao"
                className={`flex size-9 shrink-0 items-center justify-center rounded-md transition-colors ${
                  filters.advanced
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-primary bg-primary/5 hover:bg-primary/10 shadow-xs"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>
          }
          desktop={
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 overflow-hidden">
                <TabsFilter
                  tabs={tabsWithCounts}
                  activeTab={filters.status}
                  onChange={setStatus}
                />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ContractsDropdownFilters
                  time={filters.time}
                  service={filters.service}
                  sort={filters.sort}
                  onTimeChange={setTime}
                  onServiceChange={setService}
                  onSortChange={setSort}
                  onToggleAdvanced={toggleAdvanced}
                  isAdvancedOpen={filters.advanced}
                />
              </div>
            </div>
          }
        />

        {/* ── Advanced Filters Panel ── */}
        {filters.advanced && (
          <div className="hidden md:grid w-full p-4 bg-surface rounded-md grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
            <DatePicker
              label="Từ ngày"
              value={localStartDate}
              onChange={(date) => setLocalStartDate(date)}
            />
            <DatePicker
              label="Đến ngày"
              value={localEndDate}
              onChange={(date) => setLocalEndDate(date)}
            />
            <div className="flex items-end">
              <Button
                unstyled
                onClick={handleApplyDateRange}
                disabled={isPending}
                className="btn btn-primary w-full"
              >
                {isPending ? "Đang áp dụng..." : "Áp dụng bộ lọc"}
              </Button>
            </div>
          </div>
        )}

        {/* ── Error State ── */}
        {error && contracts.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="error-text">Lỗi tải dữ liệu: {error.message}</p>
          </div>
        )}

        {/* ── Table / Card List ── */}
        {!error && (
          <div
            className={
              isFetching
                ? "opacity-50 pointer-events-none transition-opacity duration-200 lg:flex lg:flex-1 lg:min-h-0 lg:flex-col"
                : "transition-opacity duration-200 lg:flex lg:flex-1 lg:min-h-0 lg:flex-col"
            }
          >
            <ContractsTable
              contracts={contracts}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onHover={handleHover}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={total}
              visibleStart={visibleStart}
              visibleEnd={visibleEnd}
            />

            {/* ── Mobile-Only Pagination + Footer (rời rạc, vì mobile dùng card base) ── */}
            <div className="mt-2 flex shrink-0 items-center justify-between gap-3 px-1 text-xs h-9 md:hidden">
              <p className="text-xs text-text-muted md:text-sm">
                <span className="font-semibold italic text-primary">{visibleStart}-{visibleEnd}</span>
                <span className="text-text-muted"> / {total} hợp đồng</span>
              </p>
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                compact
                variant="footer"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Contract Drawer ── */}
      <ContractDrawer
        contract={selectedContract}
        isOpen={isDrawerOpen}
        onClose={() => {
          setSelectedContractId(null);
          setSelectedContractFallback(null);
        }}
      />
    </>
  );
});

// ─── MAIN EXPORT ─────────────────────────────────

export default function ContractsListClient(props: ContractsListClientProps) {
  return (
    <Suspense>
      <ContractsListInner {...props} />
    </Suspense>
  );
}
