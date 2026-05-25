import { fetchVendorDebtSummary } from "@/app/actions/vendor-payment-actions";
import { VendorDebtsClient } from "@/components/finance/vendor-debts/vendor-debts-client";
import type { VendorDebtItem } from "@/types/vendor";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function unwrap<T>(result: ActionResult<T>, fallback: T): T {
  return result.success ? result.data : fallback;
}

export const metadata = { title: "Quản lý Vendor" };
export const dynamic = "force-dynamic";

export default async function VendorDebtsPage() {
  const data = await fetchVendorDebtSummary();

  return <VendorDebtsClient initialData={unwrap<VendorDebtItem[]>(data, [])} />;
}
