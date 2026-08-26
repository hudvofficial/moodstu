"use client";

import { useCallback, useMemo, useState } from "react";
import { DollarSign, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchPayables } from "@/app/actions/payable-actions";
import { fetchVendorCosts } from "@/app/actions/vendor-reports-queries";
import { PayablesStatsBar } from "./payables-stats-bar";
import { PayablesDesktopTable } from "./payables-desktop-table";
import { PayablesMobileList } from "./payables-mobile-list";
import { PayeePaymentModal, type PayeeRef } from "./payee-payment-modal";
import { PayeeHistoryDrawer } from "./payee-history-drawer";
import { VendorCostsStatsBar } from "./vendor-costs-stats-bar";
import { VendorCostDesktopTable } from "@/components/finance/salaries/vendor-cost-desktop-table";
import { VendorCostMobileList } from "@/components/finance/salaries/vendor-cost-mobile-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { SelectPill } from "@/components/ui/select/SelectPill";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsFilter } from "@/components/ui/tabs-filter";
import { TierSwitch } from "@/components/ui/tier-switch";
import { useFinanceFilters } from "@/hooks/use-finance-filters";
import { invalidateFinanceAfterWrite } from "@/lib/cache-invalidation";
import { cacheKeys, mutate, revalidateByPrefixes, useSWR } from "@/lib/swr";
import type { ActionResult } from "@/types/action-result";
import type { VendorCostSummary } from "@/types/finance-operations";
import { PAYEE_TYPE_LABEL, PAYEE_TYPES, type PayableRow } from "@/types/payables";

// ADR-016 M2 — màn "Phải trả" hợp nhất: lab ảnh · thợ ngoài · NCC phôi (thay /finance/lab-debts + /finance/vendor-debts).
// Tab "Chi phí thợ ngoài" = báo cáo theo tháng (ngày sự kiện) chuyển nguyên từ trang vendor cũ.

interface PayablesClientProps {
  initialData: PayableRow[];
}

type Tab = "payables" | "costs";

const TYPE_OPTIONS = [
  { value: "all", label: "Tất cả đối tác" },
  ...PAYEE_TYPES.map((type) => ({ value: type, label: PAYEE_TYPE_LABEL[type] })),
];

async function requireData<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

function toPayeeRef(row: PayableRow): PayeeRef {
  return { payee_type: row.payee_type, payee_id: row.payee_id, payee_name: row.payee_name };
}

export function PayablesClient({ initialData }: PayablesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("payables");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paying, setPaying] = useState<PayeeRef | null>(null);
  const [history, setHistory] = useState<PayeeRef | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const { monthOptions, yearOptions } = useFinanceFilters(year);

  const { data, isLoading, mutate: revalidate } = useSWR(
    cacheKeys.payables(),
    () => requireData(fetchPayables()),
    { fallbackData: initialData, revalidateOnFocus: false },
  );

  const vendorCostKey = cacheKeys.financeVendorCosts(month, year);
  const { data: vendorCostData, isLoading: vendorCostLoading } = useSWR<VendorCostSummary>(
    activeTab === "costs" ? vendorCostKey : null,
    () => requireData(fetchVendorCosts(month, year)),
    { revalidateOnFocus: false },
  );

  const rows = useMemo<PayableRow[]>(() => data ?? [], [data]);
  const visibleRows = useMemo(
    () => (typeFilter === "all" ? rows : rows.filter((row) => row.payee_type === typeFilter)),
    [rows, typeFilter],
  );
  const vendorCosts = vendorCostData || { items: [], total_cost: 0, total_jobs: 0, vendor_count: 0, month, year };

  const handlePay = useCallback((row: PayableRow) => setPaying(toPayeeRef(row)), []);
  const handleHistory = useCallback((row: PayableRow) => setHistory(toPayeeRef(row)), []);

  // Sau khi trả/huỷ: số luôn từ server — revalidate SWR (finance + printing/labs vì công nợ lab hiện ở /printing)
  const handleChanged = useCallback(async () => {
    await Promise.all([
      revalidate(),
      invalidateFinanceAfterWrite({}),
      mutate("finance-salaries"),
      revalidateByPrefixes(["printing", "labs", "payee-history", "payable-items"]),
    ]);
  }, [revalidate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await revalidate();
      toast.success("Đã làm mới dữ liệu");
    } catch {
      toast.error("Không thể làm mới dữ liệu");
    } finally {
      setRefreshing(false);
    }
  }, [revalidate]);

  const tabs = [
    { label: "Phải trả", value: "payables", count: rows.length },
    { label: "Chi phí thợ ngoài", value: "costs", count: vendorCosts.vendor_count },
  ];

  const periodPills = (
    <>
      <SelectPill value={String(month)} onChange={(value) => setMonth(Number(value))} options={monthOptions} placeholder="Tháng" />
      <SelectPill value={String(year)} onChange={(value) => setYear(Number(value))} options={yearOptions} placeholder="Năm" />
    </>
  );

  return (
    <div className="main-container gap-4!">
      <Breadcrumb
        items={[
          { label: "Tài chính", href: "/finance" },
          { label: "Phải trả", href: "/finance/payables" },
        ]}
      />

      <section className="entrance entrance-0">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-bg-card px-5 py-3 shadow-xs">
          {activeTab === "payables" ? (
            isLoading && rows.length === 0 ? <Skeleton className="h-10 w-full" /> : <PayablesStatsBar rows={rows} />
          ) : vendorCostLoading && vendorCosts.vendor_count === 0 ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <VendorCostsStatsBar summary={vendorCosts} />
          )}
          <div className="hidden lg:flex shrink-0">
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </section>

      <section className="entrance entrance-1">
        <TierSwitch
          phone={
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide">
              <TabsFilter tabs={tabs} activeTab={activeTab} onChange={(value) => setActiveTab(value as Tab)} variant="pills" />
              <div className="h-5 border-l border-border shrink-0" />
              {activeTab === "payables" ? (
                <SelectPill value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} placeholder="Đối tác" />
              ) : (
                periodPills
              )}
            </div>
          }
          desktop={
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <TabsFilter tabs={tabs} activeTab={activeTab} onChange={(value) => setActiveTab(value as Tab)} />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {activeTab === "payables" ? (
                  <SelectPill value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} placeholder="Đối tác" />
                ) : (
                  periodPills
                )}
              </div>
            </div>
          }
        />
      </section>

      <section className="entrance entrance-2">
        {activeTab === "payables" ? (
          <>
            <TierSwitch
              phone={
                isLoading && rows.length === 0 ? (
                  <div className="space-y-2">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : (
                  <PayablesMobileList items={visibleRows} onPay={handlePay} onHistory={handleHistory} />
                )
              }
              desktop={
                isLoading && rows.length === 0 ? (
                  <Skeleton className="h-96 w-full" />
                ) : (
                  <PayablesDesktopTable items={visibleRows} onPay={handlePay} onHistory={handleHistory} />
                )
              }
            />
            {!isLoading && rows.length === 0 && (
              <div className="card-base py-16 text-center mt-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <h3 className="mb-2 text-h3 font-bold text-text-primary">Không có công nợ phải trả</h3>
                <p className="text-body-sm text-text-muted">Lab, thợ ngoài và nhà cung cấp đều đã được thanh toán đủ</p>
              </div>
            )}
          </>
        ) : vendorCostLoading ? (
          <div className="space-y-4 pt-4">
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
                Tổng: {vendorCosts.vendor_count} thợ ngoài, {vendorCosts.total_jobs} jobs · theo ngày sự kiện
              </p>
            )}
          </>
        )}
      </section>

      <PayeePaymentModal isOpen={!!paying} onClose={() => setPaying(null)} payee={paying} onSuccess={handleChanged} />

      <PayeeHistoryDrawer
        open={!!history}
        onOpenChange={(open) => {
          if (!open) setHistory(null);
        }}
        payee={history}
        onVoidSuccess={handleChanged}
      />

      {activeTab === "payables" && (
        <FAB
          icon={DollarSign}
          label="Thanh toán"
          onClick={() => {
            const first = visibleRows.find((row) => row.remaining > 0);
            if (first) handlePay(first);
            else toast.info("Không có đối tác nào cần thanh toán");
          }}
          className="lg:hidden"
        />
      )}
    </div>
  );
}
