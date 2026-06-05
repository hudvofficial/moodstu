export const metadata = { title: "Chi tiết hợp đồng" };

import { getContractDetail } from "@/app/actions/contract-queries";
import { getGallerySummariesByContract } from "@/app/actions/gallery-admin-actions";
import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";
import type { ContractDetailData } from "@/lib/hooks/use-contract-queries";

// ═══════════════════════════════════════════
// Contract Detail Page — SSR parallel fetch
// Perf: fetch contract detail + gallery summaries SONG SONG trên server,
// truyền initial data → React Query / gallery render ngay, không spinner.
// Drawer prefetch vẫn warm cache cho contract detail (0ms từ drawer);
// gallery data được SSR bổ sung (drawer prefetch không cover gallery).
// ═══════════════════════════════════════════

export default async function ContractDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  // Song song: contract detail + gallery summaries — 1 round-trip server, không chặn nhau.
  const [detailResult, galleriesResult] = await Promise.all([
    getContractDetail(id),
    getGallerySummariesByContract(id),
  ]);

  const detail = detailResult.success ? (detailResult.data as unknown as ContractDetailData) : null;
  const galleries = galleriesResult.success ? galleriesResult.data : undefined;

  return (
    <ContractDetailClient
      contractId={id}
      initialContract={detail?.contract}
      initialPayments={detail?.payments}
      initialPaymentPlans={detail?.paymentPlans}
      initialReservations={detail?.reservations}
      initialPrintOrders={detail?.printOrders}
      initialGalleries={galleries}
    />
  );
}
