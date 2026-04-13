"use client";

import { useEffect, useState, useCallback } from "react";
import { Eye, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { deleteSalaryAdjustment } from "@/app/actions/salary-actions";
import { fetchSalaries } from "@/app/actions/finance-operations-queries";
import { formatVnd } from "@/components/finance/finance-format";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { SalaryAdjustmentModal } from "@/components/finance/salaries/salary-adjustment-modal";
import { SalaryDetailModal } from "@/components/finance/salaries/salary-detail-modal";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { TableWrapper, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import type { ActionResult, SalaryItem, SalaryPageData } from "@/types/finance-operations";

interface SalariesClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: SalaryPageData;
}



async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function SalariesClient({ initialMonth, initialYear, initialData }: SalariesClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [viewing, setViewing] = useState<SalaryItem | null>(null);
  const [adjusting, setAdjusting] = useState<SalaryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const key = cacheKeys.financeSalaries(month, year);
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);
  const handleMonthChange = useCallback((value: string) => setMonth(Number(value)), []);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);
  const { data, error, isLoading } = useSWR(key, () => requireData(fetchSalaries(month, year)), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được bảng lương.");
  }, [error]);

  const salaryData = data || initialData;

  const refresh = () => void mutate(key);

  const deleteAdjustment = async (adjustmentId: string, salaryId: string) => {
    if (!window.confirm("Xóa điều chỉnh này?")) return;
    setDeletingId(adjustmentId);
    const result = await deleteSalaryAdjustment(adjustmentId, salaryId);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã xóa điều chỉnh.");
    refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="icon-box bg-success/10">
            <Wallet className="w-4 h-4 text-success" />
          </div>
          <div>
            <h1 className="text-h1">Bảng lương</h1>
            <p className="text-body-sm text-text-secondary">Theo dõi lương theo tháng và điều chỉnh thưởng phạt.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <SimpleSelect value={String(month)} onChange={handleMonthChange} options={monthOptions} />
          <SimpleSelect value={String(year)} onChange={handleYearChange} options={yearOptions} />
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 entrance entrance-1">
        <div className="stats-card">
          <div className="text-caption text-text-muted">Nhân sự</div>
          <div className="text-h2 tabular-nums">{salaryData.summary.total_employees}</div>
        </div>
        <div className="stats-card">
          <div className="text-caption text-text-muted">Tổng lương</div>
          <div className="text-h2 tabular-nums">{formatVnd(salaryData.summary.total_salary)}</div>
        </div>
        <div className="stats-card">
          <div className="text-caption text-text-muted">Thưởng - phạt</div>
          <div className="text-h2 tabular-nums text-success">{formatVnd(salaryData.summary.bonus_total - salaryData.summary.penalty_total)}</div>
        </div>
      </section>

      <section className="entrance entrance-2">
        {isLoading && !data ? (
          <div className="card-base p-5">
            <SkeletonTable rows={6} />
          </div>
        ) : (
          <TableWrapper>
            <THead>
              <TR>
                <TH>Nhân viên</TH>
                <TH className="text-right">Cơ bản</TH>
                <TH className="text-right">Sản phẩm</TH>
                <TH className="text-right">Thưởng</TH>
                <TH className="text-right">Phạt</TH>
                <TH className="text-right">Thực nhận</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {salaryData.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <div className="font-semibold text-text-primary">{item.employee_name}</div>
                    <div className="text-caption text-text-muted">{item.employee_code || "-"} · {item.position || "Chưa có vị trí"}</div>
                  </TD>
                  <TD className="text-right tabular-nums">{formatVnd(item.base_salary)}</TD>
                  <TD className="text-right tabular-nums">{formatVnd(item.product_salary)}</TD>
                  <TD className="text-right tabular-nums text-success">{formatVnd(item.bonus)}</TD>
                  <TD className="text-right tabular-nums text-error">{formatVnd(item.penalty)}</TD>
                  <TD className="text-right tabular-nums font-bold">{formatVnd(item.net_salary)}</TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setViewing(item)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="interactive" size="sm" onClick={() => setAdjusting(item)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
              {salaryData.items.length === 0 && (
                <TR>
                  <TD colSpan={7} className="py-7 text-center text-text-muted">
                    Chưa có dữ liệu lương tháng này.
                  </TD>
                </TR>
              )}
            </TBody>
          </TableWrapper>
        )}
      </section>

      <SalaryDetailModal item={viewing} onClose={() => setViewing(null)} onDeleteAdjustment={deleteAdjustment} deletingId={deletingId} />
      {adjusting && (
        <SalaryAdjustmentModal salary={adjusting} onClose={() => setAdjusting(null)} onSaved={refresh} />
      )}
    </>
  );
}
