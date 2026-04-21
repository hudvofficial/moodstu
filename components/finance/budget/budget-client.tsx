"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBudget, getBudgetsWithActuals } from "@/app/actions/goal-budget-actions";
import { formatVnd } from "@/components/finance/finance-format";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { BudgetFormModal } from "@/components/finance/budget/budget-form-modal";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, BudgetActualItem } from "@/types/finance-operations";

interface BudgetClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: BudgetActualItem[];
}



async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function BudgetClient({ initialMonth, initialYear, initialData }: BudgetClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const key = cacheKeys.financeBudgets(month, year);
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);
  const handleMonthChange = useCallback((value: string) => setMonth(Number(value)), []);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const { data, error, isLoading } = useSWR(key, () => requireData(getBudgetsWithActuals(month, year)), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được ngân sách.");
  }, [error]);

  const budgets = data || initialData;
  const refresh = () => void mutate(key);

  const remove = async (item: BudgetActualItem) => {
    if (!window.confirm(`Xóa ngân sách ${item.category_name}?`)) return;
    setDeletingId(item.id);
    const result = await deleteBudget(item.id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa ngân sách.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-info/10">
            <Target className="w-4 h-4 text-info" />
          </div>
          <div>
            <h1 className="text-h1">Ngân sách</h1>
            <p className="text-body-sm text-text-secondary">So sánh hạn mức với chi thực tế theo danh mục.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row">
          <SimpleSelect value={String(month)} onChange={handleMonthChange} options={monthOptions} />
          <SimpleSelect value={String(year)} onChange={handleYearChange} options={yearOptions} />
          <Button type="button" onClick={openModal} className="btn-cta gap-2">
            <Plus className="w-4 h-4" />
            Thêm ngân sách
          </Button>
        </div>
      </div>

      <section className="entrance entrance-1">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Danh mục</TH>
                <TH className="text-right">Hạn mức</TH>
                <TH className="text-right">Đã chi</TH>
                <TH>Tiến độ</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {budgets.map((item) => (
                <TR key={item.id}>
                  <TD className="font-semibold text-text-primary">{item.category_name}</TD>
                  <TD className="text-right tabular-nums">{formatVnd(item.budget_amount)}</TD>
                  <TD className="text-right tabular-nums font-bold">{formatVnd(item.actual_spent)}</TD>
                  <TD>
                    <div className="space-y-1">
                      <div className="flex justify-between text-caption">
                        <span>{item.usage_percent}%</span>
                        <span className={item.usage_percent > 100 ? "text-error" : "text-success"}>
                          {item.usage_percent > 100 ? "Vượt" : "Trong hạn"}
                        </span>
                      </div>
                      <div className="h-2 rounded-md bg-border overflow-hidden">
                        <div className={item.usage_percent > 100 ? "h-full bg-error" : "h-full bg-success"} style={{ width: `${Math.min(item.usage_percent, 100)}%` }} />
                      </div>
                    </div>
                  </TD>
                  <TD className="text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(item)} disabled={deletingId === item.id} className="text-error">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TD>
                </TR>
              ))}
              {budgets.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-7 text-center text-text-muted">
                    Chưa có ngân sách tháng này.
                  </TD>
                </TR>
              )}
            </TBody>
          </TableWrapper>
        )}
      </section>

      <BudgetFormModal isOpen={isModalOpen} onClose={closeModal} onSaved={refresh} month={month} year={year} />
    </>
  );
}
