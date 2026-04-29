import { notFound } from "next/navigation";
import ServiceForm from "@/components/services/form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getServiceById, getServiceCategories, getBundleItems } from "@/app/actions/service-queries";
import type { BundleItem } from "@/lib/logic/bundle-calculator";

export const metadata = { title: "Sửa dịch vụ" };

// ═══════════════════════════════════════════
// /services/[id] — Edit Service Page (SSR)
// Fetches service + categories server-side
// 404 if service not found or deleted
// @see Phase 1c / Task 8
// ═══════════════════════════════════════════

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: Props) {
  const { id } = await params;

  // Server-side parallel fetch (unwrap ActionResult)
  const [serviceResult, categoriesResult, bundleItemsResult] = await Promise.all([
    getServiceById(id),
    getServiceCategories(),
    getBundleItems(id),
  ]);

  // 404 if service fetch failed
  if (!serviceResult.success || !serviceResult.data) {
    notFound();
  }

  const service = serviceResult.data;
  const categories = categoriesResult.success ? categoriesResult.data : [];
  
  // Map raw DB bundle items to UI BundleItem type
  const rawItems: Record<string, unknown>[] = bundleItemsResult.success ? (bundleItemsResult.data as Record<string, unknown>[]) || [] : [];
  const initialBundleItems: BundleItem[] = rawItems.map(
    (item: Record<string, unknown>) => {
      const child = item.child_service as Record<string, unknown> | undefined;
      return {
        id: crypto.randomUUID(), // local editor ID
        service_id: String(item.child_service_id),
        service_name: child?.name ? String(child.name) : "Dịch vụ không xác định",
        service_code: child?.service_code ? String(child.service_code) : "",
        selling_price: Number(child?.selling_price || 0),
        quantity: Number(item.quantity) || 1,
        category_id: child?.category_id ? String(child.category_id) : undefined,
        unit: child?.unit ? String(child.unit) : undefined,
        image_url: child?.image_url ? String(child.image_url) : undefined,
        original_price: Number(child?.selling_price || 0),
        discount_amount: 0,
        discount_percent: 0,
        final_price: Number(child?.selling_price || 0),
      };
    }
  );

  return (
    <div className="main-container gap-4!">
      {/* Breadcrumb — Gold Standard (giống Employees/Inventory/Contracts) */}
      <Breadcrumb items={[
        { label: "Dịch vụ", href: "/services" },
        { label: service.name },
      ]} />

      {/* Form (Edit mode) */}
      <ServiceForm
        initialData={service}
        initialBundleItems={initialBundleItems}
        preFetchedCategories={categories}
      />
    </div>
  );
}

