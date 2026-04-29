export const metadata = { title: "Chi tiết hợp đồng" };

import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";

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
  return <ContractDetailClient contractId={id} />;
}

