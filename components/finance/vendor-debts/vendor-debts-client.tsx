"use client";

import { useCallback, useState } from "react";
import { RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { fetchVendorDebtSummary } from "@/app/actions/vendor-payment-actions";
import { fetchVendorCosts } from "@/app/actions/vendor-reports-queries";
import { VendorDebtsStatsBar } from "./vendor-debts-stats-bar";
import { VendorDebtsDesktopTable } from "./vendor-debts-desktop-table";
import { VendorDebtsMobileList } from "./vendor-debts-mobile-list";
import { VendorPaymentModal } from "./vendor-payment-modal";
import { VendorCostDesktopTable } from "@/components/finance/salaries/vendor-cost-desktop-table";
import { VendorCostMobileList } from "@/components/finance/salaries/vendor-cost-mobile-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { invalidateFinanceAfterWrite } from "@/lib/cache-invalidation";
import { cacheKeys, mutate, useSWR } from "@/lib/swr";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import type { VendorDebtItem } from "@/types/vendor";
import type { VendorCostSummary } from "@/types/finance-operations";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

interface VendorDebtsClientProps {
  initialData: VendorDebtItem[];
}

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

export function VendorDebtsClient({ initialData }: VendorDebtsClientProps) {
  const [activeTab, setActiveTab] = useState<"debts" | "costs">("debts");
  const [payingVendor, setPayingVendor] = useState<VendorDebtItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const { monthOptions, yearOptions } = useFinanceFilters(year);

  const key = "vendor-debts";

  // Fetch vendor debts with SWR
  const { data, isLoading, mutate: revalidate } = useSWR(
    key,
    () => requireData(fetchVendorDebtSummary()),
    {
      fallbackData: initialData,
      revalidateOnFocus: false, // Disabled: RPC is expensive, use manual refresh instead
    }
  );

  // Fetch vendor costs
  const vendorCostKey = cacheKeys.financeVendorCosts(month, year);
  const { data: vendorCostData, isLoading: vendorCostLoading } = useSWR<VendorCostSummary>(
    vendorCostKey,
    () => requireData(fetchVendorCosts(month, year)),
    {
      fallbackData: { items: [], total_cost: 0, total_jobs: 0, vendor_count: 0, month, year },
      revalidateOnFocus: false, // Disabled: Query is expensive, use manual refresh instead
    }
  );

  const debts: VendorDebtItem[] = data || [];
  const vendorCosts = vendorCostData || { items: [], total_cost: 0, total_jobs: 0, vendor_count: 0, month, year };

  const handlePay = useCallback((item: VendorDebtItem) => {
    setPayingVendor(item);
  }, []);

  const handlePaymentSuccess = useCallback(async () => {
    // Invalidate caches
    await Promise.all([
      revalidate(),
      invalidateFinanceAfterWrite({}),
      mutate("finance-salaries"), // Has vendor tab
      mutate("finance-dashboard"),
    ]);

    toast.success("Đã cập nhật công nợ");
  }, [revalidate]);

  const handleRefresh = useCallback(async () => {
    setBusyId("refreshing");
    try {
      await revalidate();
      toast.success("Đã làm mới dữ liệu");
    } catch (error) {
      toast.error("Không thể làm mới dữ liệu");
    } finally {
      setBusyId(null);
    }
  }, [revalidate]);

  return (
    <div className="main-container gap-4!">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Quản lý Vendor", href: "/finance/vendor-debts" },
        ]}
      />

      {/* Tabs */}
      <section className="entrance entrance-0">
        <TabsFilter
          tabs={[
            { label: "Công nợ & Thanh toán", value: "debts", count: debts.length },
            { label: "Báo cáo chi phí", value: "costs", count: vendorCosts.vendor_count },
          ]}
          activeTab={activeTab}
          onChange={(value) => setActiveTab(value as "debts" | "costs")}
        />
      </section>

      {activeTab === "debts" ? (
        <>
          {/* Stats Bar */}
          <section className="entrance entrance-1">
            {isLoading && debts.length === 0 ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <VendorDebtsStatsBar debts={debts} />
            )}
          </section>

          {/* Desktop Table */}
          <section className="entrance entrance-2">
            {isLoading && debts.length === 0 ? (
              <div className="hidden lg:block">
                <Skeleton className="h-96 w-full" />
              </div>
            ) : (
              <VendorDebtsDesktopTable items={debts} onPay={handlePay} />
            )}

            {/* Mobile List */}
            {isLoading && debts.length === 0 ? (
              <div className="lg:hidden space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <VendorDebtsMobileList items={debts} busyId={busyId} onPay={handlePay} />
            )}
          </section>

          {/* Empty state */}
          {!isLoading && debts.length === 0 && (
            <section className="entrance entrance-3">
              <div className="card-base py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <h3 className="mb-2 text-h3 font-bold text-text-primary">Không có công nợ</h3>
                <p className="text-body-sm text-text-muted">
                  Tất cả vendor đã được thanh toán đầy đủ
                </p>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {/* Vendor Costs View */}
          <section className="entrance entrance-1">
            <div className="flex items-center gap-3">
              <SelectPill
                value={String(month)}
                onChange={(value: string) => setMonth(Number(value))}
                options={monthOptions}
                placeholder="Tháng"
              />
              <SelectPill
                value={String(year)}
                onChange={(value: string) => setYear(Number(value))}
                options={yearOptions}
                placeholder="Năm"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={busyId === "refreshing"}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${busyId === "refreshing" ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
            </div>
          </section>

          <section className="entrance entrance-2">
            {vendorCostLoading ? (
              <div className="space-y-4 pt-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <div className="card-base hidden border-0 bg-transparent shadow-none lg:block">
                  <VendorCostDesktopTable items={vendorCosts.items} />
                </div>
                <VendorCostMobileList items={vendorCosts.items} />
                {vendorCosts.items.length > 0 && (
                  <p className="text-center text-caption text-text-muted">
                    Tổng: {vendorCosts.vendor_count} thợ ngoài, {vendorCosts.total_jobs} jobs
                  </p>
                )}
              </>
            )}
          </section>
        </>
      )}

      {/* Payment Modal */}
      <VendorPaymentModal
        isOpen={!!payingVendor}
        onClose={() => setPayingVendor(null)}
        vendorId={payingVendor?.vendor_id}
        vendorName={payingVendor?.vendor_name}
        onSuccess={handlePaymentSuccess}
      />

      {/* FAB for mobile - only show in debts tab */}
      {activeTab === "debts" && (
        <FAB
          icon={DollarSign}
          label="Thanh toán"
          onClick={() => {
            // Quick pay - show first vendor if available
            if (debts.length > 0) {
              handlePay(debts[0]);
            } else {
              toast.info("Không có vendor nào cần thanh toán");
            }
          }}
          className="lg:hidden"
        />
      )}
    </div>
  );
}
