export const metadata = { title: "Chi tiết hợp đồng" };

import { getContractDetail } from "@/app/actions/contract-queries";
import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";
import type { ContractDetailData } from "@/lib/hooks/use-contracts";

// ═══════════════════════════════════════════
// Contract Detail Page — Thin Server Shell
// Perf: No server-side data fetch — SWR cache provides instant render
// when navigating from drawer (prefetchContractDetail warm cache).
// Cold start: skeleton → SWR fetch → render.
// ═══════════════════════════════════════════

export default async function ContractDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // ⚡ SSR: Fetch contract detail on the server to eliminate cold-start skeleton
  let initialData: ContractDetailData | undefined;
  
  try {
    const result = await getContractDetail(id);
    if (result.success) {
      initialData = result.data as ContractDetailData;
    } else {
      console.error("Contract detail SSR failed:", result.error);
    }
  } catch (error) {
    // Let the client handle the error if not found, or use notFound()
    console.error("Contract detail SSR failed:", error);
  }

  return (
    <ContractDetailClient
      contractId={id}
      initialContract={initialData?.contract}
      initialPayments={initialData?.payments}
      initialPaymentPlans={initialData?.paymentPlans}
      initialReservations={initialData?.reservations}
      initialPrintOrders={initialData?.printOrders}
    />
  );
}
