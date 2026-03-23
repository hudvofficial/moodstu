"use client";

/**
 * 🎯 ContractsListClient — Main client component for contracts list page
 *
 * V2 WIRED: Uses useContracts() SWR hook → Server Actions → Real DB data.
 * No more MOCK data. All filter/sort/pagination handled server-side.
 */

import { useState, Suspense } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SelectPill } from "@/components/ui/select/SelectPill";

import { useContractFilters } from "@/hooks/useContractFilters";
import { useContracts, useContractStats, prefetchContract } from "@/lib/hooks/use-contracts";
import { CompactStats } from "@/components/contracts/compact-stats";
import { ContractsTable } from "@/components/contracts/contracts-table";
import { ContractsDropdownFilters } from "@/components/contracts/contracts-dropdown-filters";
import { ContractDrawer, type ContractListItem } from "@/components/contracts/contract-drawer";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Pagination } from "@/components/ui/pagination";
import DatePicker from "@/components/ui/date-picker";

import {
  SERVICE_TYPE_MAP,
} from "@/types/contract-constants";

// ─── CONSTANTS (V2 snake_case enum values) ───────────

const STATUS_TABS = [
  { label: "Tất cả", value: "all" },
  { label: "Đang thực hiện", value: "dang_thuc_hien" },
  { label: "Chờ xử lý", value: "cho_xu_ly" },
  { label: "Hoàn thành", value: "hoan_thanh" },
  { label: "Đã hủy", value: "da_huy" },
];

/** Mobile pill labels — shorter for pill display */
const STATUS_PILLS = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ xử lý", value: "cho_xu_ly" },
  { label: "Đang làm", value: "dang_thuc_hien" },
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

function ContractsListInner() {
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
  const swrFilters = filters as unknown as import("@/types/contract").ContractFilters;
  const { contracts, total, page, pageSize, isLoading, error } = useContracts(
    swrFilters
  );
  const { stats } = useContractStats();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Build dynamic tab counts from stats
  const tabsWithCounts = STATUS_TABS.map((tab) => {
    if (tab.value === "all") return { ...tab, count: stats?.total };
    if (tab.value === "dang_thuc_hien")
      return { ...tab, count: stats?.active };
    if (tab.value === "cho_xu_ly") return { ...tab, count: stats?.pending };
    if (tab.value === "hoan_thanh")
      return { ...tab, count: stats?.completed };
    return tab;
  });

  // ── Drawer state (0ms Full Inline pattern) ──
  const [selectedContract, setSelectedContract] = useState<ContractListItem | null>(null);
  const isDrawerOpen = selectedContract !== null;

  // Handlers
  const handleView = (contractRecord: Record<string, unknown>) => {
    // Build ContractListItem from Record — ALL data for 0ms drawer
    const item: ContractListItem = {
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
      customers: contractRecord.customers as ContractListItem["customers"] ?? null,
      // Drawer sections (from list query JOINs)
      contract_events: (contractRecord.contract_events as Record<string, unknown>[]) || [],
      contract_checklists: (contractRecord.contract_checklists as Record<string, unknown>[]) || [],
      work_tasks: (contractRecord.work_tasks as Record<string, unknown>[]) || [],
      payment_plans: (contractRecord.payment_plans as Record<string, unknown>[]) || [],
      contract_notes: (contractRecord.contract_notes as ContractListItem["contract_notes"]) || [],
    };
    setSelectedContract(item);
  };
  const handleHover = (id: string) => prefetchContract(id);
  const handleEdit = (id: string) => router.push(`/contracts/${id}/edit`);
  const handleDelete = (id: string) => void id; // Delete handled via drawer lifecycle actions

  const handleApplyDateRange = () => {
    applyDateRange(localStartDate, localEndDate);
  };

  // Build customer map from joined data for ContractsTable
  const customerMap: Record<string, { id: string; full_name: string; phone?: string }> = {};
  for (const c of contracts) {
    const contract = c as Record<string, unknown>;
    const customer = contract.customers as { id: string; full_name: string; phone?: string } | null;
    if (customer && contract.customer_id) {
      customerMap[contract.customer_id as string] = customer;
    }
  }

    return (
    <>
    <div className="main-container gap-3!">
      {/* ── Stats Bar ── */}
      <div className="lg:hidden">
        <CompactStats stats={stats || { total: 0, active: 0, pending: 0, completed: 0, revenue: 0, outstanding: 0, growth: { total: 0, active: 0, pending: 0, completed: 0 } }} />
      </div>
      <div className="hidden lg:flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
        <CompactStats stats={stats || { total: 0, active: 0, pending: 0, completed: 0, revenue: 0, outstanding: 0, growth: { total: 0, active: 0, pending: 0, completed: 0 } }} />
        <button onClick={() => router.push('/contracts/create')} className="btn btn-primary gap-2 shrink-0">
          <Plus className="w-5 h-5" />
          <span>Tạo hợp đồng</span>
        </button>
      </div>

      {/* ── Mobile FAB ── */}
      <div className="lg:hidden fixed bottom-24 right-4 z-40">
        <button onClick={() => router.push('/contracts/create')} className="flex items-center justify-center size-12 rounded-full bg-primary text-text-inverse shadow-lg hover:opacity-90 active:scale-95 transition-all">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE: V1 pill filter bar ── */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setStatus(pill.value)}
            className={`flex h-8 shrink-0 items-center justify-center rounded-md px-4 text-sm font-medium transition-all ${
              filters.status === pill.value
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-border/50"
            }`}
          >
            {pill.label}
          </button>
        ))}


        {/* Service dropdown pill */}
        <SelectPill
          value={filters.service}
          onChange={setService}
          defaultValue="all"
          placeholder="Dịch vụ"
          options={MOBILE_SERVICE_OPTIONS}
        />

        {/* Sort dropdown pill */}
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
        <TabsFilter
          tabs={tabsWithCounts}
          activeTab={filters.status}
          onChange={setStatus}
        />
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
            <button
              onClick={handleApplyDateRange}
              disabled={isPending}
              className="btn btn-primary w-full"
            >
              {isPending ? "Đang áp dụng..." : "Áp dụng bộ lọc"}
            </button>
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
          <p className="error-text">
            Lỗi tải dữ liệu: {error.message}
          </p>
        </div>
      )}

      {/* ── Table / Card List ── */}
      {!isLoading && !error && (
        <>
          <ContractsTable
            contracts={contracts as Record<string, unknown>[]}
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
            Hiển thị {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} của {total} hợp đồng
          </p>
        </>
      )}
    </div>

      {/* ── Contract Drawer ── */}
      <ContractDrawer
        contract={selectedContract}
        isOpen={isDrawerOpen}
        onClose={() => setSelectedContract(null)}
      />
    </>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────

export default function ContractsListClient() {
  return (
    <Suspense>
      <ContractsListInner />
    </Suspense>
  );
}
