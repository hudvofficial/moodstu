export const metadata = { title: "Chi tiết hợp đồng" };

import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";
import { getGallerySummariesByContract } from "@/app/actions/gallery-admin-actions";

// Contract Detail Page - client-first shell.
// Perf: do not block TTFB on contract detail RPC/auth; React Query loads data client-side.
export default async function ContractDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const initialGalleriesResult = await getGallerySummariesByContract(id).catch((error) => {
    console.warn("[ContractDetailPage] Failed to preload galleries", error);
    return { success: false as const, data: [] };
  });

  return (
    <ContractDetailClient
      contractId={id}
      initialGalleries={initialGalleriesResult.success ? initialGalleriesResult.data : []}
    />
  );
}
