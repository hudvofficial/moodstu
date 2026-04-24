"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { FilterX, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/ux-states";
import { FAB } from "@/components/ui/fab";
import { Pagination } from "@/components/ui/pagination";
import { getLabOptions } from "@/app/actions/lab-queries";
import { updatePrintingOrderStatus } from "@/app/actions/printing-mutations";
import {
  fetchPrintingOrders,
  getPrintingOrderStats,
} from "@/app/actions/printing-queries";
import { usePrintingFilters } from "@/hooks/usePrintingFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { cacheKeys } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import type {
  LabOption,
  PrintingFilters as PrintingFiltersType,
  PrintingOrderRow,
  PrintingOrdersPage,
  PrintingStats,
} from "@/types/printing";
import PrintingFiltersBar from "@/components/printing/printing-filters";
import PrintingDetailDrawer from "@/components/printing/printing-detail-drawer";
import PrintingMobileGrouped from "@/components/printing/printing-mobile-grouped";
import PrintingStatsBar from "@/components/printing/printing-stats-bar";
import PrintingTable from "@/components/printing/printing-table";
import PrintingGroupDrawer from "@/components/printing/printing-group-drawer";
import { groupOrdersByContract, type ContractGroup } from "@/lib/utils/printing-group-utils";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface Props {
  initialOrdersPage: PrintingOrdersPage;
  initialStats: PrintingStats;
  initialLabOptions: LabOption[];
}

function PrintingListInner({
  initialOrdersPage,
  initialStats,
  initialLabOptions,
}: Props) {
  const isMobile = useIsMobile();
  const [editingOrder, setEditingOrder] = useState<PrintingOrderRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedContractGroup, setSelectedContractGroup] = useState<ContractGroup | null>(null);
  const {
    filters,
    setStatus,
    setLabId,
    setPaymentStatus,
    setPage,
    resetParams,
    hasActiveFilters,
  } = usePrintingFilters();

  const swrFilters = useMemo<PrintingFiltersType>(
    () => ({
      status: filters.status as PrintingFiltersType["status"],
      search: filters.search || undefined,
      labId: filters.labId as PrintingFiltersType["labId"],
      paymentStatus: filters.paymentStatus as PrintingFiltersType["paymentStatus"],
      page: filters.page,
    }),
    [filters],
  );

  const {
    data: ordersResult,
    isLoading,
    mutate: mutateOrders,
  } = useSWR<ActionResult<PrintingOrdersPage>>(
    [cacheKeys.printingOrders(), swrFilters],
    () => fetchPrintingOrders(swrFilters),
    {
      fallbackData: { success: true, data: initialOrdersPage },
      keepPreviousData: true,
      revalidateOnMount: false,
    },
  );

  const { data: statsResult, mutate: mutateStats } = useSWR<ActionResult<PrintingStats>>(
    cacheKeys.printingStats(),
    () => getPrintingOrderStats(),
    {
      fallbackData: { success: true, data: initialStats },
      keepPreviousData: true,
      revalidateOnMount: false,
    },
  );

  const { data: labsResult, mutate: mutateLabs } = useSWR<ActionResult<LabOption[]>>(
    [cacheKeys.labs(), "options"],
    () => getLabOptions(),
    {
      fallbackData: { success: true, data: initialLabOptions },
      keepPreviousData: true,
      revalidateOnMount: false,
    },
  );

  const ordersPage = ordersResult?.success ? ordersResult.data : initialOrdersPage;
  const stats = statsResult?.success ? statsResult.data : initialStats;
  const labOptions = labsResult?.success ? labsResult.data : initialLabOptions;
  const totalPages = Math.max(
    1,
    Math.ceil(ordersPage.total / Math.max(ordersPage.pageSize, 1)),
  );

  // ── Contract Grouping (client-side) ────────
  const contractGroups = useMemo(
    () => groupOrdersByContract(ordersPage.orders),
    [ordersPage.orders],
  );

  const handleSaved = async () => {
    await Promise.all([mutateOrders(), mutateStats(), mutateLabs()]);
  };

  const handleStatusChange = async (
    order: PrintingOrderRow,
    newStatus: string,
  ) => {
    if (!order.contractId) {
      toast("Đơn in này không có hợp đồng để cập nhật", "error");
      return;
    }

    const result = await updatePrintingOrderStatus(
      order.id,
      newStatus,
      order.contractId,
    );

    if (!result.success) {
      toast(result.error, "error");
      return;
    }

    toast("Cập nhật trạng thái thành công", "success");
    await handleSaved();
    await revalidateContractCaches(order.contractId);
  };



  return (
    <>
      <div className="main-container gap-3!">
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <PrintingStatsBar stats={stats} compact={isMobile} />

          <div className="hidden lg:flex items-center gap-2">
            <Link href="/printing/labs" className="btn btn-outline">
              Quản lý labs
            </Link>
            <Button
              className="gap-2"
              onClick={() => {
                setEditingOrder(null);
                setShowForm(true);
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Tạo đơn in</span>
            </Button>
          </div>
        </div>

        <FAB
          onClick={() => {
            setEditingOrder(null);
            setShowForm(true);
          }}
          label="Tạo đơn in"
        />

        <PrintingFiltersBar
          stats={stats}
          labs={labOptions}
          status={filters.status}
          labId={filters.labId}
          paymentStatus={filters.paymentStatus}
          onStatusChange={setStatus}
          onLabChange={setLabId}
          onPaymentStatusChange={setPaymentStatus}
        />

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-20 bg-surface rounded-xl animate-pulse" />
            ))}
          </div>
        ) : ordersPage.orders.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              icon={FilterX}
              title="Không tìm thấy đơn in"
              description="Không có đơn in nào phù hợp với bộ lọc hiện tại."
              actionLabel="Xóa bộ lọc"
              onAction={resetParams}
            />
          ) : (
            <EmptyState
              icon={Printer}
              title="Chưa có đơn in"
              description="Bắt đầu bằng cách tạo đơn in đầu tiên cho studio."
              actionLabel="Tạo đơn in"
              onAction={() => {
                setEditingOrder(null);
                setShowForm(true);
              }}
            />
          )
        ) : isMobile ? (
          <PrintingMobileGrouped
            groups={contractGroups}
            onViewGroup={setSelectedContractGroup}
          />
        ) : (
          <PrintingTable
            orders={ordersPage.orders}
            groups={contractGroups}
            onViewGroup={setSelectedContractGroup}
            onEdit={(selectedOrder) => {
              setEditingOrder(selectedOrder);
              setShowForm(true);
            }}
            onStatusChange={handleStatusChange}
          />
        )}

        {ordersPage.orders.length > 0 && (
          <>
            <Pagination
              page={filters.page}
              totalPages={totalPages}
              onChange={setPage}
              className="mt-2"
            />
            <p className="text-center text-xs text-text-muted mt-1">
              Hiển thị {(filters.page - 1) * ordersPage.pageSize + 1}-
              {Math.min(filters.page * ordersPage.pageSize, ordersPage.total)} của{" "}
              {ordersPage.total} đơn in
            </p>
          </>
        )}
      </div>

      <PrintingDetailDrawer
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingOrder(null);
        }}
        order={editingOrder}
        labs={labOptions}
        onSaved={handleSaved}
        onStatusChange={handleStatusChange}
      />

      <PrintingGroupDrawer
        isOpen={!!selectedContractGroup}
        onClose={() => setSelectedContractGroup(null)}
        group={selectedContractGroup}
        onEdit={(selectedOrder) => {
          setEditingOrder(selectedOrder);
          setShowForm(true);
        }}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

export default function PrintingListPage(props: Props) {
  return (
    <Suspense>
      <PrintingListInner {...props} />
    </Suspense>
  );
}
