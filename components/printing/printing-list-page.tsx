"use client";

import React, { Suspense, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import useSWR from "swr";
import { FilterX, Plus, Printer, List, Layers } from "lucide-react";
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
import { invalidateContractAfterWrite } from "@/lib/cache-invalidation";
import { runOptimisticMutation } from "@/lib/optimistic-mutation";
import { cacheKeys } from "@/lib/swr";
import { toast } from "@/lib/toast-utils";
import type {
  LabOption,
  PrintingFilters as PrintingFiltersType,
  PrintingOrderRow,
  PrintingOrdersPage,
  PrintingStats,
} from "@/types/printing";
import type { PrintingOrderStatus } from "@/types/printing-constants";
import PrintingFiltersBar from "@/components/printing/printing-filters";
import PrintingMobileGrouped from "@/components/printing/printing-mobile-grouped";
import PrintingStatsBar from "@/components/printing/printing-stats-bar";
import PrintingTable from "@/components/printing/printing-table";
import PrintingGroupDrawer from "@/components/printing/printing-group-drawer";
import PrintingCard from "@/components/printing/printing-card";
import { groupOrdersByContract, type ContractGroup } from "@/lib/utils/printing-group-utils";

const PrintingDetailDrawer = dynamic(
  () => import("@/components/printing/printing-detail-drawer"),
  { ssr: false },
);

// T-20260824-lab-payment-entry-points: mở trực tiếp từ 1 đơn, không qua PrintingDetailDrawer.
const LabPaymentModal = dynamic(
  () =>
    import("@/components/printing/labs/lab-payment-modal").then((m) => ({
      default: m.LabPaymentModal,
    })),
  { ssr: false },
);

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

interface Props {
  initialOrdersPage?: PrintingOrdersPage;
  initialStats?: PrintingStats;
  initialLabOptions?: LabOption[];
}

const EMPTY_ORDERS_PAGE: PrintingOrdersPage = {
  orders: [],
  total: 0,
  page: 1,
  pageSize: 15,
};

const EMPTY_STATS: PrintingStats = {
  total: 0,
  choXuLy: 0,
  dangIn: 0,
  daIn: 0,
  hoanThanh: 0,
  huyDon: 0,
  totalCost: 0,
  unpaidCost: 0,
};

function PrintingListInner({
  initialOrdersPage,
  initialStats,
  initialLabOptions,
}: Props) {
  const isMobile = useIsMobile();
  const [editingOrder, setEditingOrder] = useState<PrintingOrderRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedContractGroup, setSelectedContractGroup] = useState<ContractGroup | null>(null);
  const [payingOrder, setPayingOrder] = useState<PrintingOrderRow | null>(null);

  const handleEdit = useCallback((selectedOrder: PrintingOrderRow) => {
    setEditingOrder(selectedOrder);
    setShowForm(true);
  }, []);

  const handlePayLab = useCallback((order: PrintingOrderRow) => {
    setPayingOrder(order);
  }, []);
  
  const [userGroupPreference, setUserGroupPreference] = useState(true);
  
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
      ...(initialOrdersPage ? { fallbackData: { success: true, data: initialOrdersPage } } : {}),
      keepPreviousData: true,
      revalidateOnMount: !initialOrdersPage,
    },
  );

  const { data: statsResult, mutate: mutateStats } = useSWR<ActionResult<PrintingStats>>(
    cacheKeys.printingStats(),
    () => getPrintingOrderStats(),
    {
      ...(initialStats ? { fallbackData: { success: true, data: initialStats } } : {}),
      keepPreviousData: true,
      revalidateOnMount: !initialStats,
    },
  );

  const { data: labsResult, mutate: mutateLabs } = useSWR<ActionResult<LabOption[]>>(
    [cacheKeys.labs(), "options"],
    () => getLabOptions(),
    {
      ...(initialLabOptions ? { fallbackData: { success: true, data: initialLabOptions } } : {}),
      keepPreviousData: true,
      revalidateOnMount: !initialLabOptions,
    },
  );

  const ordersPage = ordersResult?.success ? ordersResult.data : (initialOrdersPage || EMPTY_ORDERS_PAGE);
  const stats = statsResult?.success ? statsResult.data : (initialStats || EMPTY_STATS);
  const labOptions = labsResult?.success ? labsResult.data : (initialLabOptions || []);
  const totalPages = Math.max(
    1,
    Math.ceil(ordersPage.total / Math.max(ordersPage.pageSize, 1)),
  );

  const contractGroups = useMemo(
    () => groupOrdersByContract(ordersPage.orders),
    [ordersPage.orders],
  );

  const isGroupedView = hasActiveFilters ? false : userGroupPreference;

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
    const contractId = order.contractId;
    const nextStatus = newStatus as PrintingOrderStatus;

    const patchOrderStatus = (status: PrintingOrderStatus) => {
      void mutateOrders((current) => {
        if (!current?.success) return current;
        return {
          ...current,
          data: {
            ...current.data,
            orders: current.data.orders.map((item) =>
              item.id === order.id ? { ...item, status } : item,
            ),
          },
        };
      }, { revalidate: false });
    };

    await runOptimisticMutation({
      apply: () => patchOrderStatus(nextStatus),
      rollback: () => patchOrderStatus(order.status),
      action: () => updatePrintingOrderStatus(order.id, nextStatus, contractId),
      onSuccess: async () => {
        toast("Cập nhật trạng thái thành công", "success");
        await Promise.all([
          invalidateContractAfterWrite(contractId),
          handleSaved(),
        ]);
      },
      onError: (error) => {
        toast(error instanceof Error ? error.message : "Không thể cập nhật trạng thái", "error");
      },
    });
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
          isGrouped={isGroupedView}
          onGroupChange={setUserGroupPreference}
          groupDisabled={hasActiveFilters}
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
          isGroupedView ? (
            <PrintingMobileGrouped
              groups={contractGroups}
              onViewGroup={setSelectedContractGroup}
            />
          ) : (
            <div className="flex flex-col gap-3 pt-1">
              {ordersPage.orders.map((order) => (
                <PrintingCard
                  key={order.id}
                  order={order}
                  onEdit={handleEdit}
                  onPayLab={handlePayLab}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          )
        ) : (
          <PrintingTable
            orders={ordersPage.orders}
            groups={isGroupedView ? contractGroups : undefined}
            onViewGroup={setSelectedContractGroup}
            onEdit={handleEdit}
            onPayLab={handlePayLab}
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
        onEdit={handleEdit}
        onPayLab={handlePayLab}
        onStatusChange={handleStatusChange}
      />

      <LabPaymentModal
        isOpen={!!payingOrder}
        onClose={() => setPayingOrder(null)}
        labId={payingOrder?.labId || undefined}
        labName={payingOrder?.labName || undefined}
        focusOrderId={payingOrder?.id}
        onSuccess={handleSaved}
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
