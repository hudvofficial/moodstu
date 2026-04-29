import ServicesListClient from "@/components/services/services-list-client";
import { getServiceCategories, getServices } from "@/app/actions/service-queries";

export const metadata = { title: "Dịch vụ" };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [servicesResult, categoriesResult] = await Promise.all([
    getServices({ limit: 50 }),
    getServiceCategories(),
  ]);

  return (
    <ServicesListClient
      initialServices={servicesResult.success ? servicesResult.data?.items || [] : []}
      initialServicesTotal={servicesResult.success ? servicesResult.data?.total || 0 : 0}
      categories={categoriesResult.success ? categoriesResult.data || [] : []}
    />
  );
}

