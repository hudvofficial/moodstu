"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteReceipt } from "@/app/actions/receipt-actions";
import { fetchReceipts, fetchReceiptStats } from "@/app/actions/finance-operations-queries";
import type { ReceiptStats } from "@/app/actions/finance-operations-queries";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { ReceiptDesktopTable } from "@/components/finance/receipts/receipt-desktop-table";
import { ReceiptFormModal } from "@/components/finance/receipts/receipt-form-modal";
import { ReceiptMobileList } from "@/components/finance/receipts/receipt-mobile-list";
import { ReceiptStatsBar } from "@/components/finance/receipts/receipt-stats-bar";
import { ReceiptFilters } from "@/components/finance/receipts/receipt-filters";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FAB } from "@/components/ui/fab";
import { Pagination } from "@/components/ui/pagination";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, FinanceCategory, FinanceContractOption, ReceiptPage, ReceiptListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";

interface ReceiptsClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: ReceiptPage;
  categories: FinanceCategory[];
  contracts: FinanceContractOption[];
  bankInfo: BankInfo | null;
}



async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function ReceiptsClient({ initialMonth, initialYear, initialData, categories, contracts, bankInfo }: ReceiptsClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptListItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");

  const pageSize = 12;
  const typeKey = filterType !== "all" ? `&type=${filterType}` : "";
  const key = cacheKeys.financeReceipts(page, month, year) + typeKey;
  const statsKey = cacheKeys.financeReceiptStats(month, year);
  
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);
  const handleMonthChange = useCallback((value: string) => {
    setMonth(Number(value));
    setPage(1);
  }, []);
  const handleYearChange = useCallback((value: string) => {
    setYear(Number(value));
    setPage(1);
  }, []);
  const handleTypeChange = useCallback((value: string) => {
    setFilterType(value);
    setPage(1);
  }, []);

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(fetchReceipts({ page, pageSize, month, year, receiptType: filterType })),
    { fallbackData: initialData },
  );

  const { data: stats } = useSWR<ReceiptStats>(
    statsKey,
    () => requireData(fetchReceiptStats(month, year)),
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được phiếu thu.");
  }, [error]);

  const receipts = data || initialData;
  const totalPages = Math.max(1, Math.ceil(receipts.total / receipts.pageSize));



  const refresh = () => {
    void mutate(key);
    void mutate(statsKey);
    void mutate(cacheKeys.financeDashboard(month, year));
    void mutate(cacheKeys.financeLedger(1, month, year, "all"));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa phiếu thu này?")) return;
    setDeletingId(id);
    const result = await deleteReceipt(id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa phiếu thu.");
    refresh();
  };

  const handleEdit = (receipt: ReceiptListItem) => {
    setEditingReceipt(receipt);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingReceipt(null);
    setIsModalOpen(true);
  };

  return (
    <div className="main-container gap-4!">
      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: "Tài chính", href: "/finance" },
        { label: "Phiếu thu" },
      ]} />

      {/* ── Stats + Action (unified container) ── */}
      <section className="entrance entrance-0">
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <ReceiptStatsBar stats={stats || null} />
          </div>
          <div className="hidden lg:flex shrink-0">
            <Button type="button" onClick={openNewModal} variant="primary" className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Thêm phiếu thu
            </Button>
          </div>
        </div>
      </section>

      <section className="entrance entrance-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ReceiptFilters activeType={filterType} onTypeChange={handleTypeChange} stats={stats || null} />
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide lg:overflow-visible">
          <SelectPill
            value={String(month)}
            onChange={handleMonthChange}
            placeholder="Tháng"
            options={monthOptions}
          />
          <SelectPill
            value={String(year)}
            onChange={handleYearChange}
            placeholder="Năm"
            options={yearOptions}
          />
        </div>
      </section>

      <section className="entrance entrance-2">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <>
            <ReceiptDesktopTable items={receipts.items} bankInfo={bankInfo} deletingId={deletingId} onDelete={handleDelete} onEdit={handleEdit} />
            <ReceiptMobileList items={receipts.items} bankInfo={bankInfo} deletingId={deletingId} onDelete={handleDelete} onEdit={handleEdit} />
          </>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <p className="text-center text-caption text-text-muted">
        Hiển thị {receipts.items.length} / {receipts.total} phiếu thu
      </p>

      <ReceiptFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={refresh}
        categories={categories}
        contracts={contracts}
        initialData={editingReceipt}
      />

      {/* FAB Mobile - Shared Component */}
      <FAB onClick={openNewModal} label="Thêm phiếu thu" />
    </div>
  );
}
