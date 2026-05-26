"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteDebt, updateDebt } from "@/app/actions/debt-actions";
import { fetchDebts, fetchDebtStats } from "@/app/actions/finance-operations-queries";
import { DebtFormModal } from "@/components/finance/debts/debt-form-modal";
import { DebtDesktopTable } from "@/components/finance/debts/debt-desktop-table";
import { DebtMobileList } from "@/components/finance/debts/debt-mobile-list";
import { DebtStatsBar } from "@/components/finance/debts/debt-stats-bar";
import { DebtAgingCard } from "@/components/finance/debts/debt-aging-card";
import { DebtPaymentModal } from "@/components/finance/debts/debt-payment-modal";
import { DebtHistoryDrawer } from "@/components/finance/debts/debt-history-drawer";
import { GhostScanWidget } from "@/components/finance/integrity/ghost-scan-widget";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/pagination";
import { SkeletonCard } from "@/components/ui/skeleton";
import { invalidateFinanceAfterWrite } from "@/lib/cache-invalidation";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, DebtListItem, IntegrityReportItem } from "@/types/finance-operations";
import type { PaginatedResult } from "@/types/finance-dashboard";
import type { DebtStats } from "@/app/actions/finance-operations-queries";
import type { BankInfo } from "@/types/settings";

interface DebtsClientProps {
  initialData: PaginatedResult<DebtListItem>;
  initialStats: DebtStats;
  initialIntegrity: IntegrityReportItem[];
  bankInfo: BankInfo | null;
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function DebtsClient({ initialData, initialStats, initialIntegrity, bankInfo }: DebtsClientProps) {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  
  // States for new features
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtListItem | null>(null);
  const [selectedDebtForHistory, setSelectedDebtForHistory] = useState<DebtListItem | null>(null);

  const handleOpenCreate = useCallback(() => setIsModalOpen(true), []);
  const handleCloseModal = useCallback(() => setIsModalOpen(false), []);

  const key = cacheKeys.debts(page);
  const { data, error, isLoading } = useSWR<PaginatedResult<DebtListItem>>(key, async () => { const r = await requireData(fetchDebts({ page, pageSize: 20 })); return r as unknown as PaginatedResult<DebtListItem>; }, { fallbackData: page === 1 ? initialData : undefined });

  const statsKey = cacheKeys.debtStats();
  const { data: globalStats, error: statsError } = useSWR(statsKey, async () => { const r = await requireData(fetchDebtStats()); return r; }, { fallbackData: initialStats });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được công nợ.");
    if (statsError) toast.error(statsError.message || "Không tải được dữ liệu tổng quan công nợ.");
  }, [error, statsError]);

  const debtData = data || (page === 1 ? initialData : { items: [], total: 0, page: 1, pageSize: 20 });
  const debts = debtData.items;
  const totalPages = Math.ceil(debtData.total / debtData.pageSize) || 1;

  const summary = globalStats || initialStats;

  const refresh = () => {
    void Promise.all([
      mutate(key),
      mutate(statsKey),
      invalidateFinanceAfterWrite(),
    ]);
  };

  const markPaid = async (item: DebtListItem) => {
    setSelectedDebtForPayment(item);
  };
  
  const viewHistory = (item: DebtListItem) => {
    setSelectedDebtForHistory(item);
  };

  const remove = async (item: DebtListItem) => {
    if (!window.confirm(`Xóa công nợ ${item.entity_name}?`)) return;
    setBusyId(item.id);
    const result = await deleteDebt(item.id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa công nợ.");
    refresh();
  };

  return (
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Công nợ khách hàng", href: "/finance/debts" },
        ]}
      />

      <section className="entrance entrance-0 mt-4 space-y-4 mb-4">
        {/* ── Stats + Action (unified container) ── */}
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <DebtStatsBar stats={summary} />
          </div>
          <div className="hidden lg:flex shrink-0 items-center gap-3">
            <GhostScanWidget initialData={initialIntegrity} variant="button" />
            <Button type="button" onClick={handleOpenCreate} variant="primary" className="gap-2 shrink-0 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Tạo công nợ</span>
            </Button>
          </div>
        </div>

        {/* ── Aging Analysis ── */}
        <DebtAgingCard stats={summary} />
      </section>

      <section className="entrance entrance-2 mt-4">
        {isLoading && debts.length === 0 ? (
          <div className="card-base p-5">
            <SkeletonCard />
          </div>
        ) : (
          <>
            <div className="hidden lg:block card-base">
              <DebtDesktopTable
                items={debts}
                bankInfo={bankInfo}
                busyId={busyId}
                onMarkPaid={markPaid}
                onViewHistory={viewHistory}
                onDelete={remove}
              />
            </div>
            <div className="lg:hidden">
              <DebtMobileList
                items={debts}
                bankInfo={bankInfo}
                busyId={busyId}
                onMarkPaid={markPaid}
                onViewHistory={viewHistory}
                onDelete={remove}
              />
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* FAB cho mobile giống Receipt */}
      <div className="lg:hidden fixed bottom-20 right-4 z-50">
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="h-14 w-14 rounded-full shadow-lg p-0 flex items-center justify-center btn-cta"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <DebtFormModal isOpen={isModalOpen} onClose={handleCloseModal} onSaved={refresh} />
      <DebtPaymentModal isOpen={!!selectedDebtForPayment} onClose={() => setSelectedDebtForPayment(null)} debt={selectedDebtForPayment} />
      <DebtHistoryDrawer isOpen={!!selectedDebtForHistory} onClose={() => setSelectedDebtForHistory(null)} debt={selectedDebtForHistory} />
    </div>
  );
}
