import ContractsListClient from "@/components/contracts/contracts-list-client";
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
  const params = await searchParams;
  const filters = buildContractFilters(params);

  return (
    <ContractsListClient
      initialFilters={filters}
    />
  );
}
