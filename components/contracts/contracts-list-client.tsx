"use client";

/**
 * 🎯 ContractsListClient — Main client component for contracts list page
 *
 * V2 WIRED: Uses useContracts() SWR hook → Server Actions → Real DB data.
 * No more MOCK data. All filter/sort/pagination handled server-side.
 */

import {
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { FAB } from "@/components/ui/fab";
import { Button } from "@/components/ui/button";
import { useRealtimeMulti } from "@/hooks/use-realtime-multi";
import type { RealtimeMultiConfig } from "@/hooks/use-realtime-multi";
import type { RealtimePayload } from "@/hooks/use-realtime";
import { ContractsListSkeleton } from "@/components/contracts/contracts-list-skeleton";

import { useContractFilters } from "@/hooks/useContractFilters";
import {
  revalidateContractListCaches,
  updateContractListChecklistCache,
  useContracts,
  useContractStats,
  prefetchContract,
  prefetchContractDetail,
} from "@/lib/hooks/use-contracts";
import { CompactStats } from "@/components/contracts/compact-stats";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { ContractsDropdownFilters } from "@/components/contracts/contracts-dropdown-filters";
import type { ContractListItem } from "@/components/contracts/contract-drawer";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Pagination } from "@/components/ui/pagination";
import DatePicker from "@/components/ui/date-picker";

import { SERVICE_TYPE_MAP } from "@/types/contract-constants";
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
  { label: "Đang thực hiện", value: "dang_thuc_hien" },
  { label: "Chờ xử lý", value: "cho_xu_ly" },
  { label: "Hoàn thành", value: "hoan_thanh" },
  { label: "Đã hủy", value: "da_huy" },
];

const MOBILE_SERVICE_OPTIONS = [
  { value: "all", label: "Dịch vụ" },
  ...Object.entries(SERVICE_TYPE_MAP).map(([value, { label }]) => ({
    value,
    label,
  })),
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

function ContractsListInner({
  initialData,
  initialFilters,
  initialStats,
}: ContractsListClientProps) {
  const router = useRouter();
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
  const swrFilters = filters as unknown as ContractFilters;
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
  const { contracts, total, page, pageSize, isLoading, error } = useContracts(
    swrFilters,
    initialDataForCurrentFilters,
  );
  const { stats, isLoading: statsLoading } = useContractStats(initialStats);
  // 📡 Realtime — auto-refresh on INSERT/UPDATE/DELETE by any user
  const patchChecklistRealtimePayload = useCallback((payload: RealtimePayload) => {
    if (payload.table === "contract_checklists") {
      if (payload.eventType === "UPDATE") {
        const row = payload.new;
        const contractId = typeof row.contract_id === "string" ? row.contract_id : "";
        const checklistId = typeof row.id === "string" ? row.id : "";

        if (contractId && checklistId && typeof row.is_completed === "boolean") {
          updateContractListChecklistCache(contractId, checklistId, row.is_completed);
          return true;
        }
      }
    }

    return false;
  }, []);

  const handleContractRealtime = useCallback((payload: RealtimePayload) => {
    if (patchChecklistRealtimePayload(payload)) return;
    void revalidateContractListCaches();
  }, [patchChecklistRealtimePayload]);

  const handleContractRealtimeBatch = useCallback((payloads: RealtimePayload[]) => {
    let needsRevalidate = false;

    for (const payload of payloads) {
      if (!patchChecklistRealtimePayload(payload)) {
        needsRevalidate = true;
      }
    }

    if (needsRevalidate) {
      void revalidateContractListCaches();
    }
  }, [patchChecklistRealtimePayload]);

  const realtimeConfigs = useMemo<RealtimeMultiConfig[]>(
    () => [
      { table: "contracts" },
      { table: "contract_notes" },
      { table: "contract_events" },
      { table: "contract_checklists", eventTypes: ["INSERT", "UPDATE", "DELETE"] },
      { table: "work_tasks" },
      { table: "payment_plans" },
    ],
    [],
  );

  useRealtimeMulti(realtimeConfigs, {
    channelName: "contracts-list",
    onChange: handleContractRealtime,
    onBatchChange: handleContractRealtimeBatch,
    debounceMs: REALTIME_REFRESH_DELAY_MS,
  });

  const displayStats = stats ?? DEFAULT_STATS;
  const showInitialSkeleton =
    (isLoading && contracts.length === 0) ||
    (statsLoading && !stats && contracts.length === 0);
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
        prefetchContract(id);
        prefetchContractDetail(id);
        router.prefetch(`/contracts/${id}`);
        router.prefetch(`/contracts/${id}/edit`);
      }

      // Build ContractListItem from Record — drawer sections lazy-loaded by useContractDrawerExtra
      setSelectedContractFallback(toContractListItem(contractRecord));
      setSelectedContractId(id);
    },
    [router],
  );

  const handleHover = useCallback(
    (id: string) => {
      if (!id) return;
      prefetchContract(id);
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

  // Build customer map from joined data for ContractsTable
  const customerMap = useMemo(() => {
    const map: Record<
      string,
      { id: string; full_name: string; phone?: string }
    > = {};
    for (const c of contracts) {
      const contract = c;
      const customer = contract.customers as {
        id: string;
        full_name: string;
        phone?: string;
      } | null;
      if (customer && contract.customer_id) {
        map[contract.customer_id as string] = customer;
      }
    }
    return map;
  }, [contracts]);

  if (showInitialSkeleton) {
    return <ContractsListSkeleton />;
  }

  return (
    <>
      <div className="main-container gap-3!">
        {/* ── Stats + Action (unified container — same pattern as employees) ── */}
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <CompactStats stats={displayStats} />
          <div className="hidden lg:flex">
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

        <FAB
          onClick={() => router.push("/contracts/create")}
          label="Tạo hợp đồng"
        />

        {/* ── MOBILE: Status pills + Dropdowns (1 hàng cuộn ngang) ── */}
        <div className="lg:hidden flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
          <TabsFilter
            tabs={STATUS_TABS}
            activeTab={filters.status}
            onChange={setStatus}
            variant="pills"
          />
          {/* Separator */}
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

        {/* ── DESKTOP: Tabs + Dropdowns ── */}
        <div className="hidden lg:flex lg:items-center lg:justify-between gap-3">
          <div className="min-w-0 flex-1">
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

        {/* ── Advanced Filters Panel ── */}
        {filters.advanced && (
          <div className="hidden lg:grid w-full p-4 bg-surface rounded-md grid-cols-4 gap-4 shadow-sm">
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

        {/* ── Loading State ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-2 text-sm text-text-secondary">
              Đang tải dữ liệu...
            </span>
          </div>
        )}

        {/* ── Error State ── */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-16">
            <p className="error-text">Lỗi tải dữ liệu: {error.message}</p>
          </div>
        )}

        {/* ── Table / Card List ── */}
        {!isLoading && !error && (
          <>
            <ContractsTable
              contracts={contracts}
              customerMap={customerMap}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onHover={handleHover}
            />

            {/* ── Pagination ── */}
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              className="mt-6"
            />

            {/* ── Footer Count ── */}
            <p className="text-center text-xs text-text-muted mt-3">
              Hiển thị {visibleStart}–{visibleEnd} của {total} hợp đồng
            </p>
          </>
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
}

// ─── MAIN EXPORT ─────────────────────────────────

export default function ContractsListClient(props: ContractsListClientProps) {
  return (
    <Suspense>
      <ContractsListInner {...props} />
    </Suspense>
  );
}
