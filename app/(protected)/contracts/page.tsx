import ContractsListClient from "@/components/contracts/contracts-list-client";
import {
  getContractList,
  getContractStats,
} from "@/app/actions/contract-queries";
import type { ContractFilters, ContractStats } from "@/types/contract";

export const metadata = { title: "Hợp đồng" };

function getStringParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
  fallback = "",
) {
  const value = searchParams[key];
  return typeof value === "string" ? value : fallback;
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ContractFilters {
  const page = Math.max(
    1,
    Number(getStringParam(searchParams, "page", "1")) || 1,
  );

  return {
    status: getStringParam(
      searchParams,
      "status",
      "all",
    ) as ContractFilters["status"],
    search: (
      getStringParam(searchParams, "q") ||
      getStringParam(searchParams, "search")
    ).trim(),
    time: getStringParam(searchParams, "time", "all"),
    service: getStringParam(
      searchParams,
      "service",
      "all",
    ) as ContractFilters["service"],
    sort: getStringParam(searchParams, "sort", "newest"),
    startDate: getStringParam(searchParams, "startDate"),
    endDate: getStringParam(searchParams, "endDate"),
    advanced: getStringParam(searchParams, "advanced", "false") === "true",
    page,
  };
}

export default async function ContractsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const filters = parseFilters(searchParams);

  const [listResult, statsResult] = await Promise.all([
    getContractList(filters),
    getContractStats(),
  ]);

  if (!listResult.success) {
    throw new Error(listResult.error);
  }

  if (!statsResult.success) {
    throw new Error(statsResult.error);
  }

  return (
    <ContractsListClient
      initialData={
        listResult.data as {
          contracts: Record<string, unknown>[];
          total: number;
          page: number;
          pageSize: number;
        }
      }
      initialStats={statsResult.data as ContractStats}
    />
  );
}
