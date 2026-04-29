import DressesListClient from "@/components/dresses/dresses-list-client";
import { fetchDressList, getDressStats } from "@/app/actions/dress-queries";
import { getAuthenticatedUserContext } from "@/lib/auth_utils";
import type { DressFilters } from "@/types/dress";

export const metadata = { title: "Trang phục" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    category?: string;
    sort?: string;
    q?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function DressesPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: DressFilters = {
    status: params.status as DressFilters["status"],
    category: params.category as DressFilters["category"],
    sort: params.sort as DressFilters["sort"],
    search: params.q || params.search,
    page: params.page ? Number(params.page) : 1,
  };

  const [list, stats, context] = await Promise.all([
    fetchDressList(filters),
    getDressStats(),
    getAuthenticatedUserContext(),
  ]);
  const canManageCatalog = context?.shellRole === "admin" || context?.shellRole === "manager";

  return (
    <DressesListClient
      initialList={list}
      initialStats={stats}
      canManageCatalog={canManageCatalog}
    />
  );
}

