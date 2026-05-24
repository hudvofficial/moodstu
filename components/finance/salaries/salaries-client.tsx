"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  deleteSalaryAdjustment,
  deleteEmployeeMonthlySalaryAction,
  generateMonthlySalaryAction,
  payEmployeeSalaryAction,
  validatePayrollWarningsAction,
} from "@/app/actions/salary-actions";
import { fetchSalaries } from "@/app/actions/finance-operations-queries";
import { fetchVendorCosts } from "@/app/actions/vendor-reports-queries";
import { SalaryAdjustmentModal } from "@/components/finance/salaries/salary-adjustment-modal";
import { SalaryDetailModal } from "@/components/finance/salaries/salary-detail-modal";
import { SalaryFilters } from "@/components/finance/salaries/salary-filters";
import { SalaryMobileList } from "@/components/finance/salaries/salary-mobile-list";
import { PayslipModal } from "@/components/finance/salaries/payslip-modal";
import { PaymentConfirmModal } from "@/components/finance/salaries/payment-confirm-modal";
import { SalaryDesktopTable } from "@/components/finance/salaries/salary-desktop-table";
import { SalaryStatsBar } from "@/components/finance/salaries/salary-stats-bar";
import { VendorCostDesktopTable } from "@/components/finance/salaries/vendor-cost-desktop-table";
import { VendorCostMobileList } from "@/components/finance/salaries/vendor-cost-mobile-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidateFinanceAfterWrite } from "@/lib/cache-invalidation";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import type { ActionResult, SalaryItem, SalaryPageData } from "@/types/finance-operations";

interface SalariesClientProps {
  initialMonth: number;
  initialYear: number;
  initialData: SalaryPageData;
}

const SORT_OPTIONS = [
  { value: "default", label: "Sắp xếp" },
  { value: "remaining_desc", label: "Còn lại cao" },
  { value: "net_desc", label: "Thực nhận cao" },
  { value: "name_asc", label: "Tên A-Z" },
];

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function hasAdjustments(item: SalaryItem) {
  return item.adjustments.length > 0 || item.bonus > 0 || item.penalty > 0;
}

export function SalariesClient({
  initialMonth,
  initialYear,
  initialData,
}: SalariesClientProps) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [viewMode, setViewMode] = useState<"salaries" | "vendors">("salaries");
  const [scope, setScope] = useState("all");
  const [position, setPosition] = useState("all");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("default");
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewing, setViewing] = useState<SalaryItem | null>(null);
  const [adjusting, setAdjusting] = useState<SalaryItem | null>(null);
  const [paying, setPaying] = useState<SalaryItem | null>(null);
  const [printing, setPrinting] = useState<SalaryItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const key = cacheKeys.financeSalaries(month, year);
  const { monthOptions, yearOptions } = useFinanceFilters(initialYear);

  const handleMonthChange = useCallback((value: string) => setMonth(Number(value)), []);
  const handleYearChange = useCallback((value: string) => setYear(Number(value)), []);
  const handlePay = useCallback((item: SalaryItem) => setPaying(item), []);
  const handlePrint = useCallback((item: SalaryItem) => setPrinting(item), []);
  const refresh = useCallback(() => {
    void Promise.all([
      mutate(key),
      invalidateFinanceAfterWrite({ month, year }),
    ]);
  }, [key, month, year]);

  const handleDelete = useCallback(
    async (item: SalaryItem) => {
      if (
        !window.confirm(
          `Xác nhận XÓA TẬN GỐC bản ghi lương của nhân sự: ${item.employee_name}?\nHành động này không thể hoàn tác.`,
        )
      ) {
        return;
      }

      setDeletingId(item.id);
      const toastId = toast.loading(`Đang xóa lương ${item.employee_name}...`);
      const result = await deleteEmployeeMonthlySalaryAction(item.id);
      setDeletingId(null);

      if (!result.success) {
        toast.error(result.error, { id: toastId });
        return;
      }

      toast.success("Xóa bản ghi lương thành công.", { id: toastId });
      refresh();
    },
    [refresh],
  );

  const onConfirmPayment = async (amount: number) => {
    if (!paying) return;

    const toastId = toast.loading("Đang ghi nhận thanh toán...");
    const result = await payEmployeeSalaryAction(paying.id, amount);

    if (!result.success) {
      toast.error(result.error, { id: toastId });
      return;
    }

    toast.success("Thanh toán lương thành công.", { id: toastId });
    setPaying(null);
    refresh();
  };

  const { data, error, isLoading } = useSWR(
    key,
    () => requireData(fetchSalaries(month, year)),
    { fallbackData: initialData },
  );

  const vendorKey = cacheKeys.financeVendorCosts(month, year);
  const { data: vendorData, error: vendorError, isLoading: vendorLoading } = useSWR(
    vendorKey,
    () => fetchVendorCosts(month, year),
    { fallbackData: { items: [], total_cost: 0, total_jobs: 0, vendor_count: 0, month, year } }
  );

  useEffect(() => {
    if (error) toast.error(error.message || "Không tải được bảng lương.");
    if (vendorError) toast.error(vendorError.message || "Không tải được chi phí thợ ngoài.");
  }, [error, vendorError]);

  const salaryData = data || initialData;
  const allItems = useMemo(() => salaryData.items || [], [salaryData.items]);
  const hasPayrollData = allItems.length > 0;

  const scopeTabs = useMemo(
    () => [
      { label: "Tất cả", value: "all", count: allItems.length },
      {
        label: "Cần trả",
        value: "unpaid",
        count: allItems.filter((item) => item.remaining_amount > 0).length,
      },
      {
        label: "Đã trả",
        value: "paid",
        count: allItems.filter((item) => item.remaining_amount <= 0).length,
      },
      {
        label: "Có điều chỉnh",
        value: "adjusted",
        count: allItems.filter(hasAdjustments).length,
      },
    ],
    [allItems],
  );

  const positionOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of allItems) {
      const value = item.position?.trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (!seen.has(key)) seen.set(key, value);
    }

    return [
      { value: "all", label: "Vị trí" },
      ...Array.from(seen.entries())
        .sort((a, b) => a[1].localeCompare(b[1], "vi"))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [allItems]);

  const roleOptions = useMemo(() => {
    const roleLabels: Record<string, string> = {
      admin: "Admin",
      manager: "Quản lý",
      sale: "Sale",
      media: "Media",
      ctv: "CTV",
    };
    const seen = new Set<string>();
    for (const item of allItems) {
      if (item.role) seen.add(item.role);
    }

    return [
      { value: "all", label: "Loại" },
      ...Array.from(seen)
        .sort()
        .map((value) => ({ value, label: roleLabels[value] || value })),
    ];
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const next = allItems.filter((item) => {
      if (scope === "unpaid" && item.remaining_amount <= 0) return false;
      if (scope === "paid" && item.remaining_amount > 0) return false;
      if (scope === "adjusted" && !hasAdjustments(item)) return false;

      if (position !== "all") {
        const current = item.position?.trim().toLowerCase() || "";
        if (current !== position) return false;
      }

      if (role !== "all" && item.role !== role) return false;

      return true;
    });

    if (sort === "remaining_desc") {
      return [...next].sort((left, right) => right.remaining_amount - left.remaining_amount);
    }

    if (sort === "net_desc") {
      return [...next].sort((left, right) => right.net_salary - left.net_salary);
    }

    if (sort === "name_asc") {
      return [...next].sort((left, right) =>
        left.employee_name.localeCompare(right.employee_name, "vi", {
          sensitivity: "base",
        }),
      );
    }

    return next;
  }, [allItems, position, role, scope, sort]);

  const hasActiveFilters = scope !== "all" || position !== "all" || role !== "all" || sort !== "default";
  const shouldShowResultMeta = filteredItems.length > 0 && filteredItems.length !== allItems.length;

  const resetFilters = useCallback(() => {
    setScope("all");
    setPosition("all");
    setRole("all");
    setSort("default");
  }, []);

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
    if (
      !window.confirm(
        `Khởi tạo bảng lương tháng ${month}/${year} cho toàn bộ nhân sự Đang làm?\n\nChú ý: Lương sẽ được tổng hợp dựa theo KPI (Work Progress) của tháng.`,
      )
    ) {
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Đang kiểm tra dữ liệu...");

    const validateRes = await validatePayrollWarningsAction(month, year);
    if (!validateRes.success) {
      toast.error(validateRes.error || "Lỗi kiểm tra dữ liệu kế toán", { id: toastId });
      setIsGenerating(false);
      return;
    }

    const payload = (validateRes as { data?: { warnings?: { unassignedTasks?: string[]; zeroCostTasks?: string[] } } }).data;
    const warnings = payload?.warnings || { unassignedTasks: [], zeroCostTasks: [] };
    const unassignedTasks = warnings.unassignedTasks || [];
    const zeroCostTasks = warnings.zeroCostTasks || [];

    if (unassignedTasks.length > 0 || zeroCostTasks.length > 0) {
      let warningMsg = "CẢNH BÁO DỮ LIỆU CẦN KIỂM TRA:\n\n";

      if (unassignedTasks.length > 0) {
        warningMsg += `1. Có ${unassignedTasks.length} hợp đồng hoàn thành nhưng CHƯA GÁN nhân viên:\n   - ${unassignedTasks.slice(0, 5).join("\n   - ")}${unassignedTasks.length > 5 ? "\n   ..." : ""}\n\n`;
      }

      if (zeroCostTasks.length > 0) {
        warningMsg += `2. Có ${zeroCostTasks.length} hợp đồng có công việc lương 0đ:\n   - ${zeroCostTasks.slice(0, 5).join("\n   - ")}${zeroCostTasks.length > 5 ? "\n   ..." : ""}\n\n`;
      }

      warningMsg += "Những công việc này sẽ KHÔNG được tính vào bảng lương lần này.\nBạn có muốn tiếp tục khởi tạo không?";

      if (!window.confirm(warningMsg)) {
        toast.dismiss(toastId);
        setIsGenerating(false);
        return;
      }
    }

    toast.loading("Hệ thống đang tổng hợp dữ liệu lương...", { id: toastId });
    const result = await generateMonthlySalaryAction(month, year);
    setIsGenerating(false);

    if (!result.success) {
      toast.error(result.error, { id: toastId });
      return;
    }

    if (
      result.data
      && typeof result.data === "object"
      && "success" in result.data
      && result.data.success === false
    ) {
      toast.error(result.data.error || "Có lỗi bất ngờ xảy ra", { id: toastId });
      return;
    }

    const message =
      result.data && typeof result.data === "object" && "message" in result.data
        ? result.data.message
        : "Khởi tạo bảng lương thành công";

    toast.success(message as string, { id: toastId });
    refresh();
  };

  return (
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Bảng lương", href: "/finance/salaries" },
        ]}
      />

      {/* View Mode Tabs */}
      <section className="entrance entrance-0">
        <TabsFilter
          tabs={[
            { label: "Lương nhân viên", value: "salaries", count: allItems.length },
            { label: "Chi phí thợ ngoài", value: "vendors", count: vendorData?.vendor_count || 0 },
          ]}
          activeTab={viewMode}
          onChange={(value) => setViewMode(value as "salaries" | "vendors")}
        />
      </section>

      <section className="entrance entrance-1">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-card px-5 py-3 shadow-xs">
          <SalaryStatsBar summary={viewMode === "salaries" ? salaryData.summary : {
            total: vendorData?.vendor_count || 0,
            totalSalary: vendorData?.total_cost || 0,
            totalPaid: 0,
            totalRemaining: vendorData?.total_cost || 0,
          }} />
          <div className="hidden shrink-0 lg:flex">
            {!isLoading ? (
              <Button
                type="button"
                onClick={handleGenerateSalary}
                disabled={isGenerating}
                variant={hasPayrollData ? "secondary" : "primary"}
                className={`gap-2 whitespace-nowrap ${hasPayrollData ? "" : "shadow-sm"}`}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : hasPayrollData ? (
                  <RefreshCw className="h-4 w-4" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                {hasPayrollData ? `Cập nhật lương T${month}` : `Tạo bảng lương T${month}`}
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {!isLoading && viewMode === "salaries" ? (
        <FAB
          onClick={handleGenerateSalary}
          label={hasPayrollData ? `Cập nhật T${month}` : `Tạo lương T${month}`}
        />
      ) : null}

      {viewMode === "salaries" ? (
        <>
          <section className="entrance entrance-2">
            <SalaryFilters
          scope={scope}
          position={position}
          role={role}
          sort={sort}
          month={String(month)}
          year={String(year)}
          tabs={scopeTabs}
          positionOptions={positionOptions}
          roleOptions={roleOptions}
          sortOptions={SORT_OPTIONS}
          monthOptions={monthOptions}
          yearOptions={yearOptions}
          hasActiveFilters={hasActiveFilters}
          onScopeChange={setScope}
          onPositionChange={setPosition}
          onRoleChange={setRole}
          onSortChange={setSort}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          onReset={resetFilters}
        />
      </section>

          <section className="entrance entrance-3">
            {isLoading && !data ? (
              <div className="space-y-4 pt-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="card-base hidden border-0 bg-transparent shadow-none lg:block">
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
                  onPrint={handlePrint}
                  onDelete={handleDelete}
                  busyId={deletingId}
                />
                {shouldShowResultMeta ? (
                  <p className="text-center text-caption text-text-muted">
                    Hiển thị {filteredItems.length} / {allItems.length} nhân sự
                  </p>
                ) : null}
              </>
            )}
          </section>
        </>
      ) : (
        <>
          {/* Vendor costs view */}
          <section className="entrance entrance-2">
            {vendorLoading && !vendorData ? (
              <div className="space-y-4 pt-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="card-base hidden border-0 bg-transparent shadow-none lg:block">
                  <VendorCostDesktopTable items={vendorData?.items || []} />
                </div>
                <VendorCostMobileList items={vendorData?.items || []} />
                {vendorData && vendorData.items.length > 0 && (
                  <p className="text-center text-caption text-text-muted">
                    Tổng: {vendorData.vendor_count} thợ ngoài, {vendorData.total_jobs} jobs
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}

      <SalaryDetailModal
        item={viewing}
        onClose={() => setViewing(null)}
        onDeleteAdjustment={deleteAdjustment}
        deletingId={deletingId}
      />
      {adjusting ? (
        <SalaryAdjustmentModal
          salary={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={refresh}
        />
      ) : null}
      {printing ? <PayslipModal salary={printing} onClose={() => setPrinting(null)} /> : null}
      {paying ? (
        <PaymentConfirmModal
          salary={paying}
          onConfirm={onConfirmPayment}
          onClose={() => setPaying(null)}
        />
      ) : null}
    </div>
  );
}
