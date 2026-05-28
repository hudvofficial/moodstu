export const metadata = { title: "Chi tiết hợp đồng" };

import { getContractDetail } from "@/app/actions/contract-queries";
import { getGallerySummariesByContract } from "@/app/actions/gallery-admin-actions";
import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";
import type { ContractDetailData } from "@/lib/hooks/use-contract-queries";

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

  // ⚡ LOẠI BỎ CHẶN LUỒNG SERVER: Không await fetch data ở đây nữa.
  // Next.js sẽ render ngay lập tức (Thin Server Shell). 
  // Client Component (SWR/React Query) đã có sẵn cache từ Drawer Prefetch nên sẽ render 0ms native!
  // Khi Cold Start (vào trực tiếp URL), sẽ hiện Skeleton Loading.

  return (
    <ContractDetailClient
      contractId={id}
    />
  );
}
