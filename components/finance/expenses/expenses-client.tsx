"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { approveExpense, deleteExpense } from "@/app/actions/expense-actions";
import { fetchExpenses, fetchExpenseStats } from "@/app/actions/finance-operations-queries";
import type { ExpenseStats } from "@/app/actions/finance-operations-queries";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { ExpenseDesktopTable } from "@/components/finance/expenses/expense-desktop-table";
import { ExpenseFilters } from "@/components/finance/expenses/expense-filters";
import { ExpenseDetailModal } from "@/components/finance/expenses/expense-detail-modal";
import { ExpenseFormModal } from "@/components/finance/expenses/expense-form-modal";
import { ExpenseMobileList } from "@/components/finance/expenses/expense-mobile-list";
import { ExpenseStatsBar } from "@/components/finance/expenses/expense-stats-bar";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FAB } from "@/components/ui/fab";
import { Pagination } from "@/components/ui/pagination";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { SkeletonTable } from "@/components/ui/skeleton";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, ApprovalFilter, ExpensePage, FinanceCategory, ExpenseListItem } from "@/types/finance-operations";

interface ExpensesClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: ExpensePage;
  categories: FinanceCategory[];
}

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
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewingExpenseId, setViewingExpenseId] = useState<string | null>(null);

  const pageSize = 12;
  const key = cacheKeys.financeExpenses(page, month, year, approval);
  const statsKey = cacheKeys.financeExpenseStats(month, year);
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);

  const handleMonthChange = useCallback((value: string) => {
    setMonth(Number(value));
    setPage(1);
  }, []);
  const handleYearChange = useCallback((value: string) => {
    setYear(Number(value));
    setPage(1);
  }, []);
  const handleApprovalChange = useCallback((value: string) => {
    setApproval(value as ApprovalFilter);
    setPage(1);
  }, []);

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(fetchExpenses({ page, pageSize, month, year, approval })),
    { fallbackData: initialData },
  );

  const { data: stats } = useSWR<ExpenseStats>(
    statsKey,
    () => requireData(fetchExpenseStats(month, year)),
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được phiếu chi.");
  }, [error]);

  const expenses = data || initialData;
  const totalPages = Math.max(1, Math.ceil(expenses.total / expenses.pageSize));

  const refresh = () => {
    void mutate(key);
    void mutate(statsKey);
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

  const handleEdit = (item: ExpenseListItem) => {
    setEditingExpense(item);
    setIsModalOpen(true);
  };

  const handleView = (id: string) => {
    setViewingExpenseId(id);
  };

  const handlePrint = (id: string) => {
    window.open(`/finance/expenses/${id}/print`, "_blank");
  };

  const openNewModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setEditingExpense(null), 300);
  };

  return (
    <div className="main-container gap-4!">
      {/* ── Breadcrumb ── */}
      <Breadcrumb items={[
        { label: "Tài chính", href: "/finance" },
        { label: "Phiếu chi" },
      ]} />

      {/* ── Stats + Action (unified container) ── */}
      <section className="entrance entrance-0">
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <div className="flex-1 min-w-0">
            <ExpenseStatsBar stats={stats || null} />
          </div>
          <div className="hidden lg:flex shrink-0">
            <Button type="button" onClick={openNewModal} variant="primary" className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              Thêm phiếu chi
            </Button>
          </div>
        </div>
      </section>

      {/* ── Filters row ── */}
      <section className="entrance entrance-1 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ExpenseFilters activeApproval={approval} onApprovalChange={handleApprovalChange} stats={stats || null} />
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

      {/* ── Data table ── */}
      <section className="entrance entrance-2">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <>
            <ExpenseDesktopTable
              items={expenses.items}
              busyId={busyId}
              onApprove={handleApprove}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onView={handleView}
              onPrint={handlePrint}
            />
            <ExpenseMobileList
              items={expenses.items}
              busyId={busyId}
              onApprove={handleApprove}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onView={handleView}
              onPrint={handlePrint}
            />
          </>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <p className="text-center text-caption text-text-muted">
        Hiển thị {expenses.items.length} / {expenses.total} phiếu chi
      </p>

      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSaved={refresh}
        categories={categories}
        initialData={editingExpense}
      />

      <ExpenseDetailModal
        isOpen={viewingExpenseId !== null}
        onClose={() => setViewingExpenseId(null)}
        expenseId={viewingExpenseId}
      />

      {/* FAB Mobile - Shared Component */}
      <FAB onClick={openNewModal} label="Thêm phiếu chi" />
    </div>
  );
}
