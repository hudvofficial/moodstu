import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import ServiceForm from "@/components/services/form";
import { getServiceCategories } from "@/app/actions/service-queries";

export const metadata = { title: "Thêm dịch vụ" };

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════
// /services/create — Create Service Page (SSR)
// Fetches categories server-side, passes to form
// @see Phase 1c / Task 7
// ═══════════════════════════════════════════

export default async function CreateServicePage() {
  // Server-side fetch (unwrap ActionResult)
  const result = await getServiceCategories();
  const categories = result.success ? result.data : [];

  return (
    <div className="main-container">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/services"
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-bg-hover hover:bg-bg-sidebar transition-colors text-text-muted hover:text-text-main"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-text-main flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Thêm dịch vụ mới
          </h1>
          <p className="text-caption text-text-muted">
            Tạo gói dịch vụ kinh doanh cho studio
          </p>
        </div>
      </div>

      {/* Form */}
      <ServiceForm preFetchedCategories={categories} />
    </div>
  );
}

