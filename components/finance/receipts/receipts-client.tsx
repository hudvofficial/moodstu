"use client";

import { useEffect, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { deleteReceipt } from "@/app/actions/receipt-actions";
import { fetchReceipts } from "@/app/actions/finance-operations-queries";
import { ReceiptDesktopTable } from "@/components/finance/receipts/receipt-desktop-table";
import { ReceiptFormModal } from "@/components/finance/receipts/receipt-form-modal";
import { ReceiptMobileList } from "@/components/finance/receipts/receipt-mobile-list";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, FinanceCategory, FinanceContractOption, ReceiptPage } from "@/types/finance-operations";

interface ReceiptsClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: ReceiptPage;
  categories: FinanceCategory[];
  contracts: FinanceContractOption[];
}

const months = Array.from({ length: 12 }, (_, index) => index + 1);

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function ReceiptsClient({ initialMonth, initialYear, initialData, categories, contracts }: ReceiptsClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const pageSize = 12;
  const key = cacheKeys.financeReceipts(page, month, year);
  const years = [initialYear - 1, initialYear, initialYear + 1];

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(fetchReceipts({ page, pageSize, month, year })),
    { fallbackData: initialData },
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được phiếu thu.");
  }, [error]);

  const receipts = data || initialData;
  const totalPages = Math.max(1, Math.ceil(receipts.total / receipts.pageSize));

  const changeFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  const refresh = () => {
    void mutate(key);
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

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-success/10">
            <ReceiptText className="w-4 h-4 text-success" />
          </div>
          <div>
            <h1 className="text-h1">Phiếu thu</h1>
            <p className="text-body-sm text-text-secondary">Theo dõi khoản thu, danh mục thu và hợp đồng liên quan.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row">
          <SimpleSelect
            value={String(month)}
            onChange={(value) => changeFilter(setMonth, Number(value))}
            options={months.map((item) => ({ value: String(item), label: `Tháng ${item}` }))}
          />
          <SimpleSelect
            value={String(year)}
            onChange={(value) => changeFilter(setYear, Number(value))}
            options={years.map((item) => ({ value: String(item), label: String(item) }))}
          />
          <Button type="button" onClick={() => setIsModalOpen(true)} className="btn-cta gap-2">
            <Plus className="w-4 h-4" />
            Thêm phiếu thu
          </Button>
        </div>
      </div>

      <section className="entrance entrance-1">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <>
            <ReceiptDesktopTable items={receipts.items} deletingId={deletingId} onDelete={handleDelete} />
            <ReceiptMobileList items={receipts.items} deletingId={deletingId} onDelete={handleDelete} />
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
      />
    </>
  );
}
