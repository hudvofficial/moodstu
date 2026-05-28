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

  // ⚡ LOẠI BỎ CHẶN LUỒNG SERVER: Không await fetch data ở đây nữa.
  // Trả về Thin Server Shell để Next.js route chuyển trang 0ms.
  // Data sẽ được lấy từ SWR Cache hoặc tự động fetch ở Client.
  const initialData = { customers: [], total: 0, totalPages: 1, page: page, pageSize: 10 };
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

