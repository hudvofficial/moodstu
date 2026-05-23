import { Suspense } from "react";
import type { Customer } from "@/types/crm";
import CustomerListClient from "@/components/crm/customer-list-client";
import { getCustomers, getCustomerStats } from "@/app/actions/customer-actions";

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

  const [initialDataReq, statsReq] = await Promise.all([
    getCustomers({
      page: page || 1,
      pageSize: 10,
      search: search || undefined,
      source: source || undefined,
      tags: tags || undefined,
    }),
    getCustomerStats(),
  ]);

  const initialData = (initialDataReq.success ? initialDataReq.data : { customers: [], total: 0, totalPages: 1, page: 1, pageSize: 10 }) as unknown as { customers: Customer[]; total: number; totalPages: number; page: number; pageSize: number };
  const stats = statsReq.success ? statsReq.data : { total: 0, newThisMonth: 0, avgLifetimeValue: 0 };

  return (
    <Suspense>
      <CustomerListClient 
        initialData={initialData} 
        stats={stats} 
      />
    </Suspense>
  );
}

