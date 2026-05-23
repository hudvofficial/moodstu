import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getCustomerById } from "@/app/actions/customer-actions";
import CustomerDetailClient from "@/components/crm/detail/customer-detail-client";

export const metadata = {
  title: "Chi tiết Khách hàng",
  description: "Hồ sơ Khách hàng CRM",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  if (!id) {
    notFound();
  }

  const result = await getCustomerById(id);

  if (!result.success) {
    return (
      <div className="main-container flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <h2 className="text-h3 text-text-primary">Không tìm thấy khách hàng</h2>
          <p className="text-body text-text-secondary">{result.error || "Khách hàng không tồn tại hoặc đã bị xoá."}</p>
        </div>
      </div>
    );
  }

  const data = result.data;

  const customerDetail = data as {
    customer: any;
    contracts: any[];
    lifetimeValue: number;
  };

  return (
    <Suspense>
      <CustomerDetailClient 
        customerId={id} 
        initialData={customerDetail} 
      />
    </Suspense>
  );
}
