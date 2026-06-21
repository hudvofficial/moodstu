import { Suspense } from "react";
import type { Customer } from "@/types/crm";
import CustomerListClient from "@/components/crm/customer-list-client";
import { getCustomers } from "@/app/actions/customer-actions";

export const metadata = {
  title: "Khách hàng CRM",
  description: "Quản lý dữ liệu khách hàng",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? parseInt(sp.page, 10) : 1;
  const search = typeof sp.search === "string" ? sp.search : undefined;
  const source = typeof sp.source === "string" ? sp.source : undefined;
  const tags = typeof sp.tags === "string" ? sp.tags : undefined;

  const result = await getCustomers({ page, pageSize: 10, search, source, tags });
  const fallbackData = { customers: [] as Customer[], total: 0, totalPages: 1, page, pageSize: 10 };
  const initialData = result.success
    ? { ...result.data, customers: result.data.customers as Customer[] }
    : fallbackData;
  const stats = { total: 0, newThisMonth: 0, avgLifetimeValue: 0 };

  return (
    <Suspense>
      <CustomerListClient
        initialData={initialData}
        stats={stats}
      />
    </Suspense>
  );
}
