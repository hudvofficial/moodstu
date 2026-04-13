"use client";

import { useEffect, useState } from "react";
import { Plus, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { approveExpense, deleteExpense } from "@/app/actions/expense-actions";
import { fetchExpenses } from "@/app/actions/finance-operations-queries";
import { ExpenseDesktopTable } from "@/components/finance/expenses/expense-desktop-table";
import { ExpenseFormModal } from "@/components/finance/expenses/expense-form-modal";
import { ExpenseMobileList } from "@/components/finance/expenses/expense-mobile-list";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, ApprovalFilter, ExpensePage, FinanceCategory } from "@/types/finance-operations";

interface ExpensesClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: ExpensePage;
  categories: FinanceCategory[];
}

const months = Array.from({ length: 12 }, (_, index) => index + 1);

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function ExpensesClient({ initialMonth, initialYear, initialData, categories }: ExpensesClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [approval, setApproval] = useState<ApprovalFilter>("all");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const pageSize = 12;
  const key = cacheKeys.financeExpenses(page, month, year, approval);
  const years = [initialYear - 1, initialYear, initialYear + 1];

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(fetchExpenses({ page, pageSize, month, year, approval })),
    { fallbackData: initialData },
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được phiếu chi.");
  }, [error]);

  const expenses = data || initialData;
  const totalPages = Math.max(1, Math.ceil(expenses.total / expenses.pageSize));

  const changeFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  const refresh = () => {
    void mutate(key);
    void mutate(cacheKeys.financeDashboard(month, year));
    void mutate(cacheKeys.financeLedger(1, month, year, "all"));
  };

  const handleApprove = async (id: string) => {
    setBusyId(id);
    const result = await approveExpense(id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã duyệt phiếu chi.");
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa phiếu chi này?")) return;
    setBusyId(id);
    const result = await deleteExpense(id);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa phiếu chi.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-error/10">
            <WalletCards className="w-4 h-4 text-error" />
          </div>
          <div>
            <h1 className="text-h1">Phiếu chi</h1>
            <p className="text-body-sm text-text-secondary">Quản lý khoản chi theo trạng thái duyệt và kỳ sổ.</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row">
          <SimpleSelect value={String(month)} onChange={(value) => changeFilter(setMonth, Number(value))} options={months.map((item) => ({ value: String(item), label: `Tháng ${item}` }))} />
          <SimpleSelect value={String(year)} onChange={(value) => changeFilter(setYear, Number(value))} options={years.map((item) => ({ value: String(item), label: String(item) }))} />
          <SimpleSelect
            value={approval}
            onChange={(value) => changeFilter(setApproval, value as ApprovalFilter)}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "pending", label: "Chờ duyệt" },
              { value: "approved", label: "Đã duyệt" },
            ]}
          />
          <Button type="button" onClick={() => setIsModalOpen(true)} className="btn-cta gap-2">
            <Plus className="w-4 h-4" />
            Thêm phiếu chi
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
            <ExpenseDesktopTable items={expenses.items} busyId={busyId} onApprove={handleApprove} onDelete={handleDelete} />
            <ExpenseMobileList items={expenses.items} busyId={busyId} onApprove={handleApprove} onDelete={handleDelete} />
          </>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <p className="text-center text-caption text-text-muted">
        Hiển thị {expenses.items.length} / {expenses.total} phiếu chi
      </p>

      <ExpenseFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={refresh} categories={categories} />
    </>
  );
}
