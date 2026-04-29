import { Suspense } from "react";
import type { Metadata } from "next";
import StandaloneRentalsClient from "@/components/dresses/standalone-rentals-client";
import { fetchAllRentals } from "@/app/actions/rental-queries";

export const metadata: Metadata = {
  title: "Đơn thuê vãng lai",
};
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    search?: string;
    q?: string;
    page?: string;
    item_id?: string;
  }>;
}

export default async function RentalsPage({ searchParams }: Props) {
  const params = await searchParams;
  const result = await fetchAllRentals({
    status: params.status && params.status !== "all" ? params.status : undefined,
    search: params.q || params.search || undefined,
    itemId: params.item_id || undefined,
    page: params.page ? Number(params.page) : 1,
    pageSize: 20,
  });

  if (!result.success) {
    throw new Error(result.error || "Khong the tai danh sach don thue trang phuc");
  }

  return (
    <Suspense>
      <StandaloneRentalsClient initialResult={result.data} />
    </Suspense>
  );
}

