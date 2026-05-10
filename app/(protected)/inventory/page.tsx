import InventoryListClient from "@/components/inventory/inventory-list-client";
import { fetchInventoryList, getInventoryStats } from "@/app/actions/inventory-queries";
import type { InventoryFilters } from "@/types/inventory";
import type {
  InventoryCategory,
  InventoryFilterStatus,
} from "@/lib/validations/inventory.schema";

export const metadata = { title: "Kho vật tư" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    category?: string;
    sort?: string;
    search?: string;
    q?: string;
    page?: string;
  }>;
}

function warnInitialLoadFailure(label: string, result: PromiseSettledResult<unknown>) {
  if (result.status === "rejected") {
    console.warn(`[inventory] ${label} initial load failed`, result.reason);
  }
}

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: InventoryFilters = {
    status: params.status as InventoryFilterStatus | undefined,
    category: params.category as InventoryCategory | "all" | undefined,
    sort: params.sort as InventoryFilters["sort"],
    search: params.q || params.search,
    page: params.page ? Number(params.page) : 1,
  };

  const [listResult, statsResult] = await Promise.allSettled([
    fetchInventoryList(filters),
    getInventoryStats(),
  ]);
  warnInitialLoadFailure("list", listResult);
  warnInitialLoadFailure("stats", statsResult);

  const list = listResult.status === "fulfilled" ? listResult.value : undefined;
  const stats = statsResult.status === "fulfilled" ? statsResult.value : undefined;

  return <InventoryListClient initialList={list} initialStats={stats} />;
}

