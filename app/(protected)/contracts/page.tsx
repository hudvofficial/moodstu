import ContractsListClient from "@/components/contracts/contracts-list-client";
import { getContractList, getContractStats } from "@/app/actions/contract-queries";
import type { ContractFilters } from "@/types/contract";

export const metadata = { title: "Hợp đồng" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildContractFilters(params: Record<string, string | string[] | undefined>): ContractFilters {
  return {
    status: (firstParam(params.status) || "all") as ContractFilters["status"],
    search: firstParam(params.q) || firstParam(params.search) || "",
    time: firstParam(params.time) || "all",
    service: (firstParam(params.service) || "all") as ContractFilters["service"],
    sort: firstParam(params.sort) || "newest",
    startDate: firstParam(params.startDate) || "",
    endDate: firstParam(params.endDate) || "",
    advanced: firstParam(params.advanced) === "true",
    page: Math.max(1, Number(firstParam(params.page)) || 1),
  };
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = buildContractFilters(await searchParams);
  const [listResult, statsResult] = await Promise.all([
    getContractList(filters),
    getContractStats(),
  ]);

  if (!listResult.success) {
    throw new Error(listResult.error || "Không thể tải danh sách hợp đồng");
  }

  if (!statsResult.success) {
    throw new Error(statsResult.error || "Không thể tải thống kê hợp đồng");
  }

  return (
    <ContractsListClient
      initialData={listResult.data}
      initialFilters={filters}
      initialStats={statsResult.data}
    />
  );
}
