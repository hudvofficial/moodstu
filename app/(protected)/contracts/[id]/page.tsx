export const metadata = { title: "Chi tiết hợp đồng" };

import { getContractDetail } from "@/app/actions/contract-queries";
import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";
import type { ContractDetailData } from "@/lib/hooks/use-contract-queries";

// ═══════════════════════════════════════════
// Contract Detail Page — SSR (above-the-fold only)
// Perf: first paint CHỈ chờ contract detail. Gallery summaries KHÔNG còn chặn
// render — DriveGalleryBlock (lazy + on-intersection) tự fetch qua useGalleriesQuery
// khi user cuộn tới, nên bỏ gallery khỏi đường blocking cắt 1 RPC + 1 auth-pass
// khỏi TTFB. Drawer prefetch vẫn warm cache cho contract detail.
// ═══════════════════════════════════════════

export default async function ContractDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const detailResult = await getContractDetail(id);
  const detail = detailResult.success ? (detailResult.data as unknown as ContractDetailData) : null;

  return (
    <ContractDetailClient
      contractId={id}
      initialContract={detail?.contract}
      initialPayments={detail?.payments}
      initialPaymentPlans={detail?.paymentPlans}
      initialReservations={detail?.reservations}
      initialPrintOrders={detail?.printOrders}
    />
  );
}
