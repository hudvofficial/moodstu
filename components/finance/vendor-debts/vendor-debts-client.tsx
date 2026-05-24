"use client";

import { useCallback, useState } from "react";
import { RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { fetchVendorDebtSummary } from "@/app/actions/vendor-payment-actions";
import { VendorDebtsStatsBar } from "./vendor-debts-stats-bar";
import { VendorDebtsDesktopTable } from "./vendor-debts-desktop-table";
import { VendorDebtsMobileList } from "./vendor-debts-mobile-list";
import { VendorPaymentModal } from "./vendor-payment-modal";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { FAB } from "@/components/ui/fab";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidateFinanceAfterWrite } from "@/lib/cache-invalidation";
import { mutate, useSWR } from "@/lib/swr";
import type { VendorDebtItem } from "@/types/vendor";

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
  const [payingVendor, setPayingVendor] = useState<VendorDebtItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const key = "vendor-debts";

  // Fetch vendor debts with SWR
  const { data, isLoading, mutate: revalidate } = useSWR(
    key,
    () => requireData(fetchVendorDebtSummary()),
    {
      fallbackData: initialData,
      revalidateOnFocus: true,
    }
  );

  const debts: VendorDebtItem[] = data || [];

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
    <div className="container-app space-y-4 pb-20">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Finance", href: "/finance" },
          { label: "Công nợ Vendor", href: "/finance/vendor-debts" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-bold text-text-primary">Công nợ Vendor</h1>
          <p className="text-body-sm text-text-muted">
            Quản lý thanh toán cho thợ ngoài (external contractors)
          </p>
        </div>

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

      {/* Stats Bar */}
      {isLoading && debts.length === 0 ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <VendorDebtsStatsBar debts={debts} />
      )}

      {/* Desktop Table */}
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

      {/* Payment Modal */}
      <VendorPaymentModal
        isOpen={!!payingVendor}
        onClose={() => setPayingVendor(null)}
        vendorId={payingVendor?.vendor_id}
        vendorName={payingVendor?.vendor_name}
        onSuccess={handlePaymentSuccess}
      />

      {/* FAB for mobile */}
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

      {/* Empty state */}
      {!isLoading && debts.length === 0 && (
        <div className="card-base py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <DollarSign className="h-8 w-8 text-success" />
          </div>
          <h3 className="mb-2 text-h3 font-bold text-text-primary">Không có công nợ</h3>
          <p className="text-body-sm text-text-muted">
            Tất cả vendor đã được thanh toán đầy đủ
          </p>
        </div>
      )}
    </div>
  );
}
