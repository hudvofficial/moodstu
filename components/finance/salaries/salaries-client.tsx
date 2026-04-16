"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Search, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { deleteSalaryAdjustment, generateMonthlySalaryAction, validatePayrollWarningsAction, deleteEmployeeMonthlySalaryAction, payEmployeeSalaryAction } from "@/app/actions/salary-actions";
import { fetchSalaries } from "@/app/actions/finance-operations-queries";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { SalaryAdjustmentModal } from "@/components/finance/salaries/salary-adjustment-modal";
import { PayslipModal } from "@/components/finance/salaries/payslip-modal";
import { PaymentConfirmModal } from "@/components/finance/salaries/payment-confirm-modal";
import { SalaryDetailModal } from "@/components/finance/salaries/salary-detail-modal";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { SalaryDesktopTable } from "@/components/finance/salaries/salary-desktop-table";
import { SalaryMobileList } from "@/components/finance/salaries/salary-mobile-list";
import { SalaryStatsBar } from "@/components/finance/salaries/salary-stats-bar";
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewing, setViewing] = useState<SalaryItem | null>(null);
  const [adjusting, setAdjusting] = useState<SalaryItem | null>(null);
  const [paying, setPaying] = useState<SalaryItem | null>(null);
  const [printing, setPrinting] = useState<SalaryItem | null>(null);
  const [deletingSalary, setDeletingSalary] = useState<SalaryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const key = cacheKeys.financeSalaries(month, year);
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);

  const handleMonthChange = useCallback((value: string) => setMonth(Number(value)), []);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);

  const handlePay = useCallback((item: SalaryItem) => setPaying(item), []);
  const handlePrint = useCallback((item: SalaryItem) => setPrinting(item), []);

  const refresh = () => void mutate(key);

  const handleDelete = useCallback(async (item: SalaryItem) => {
    if (!window.confirm(`Xác nhận XÓA TẬN GỐC bản ghi lương của nhân sự: ${item.employee_name} ?\nHành động này không thể hoàn tác.`)) return;

    setDeletingId(item.id);
    const tId = toast.loading(`Đang xóa lương ${item.employee_name}...`);
    const result = await deleteEmployeeMonthlySalaryAction(item.id);
    setDeletingId(null);
    if (!result.success) {
      toast.error(result.error, { id: tId });
      return;
    }
    toast.success("Xóa bản ghi lương thành công.", { id: tId });
    refresh();
  }, [refresh]);

  const onConfirmPayment = async (amount: number) => {
    if (!paying) return;
    const tId = toast.loading("Đang ghi nhận thanh toán...");
    const result = await payEmployeeSalaryAction(paying.id, amount);
    if (!result.success) {
      toast.error(result.error, { id: tId });
      return;
    }
    toast.success("Thanh toán lương thành công.", { id: tId });
    setPaying(null);
    refresh();
  };

  const { data, error, isLoading } = useSWR(key, () => requireData(fetchSalaries(month, year)), { fallbackData: initialData });

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được bảng lương.");
  }, [error]);

  const salaryData = data || initialData;

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

  const handleGenerateSalary = async () => {
    if (!window.confirm(`Khởi tạo bảng lương tháng ${month}/${year} cho toàn bộ nhân sự Đang làm?\n\nChú ý: Lương sẽ được tổng hợp dựa theo KPI (Work Progress) của tháng.`)) return;

    setIsGenerating(true);
    const tId = toast.loading("Đang kiểm tra dữ liệu...");

    // 1. Chạy Validate pre-flight để lấy cảnh báo
    const validateRes = await validatePayrollWarningsAction(month, year);
    if (!validateRes.success) {
      toast.error(validateRes.error || "Lỗi kiểm tra dữ liệu kế toán", { id: tId });
      setIsGenerating(false);
      return;
    }
    const payload = (validateRes as any).data || validateRes;
    const { unassignedTasks, zeroCostTasks } = payload?.warnings || { unassignedTasks: [], zeroCostTasks: [] };
    if (unassignedTasks.length > 0 || zeroCostTasks.length > 0) {
      let warningMsg = `⚠️ CẢNH BÁO DỮ LIỆU CẦN KIỂM TRA:\n\n`;
      if (unassignedTasks.length > 0) {
        warningMsg += `1️⃣ Có ${unassignedTasks.length} Hợp đồng hoàn thành nhưng CHƯA GÁN nhân viên:\n   - ${unassignedTasks.slice(0, 5).join("\n   - ")}${unassignedTasks.length > 5 ? "\n   ..." : ""}\n\n`;
      }
      if (zeroCostTasks.length > 0) {
        warningMsg += `2️⃣ Có ${zeroCostTasks.length} Hợp đồng có công việc lương 0đ:\n   - ${zeroCostTasks.slice(0, 5).join("\n   - ")}${zeroCostTasks.length > 5 ? "\n   ..." : ""}\n\n`;
      }
      warningMsg += `👉 Những công việc này sẽ KHÔNG được tính vào bảng lương lần này.\nBạn có muốn tiếp tục khởi tạo không?`;

      if (!window.confirm(warningMsg)) {
        toast.dismiss(tId);
        setIsGenerating(false);
        return;
      }
    }

    toast.loading("Hệ thống đang tổng hợp dữ liệu lương...", { id: tId });
    const result = await generateMonthlySalaryAction(month, year);
    setIsGenerating(false);
    if (!result.success) {
      toast.error(result.error, { id: tId });
    } else if (result.data && typeof result.data === 'object' && 'success' in result.data && result.data.success === false) {
      toast.error(result.data.error || "Có lỗi bất ngờ xảy ra", { id: tId });
    } else {
      const msg = result.data && typeof result.data === 'object' && 'message' in result.data
        ? result.data.message
        : "Khởi tạo bảng lương thành công";
      toast.success(msg as string, { id: tId });
      refresh();
    }
  };

  const filteredItems = salaryData.items || [];

  return (
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Bảng lương", href: "/finance/salaries" },
        ]}
      />

      {/* ── Stats + Action ── */}
      <section className="entrance entrance-0">
        <div className="flex items-center justify-between gap-4 py-3 px-5 bg-bg-card rounded-xl shadow-xs">
          <SalaryStatsBar summary={salaryData.summary} />
          <div className="hidden lg:flex shrink-0">
            {!isLoading && (
              <Button
                type="button"
                onClick={handleGenerateSalary}
                disabled={isGenerating}
                variant={filteredItems.length === 0 ? "primary" : "secondary"}
                className={`gap-2 whitespace-nowrap ${filteredItems.length === 0 ? "shadow-sm" : ""}`}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : filteredItems.length === 0 ? (
                  <PlayCircle className="w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {filteredItems.length === 0 ? `Tạo bảng lương T${month}` : `Cập nhật lương T${month}`}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Mobile FAB ── */}
      {!isLoading && (
        <FAB
          onClick={handleGenerateSalary}
          label={filteredItems.length === 0 ? `Tạo lương T${month}` : `Cập nhật T${month}`}
        />
      )}

      {/* ── Filters ── */}
      <section className="entrance entrance-1 mt-4">
        <div className="flex items-center justify-end gap-2">
          <SelectPill
            value={String(month)}
            onChange={(v) => handleMonthChange(v)}
            options={monthOptions}
            placeholder="Tháng"
          />
          <SelectPill
            value={String(year)}
            onChange={(v) => handleYearChange(v)}
            options={yearOptions}
            placeholder="Năm"
          />
        </div>
      </section>

      {/* ── Table/List ── */}
      <section className="entrance entrance-2 mt-4">
        {isLoading && !data ? (
          <div className="space-y-4 pt-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="card-base hidden lg:block border-0 shadow-none bg-transparent">
              <SalaryDesktopTable
                items={filteredItems}
                onView={setViewing}
                onAdjust={setAdjusting}
                onPay={handlePay}
                onPrint={handlePrint}
                onDelete={handleDelete}
              />
            </div>
            <SalaryMobileList
              items={filteredItems}
              onView={setViewing}
              onAdjust={setAdjusting}
              onPay={handlePay}
              onDelete={handleDelete}
              busyId={null}
            />
          </>
        )}
      </section>

      <SalaryDetailModal item={viewing} onClose={() => setViewing(null)} onDeleteAdjustment={deleteAdjustment} deletingId={deletingId} />
      {adjusting && (
        <SalaryAdjustmentModal salary={adjusting} onClose={() => setAdjusting(null)} onSaved={refresh} />
      )}
      {printing && (
        <PayslipModal salary={printing} onClose={() => setPrinting(null)} />
      )}
      {paying && (
        <PaymentConfirmModal salary={paying} onConfirm={onConfirmPayment} onClose={() => setPaying(null)} />
      )}
    </div>
  );
}
