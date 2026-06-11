export const metadata = { title: "Chi tiết hợp đồng" };

import ContractDetailClient from "@/components/contracts/detail/contract-detail-client";

// Contract Detail Page - client-first shell.
// Perf: do not block TTFB on contract detail RPC/auth; React Query loads data client-side.
export default async function ContractDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  return <ContractDetailClient contractId={id} />;
}
