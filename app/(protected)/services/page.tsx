import { getServices, getServiceCategories } from "@/app/actions/service-queries";
import ServicesListClient from "@/components/services/services-list-client";

export const metadata = { title: "Dịch vụ | Mood Studio" };

interface Props {
  searchParams: Promise<{
    search?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function ServicesPage({ searchParams }: Props) {
  const params = await searchParams;

  const [servicesResult, categoriesResult] = await Promise.all([
    getServices({
      search: params.search,
      category: params.category,
      status: params.status,
      page: params.page ? parseInt(params.page) : 1,
    }),
    getServiceCategories(),
  ]);

  const services = servicesResult.success ? servicesResult.data : { items: [], total: 0, page: 1, limit: 50 };
  const categories = categoriesResult.success ? categoriesResult.data : [];

  return (
    <ServicesListClient
      initialServices={services?.items || []}
      categories={categories || []}
    />
  );
}
