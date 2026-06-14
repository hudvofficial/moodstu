"use client";

import { useCallback, useState } from "react";
import { RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { fetchVendorDebtSummary } from "@/app/actions/vendor-payment-actions";
import { fetchVendorCosts } from "@/app/actions/vendor-reports-queries";
import { VendorDebtsStatsBar } from "./vendor-debts-stats-bar";
import { VendorCostsStatsBar } from "./vendor-costs-stats-bar";
import { VendorDebtsDesktopTable } from "./vendor-debts-desktop-table";
import { VendorDebtsMobileList } from "./vendor-debts-mobile-list";
import { VendorPaymentModal } from "./vendor-payment-modal";
import { VendorPaymentHistoryDrawer } from "./vendor-payment-history-drawer";
import { VendorCostDesktopTable } from "@/components/finance/salaries/vendor-cost-desktop-table";
import { VendorCostMobileList } from "@/components/finance/salaries/vendor-cost-mobile-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { TierSwitch } from "@/components/ui/tier-switch";
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
  const [historyVendor, setHistoryVendor] = useState<VendorDebtItem | null>(null);
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
      revalidateOnFocus: false,
    }
  );

  // Fetch vendor costs
  const vendorCostKey = cacheKeys.financeVendorCosts(month, year);
  const { data: vendorCostData, isLoading: vendorCostLoading } = useSWR<VendorCostSummary>(
    vendorCostKey,
    () => requireData(fetchVendorCosts(month, year)),
    {
      fallbackData: { items: [], total_cost: 0, total_jobs: 0, vendor_count: 0, month, year },
      revalidateOnFocus: false,
    }
  );

  const debts: VendorDebtItem[] = data || [];
  const vendorCosts = vendorCostData || { items: [], total_cost: 0, total_jobs: 0, vendor_count: 0, month, year };

  const handlePay = useCallback((item: VendorDebtItem) => {
    setPayingVendor(item);
  }, []);

  const handleHistory = useCallback((item: VendorDebtItem) => {
    setHistoryVendor(item);
  }, []);

  const handlePaymentSuccess = useCallback(async () => {
    await Promise.all([
      revalidate(),
      invalidateFinanceAfterWrite({}),
      mutate("finance-salaries"),
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
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Quản lý Vendor", href: "/finance/vendor-debts" },
        ]}
      />

      {/* ── Stats Bar (Nằm trên cùng giống Hợp đồng/Lương) ── */}
      <section className="entrance entrance-0">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-card px-5 py-3 shadow-xs">
          {activeTab === "debts" ? (
            isLoading && debts.length === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <VendorDebtsStatsBar debts={debts} />
            )
          ) : (
            vendorCostLoading && vendorCosts.vendor_count === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <VendorCostsStatsBar summary={vendorCosts} />
            )
          )}
          {/* Action button giữ chỗ cho giống hệ thống */}
          <div className="hidden lg:flex shrink-0" />
        </div>
      </section>

      {/* ── Tabs + Dropdown Filters (Nằm dưới Stats) ── */}
      <section className="entrance entrance-1">
        <TierSwitch
          phone={
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
              <TabsFilter
                tabs={[
                  { label: "Công nợ & Thanh toán", value: "debts", count: debts.length },
                  { label: "Báo cáo chi phí", value: "costs", count: vendorCosts.vendor_count },
                ]}
                activeTab={activeTab}
                onChange={(value) => setActiveTab(value as "debts" | "costs")}
                variant="pills"
              />
              {activeTab === "costs" && (
                <>
                  <div className="h-5 border-l border-border shrink-0" />
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
                </>
              )}
            </div>
          }
          desktop={
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <TabsFilter
                  tabs={[
                    { label: "Công nợ & Thanh toán", value: "debts", count: debts.length },
                    { label: "Báo cáo chi phí", value: "costs", count: vendorCosts.vendor_count },
                  ]}
                  activeTab={activeTab}
                  onChange={(value) => setActiveTab(value as "debts" | "costs")}
                />
              </div>
              {activeTab === "costs" && (
                <div className="flex shrink-0 items-center gap-3">
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
              )}
            </div>
          }
        />
      </section>

      {/* ── Table Area ── */}
      <section className="entrance entrance-2">
        {activeTab === "debts" ? (
          <>
            <TierSwitch
              phone={
                isLoading && debts.length === 0 ? (
                  <div className="space-y-2">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : (
                  <VendorDebtsMobileList items={debts} busyId={busyId} onPay={handlePay} onHistory={handleHistory} />
                )
              }
              desktop={
                isLoading && debts.length === 0 ? (
                  <Skeleton className="h-96 w-full" />
                ) : (
                  <VendorDebtsDesktopTable items={debts} onPay={handlePay} onHistory={handleHistory} />
                )
              }
            />

            {!isLoading && debts.length === 0 && (
              <div className="card-base py-16 text-center mt-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <h3 className="mb-2 text-h3 font-bold text-text-primary">Không có công nợ</h3>
                <p className="text-body-sm text-text-muted">Tất cả vendor đã được thanh toán đầy đủ</p>
              </div>
            )}
          </>
        ) : (
          <>
            {vendorCostLoading ? (
              <div className="space-y-4 pt-4">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                <TierSwitch
                  phone={<VendorCostMobileList items={vendorCosts.items} />}
                  desktop={
                    <div className="card-base border-0 bg-transparent shadow-none">
                      <VendorCostDesktopTable items={vendorCosts.items} />
                    </div>
                  }
                />
                {vendorCosts.items.length > 0 && (
                  <p className="text-center text-caption text-text-muted mt-3">
                    Tổng: {vendorCosts.vendor_count} thợ ngoài, {vendorCosts.total_jobs} jobs
                  </p>
                )}
              </>
            )}
          </>
        )}
      </section>

      {/* Payment Modal */}
      <VendorPaymentModal
        isOpen={!!payingVendor}
        onClose={() => setPayingVendor(null)}
        vendorId={payingVendor?.vendor_id}
        vendorName={payingVendor?.vendor_name}
        onSuccess={handlePaymentSuccess}
      />

      <VendorPaymentHistoryDrawer
        open={!!historyVendor}
        onOpenChange={(open) => {
          if (!open) setHistoryVendor(null);
        }}
        vendorId={historyVendor?.vendor_id ?? null}
        vendorName={historyVendor?.vendor_name ?? ""}
        onVoidSuccess={handlePaymentSuccess}
      />

      {/* FAB for mobile */}
      {activeTab === "debts" && (
        <FAB
          icon={DollarSign}
          label="Thanh toán"
          onClick={() => {
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
