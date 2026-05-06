"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { voidContractPayment } from "@/app/actions/payment-actions";
import { deleteReceipt } from "@/app/actions/receipt-actions";
import {
  fetchContractOptions,
  fetchFinanceCategories,
  fetchReceipts,
  fetchReceiptStats,
} from "@/app/actions/finance-operations-queries";
import type { ReceiptStats } from "@/app/actions/finance-operations-queries";
import { getStudioInfo } from "@/app/actions/settings-queries";
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
import { Textarea } from "@/components/ui/textarea";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { invalidateFinanceAfterWrite } from "@/lib/cache-invalidation";
import { revalidateContractCaches } from "@/lib/hooks/use-contracts";
import { revalidateInventory } from "@/lib/hooks/use-inventory";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, FinanceCategory, FinanceContractOption, ReceiptPage, ReceiptListItem } from "@/types/finance-operations";
import type { BankInfo } from "@/types/settings";
import type { StudioInfo } from "@/types/settings";

interface ReceiptsClientProps {
  initialMonth: number;
  initialYear: number;
  initialData?: ReceiptPage;
  categories?: FinanceCategory[];
  contracts?: FinanceContractOption[];
  bankInfo?: BankInfo | null;
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
  const [voidingReceipt, setVoidingReceipt] = useState<ReceiptListItem | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
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
    initialData ? { fallbackData: initialData } : undefined,
  );

  const { data: stats } = useSWR<ReceiptStats>(
    statsKey,
    () => requireData(fetchReceiptStats(month, year)),
  );
  const { data: categoryData } = useSWR(
    cacheKeys.financeCategories("thu"),
    () => requireData(fetchFinanceCategories("thu")),
    categories ? { fallbackData: categories } : undefined,
  );
  const { data: contractData } = useSWR(
    cacheKeys.financeContracts(),
    () => requireData(fetchContractOptions()),
    contracts ? { fallbackData: contracts } : undefined,
  );
  const { data: studioInfo } = useSWR<StudioInfo | null>(
    cacheKeys.settings(),
    () => requireData(getStudioInfo()),
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được phiếu thu.");
  }, [error]);

  const receipts = data || initialData || { items: [], total: 0, page: 1, pageSize };
  const totalPages = Math.max(1, Math.ceil(receipts.total / receipts.pageSize));
  const resolvedBankInfo = studioInfo?.bank_info || bankInfo || null;



  const refresh = async () => {
    await Promise.all([
      mutate(key),
      mutate(statsKey),
      mutate(cacheKeys.financeDashboard(month, year)),
      mutate(cacheKeys.financeLedger(1, month, year, "all")),
      invalidateFinanceAfterWrite({ month, year }),
    ]);
  };

  const isContractGeneratedReceipt = (receipt: ReceiptListItem | null | undefined) =>
    Boolean(receipt && (receipt.source_table === "payments" || receipt.id.startsWith("payment:")));

  const handleDelete = async (id: string) => {
    const targetReceipt = receipts.items.find((item) => item.id === id);
    if (isContractGeneratedReceipt(targetReceipt)) {
      setVoidingReceipt(targetReceipt || null);
      setVoidReason("");
      return;
    }

    if (!window.confirm("Xóa phiếu thu này?")) return;
    const target = receipts.items.find((item) => item.id === id);
    setDeletingId(id);
    const result = await deleteReceipt(id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa phiếu thu.");
    await Promise.all([
      target?.contract_id ? revalidateContractCaches(target.contract_id) : Promise.resolve(),
      target?.receipt_type === "sale_receipt" ? revalidateInventory() : Promise.resolve(),
      refresh(),
    ]);
  };

  const closeVoidModal = () => {
    if (isVoiding) return;
    setVoidingReceipt(null);
    setVoidReason("");
  };

  const confirmVoidPayment = async () => {
    if (!voidingReceipt) return;
    const reason = voidReason.trim();
    if (reason.length < 5) {
      toast.error("Lý do hủy phiếu thu phải có ít nhất 5 ký tự.");
      return;
    }

    const paymentId = voidingReceipt.source_id || voidingReceipt.id.replace(/^payment:/, "");
    setIsVoiding(true);
    setDeletingId(voidingReceipt.id);
    const result = await voidContractPayment({ paymentId, reason });
    setIsVoiding(false);
    setDeletingId(null);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Đã hủy phiếu thu hợp đồng.");
    await Promise.all([
      voidingReceipt.contract_id ? revalidateContractCaches(voidingReceipt.contract_id) : Promise.resolve(),
      refresh(),
    ]);
    closeVoidModal();
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
            <ReceiptDesktopTable items={receipts.items} bankInfo={resolvedBankInfo} deletingId={deletingId} onDelete={handleDelete} onEdit={handleEdit} />
            <ReceiptMobileList items={receipts.items} bankInfo={resolvedBankInfo} deletingId={deletingId} onDelete={handleDelete} onEdit={handleEdit} />
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
        categories={categoryData || categories || []}
        contracts={contractData || contracts || []}
        initialData={editingReceipt}
      />

      <UnifiedModal
        isOpen={Boolean(voidingReceipt)}
        onClose={closeVoidModal}
        title="Hủy phiếu thu hợp đồng"
        description={voidingReceipt?.receipt_code || voidingReceipt?.contract_code || undefined}
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-body-sm text-text-secondary">
            Phiếu thu hợp đồng sẽ được void bằng giao dịch DB; công nợ hợp đồng và đợt thanh toán liên quan sẽ được tính lại.
          </div>
          <Textarea
            unstyled
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            rows={3}
            className="input-base w-full resize-none"
            placeholder="Nhập lý do hủy phiếu thu..."
            disabled={isVoiding}
          />
          <div className="form-actions">
            <Button type="button" variant="outline" onClick={closeVoidModal} disabled={isVoiding}>
              Đóng
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmVoidPayment}
              disabled={isVoiding || voidReason.trim().length < 5}
            >
              {isVoiding ? "Đang hủy..." : "Hủy phiếu thu"}
            </Button>
          </div>
        </div>
      </UnifiedModal>

      {/* FAB Mobile - Shared Component */}
      <FAB onClick={openNewModal} label="Thêm phiếu thu" />
    </div>
  );
}
