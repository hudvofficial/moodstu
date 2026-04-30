import ServiceForm from "@/components/services/form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getServiceCategories } from "@/app/actions/service-queries";

export const metadata = { title: "Thêm dịch vụ" };

export const dynamic = "force-dynamic";

export default async function CreateServicePage() {
  const result = await getServiceCategories();

  if (!result.success) {
    throw new Error(result.error || "Không thể tải danh mục dịch vụ");
  }

  return (
    <div className="main-container gap-4!">
      <Breadcrumb items={[
        { label: "Dịch vụ", href: "/services" },
        { label: "Thêm dịch vụ mới" },
      ]} />

      <ServiceForm preFetchedCategories={result.data || []} />
    </div>
  );
}
