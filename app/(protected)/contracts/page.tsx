import ContractsListClient from "@/components/contracts/contracts-list-client";
import { getContractList, getContractStats } from "@/app/actions/contract-queries";
import type { ContractFilters, ContractStats } from "@/types/contract";

export const metadata = { title: "Hợp đồng" };

// ═══════════════════════════════════════════
// Contracts List Page — SSR prefetch list + stats
// Perf: trước đây client mount xong mới bắn 2 server action TUẦN TỰ (Next.js
// serialize actions), mỗi action trả thuế auth + role riêng (~1.5-2.5s tổng).
// Prefetch trong 1 request RSC: React cache() dedupe auth/employee lookup,
// 2 RPC chạy song song, HTML về là có data — hết skeleton + double-fetch.
// ═══════════════════════════════════════════

export default async function ContractsPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await props.searchParams;

  // QUAN TRỌNG: shape + THỨ TỰ KEY phải khớp `filters` trong useContractFilters —
  // client so initialFilters với filters hiện tại bằng JSON.stringify, lệch là
  // initialData bị bỏ qua (rơi về client fetch như cũ, không vỡ gì).
  const initialFilters = {
    status: sp.status || "all",
    search: sp.q || sp.search || "",
    time: sp.time || "all",
    service: sp.service || "all",
    sort: sp.sort || "newest",
    startDate: sp.startDate || "",
    endDate: sp.endDate || "",
    advanced: sp.advanced === "true",
    page: Math.max(1, Number(sp.page) || 1),
  } as unknown as ContractFilters;

  const [listResult, statsResult] = await Promise.all([
    getContractList(initialFilters),
    getContractStats(),
  ]);

  return (
    <ContractsListClient
      initialData={listResult.success ? listResult.data : undefined}
      initialFilters={initialFilters}
      initialStats={
        statsResult.success ? (statsResult.data as ContractStats) : undefined
      }
    />
  );
}
