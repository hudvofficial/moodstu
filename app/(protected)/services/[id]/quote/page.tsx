import { notFound } from "next/navigation";
import QuoteView from "@/components/services/quote/quote-view";
import { getServiceById } from "@/app/actions/service-queries";
import { getStudioInfo } from "@/app/actions/settings-queries";
import type { StudioInfo } from "@/types/settings";

export const metadata = { title: "Báo giá dịch vụ" };

// ═══════════════════════════════════════════
// /services/[id]/quote — Full-page Quote (SSR)
// Fetches service + studio info server-side
// @see Phase 1d / Task 2
// ═══════════════════════════════════════════

interface Props {
  params: Promise<{ id: string }>;
}

/** Fallback studio info when DB fetch fails */
const STUDIO_FALLBACK: StudioInfo = {
  id: "",
  name: "Mood Studio",
  address: null,
  hotline: null,
  representative: null,
  logo_url: null,
  bank_info: null,
  social_links: null,
  working_hours: null,
  timezone: null,
  google_oauth: null,
  created_at: null,
  updated_at: null,
};

export default async function QuotePage({ params }: Props) {
  const { id } = await params;

  // Parallel SSR fetch (unwrap ActionResult)
  const [serviceResult, studioResult] = await Promise.all([
    getServiceById(id),
    getStudioInfo(),
  ]);

  if (!serviceResult.success || !serviceResult.data) {
    notFound();
  }

  const studio: StudioInfo =
    studioResult.success && studioResult.data
      ? studioResult.data
      : STUDIO_FALLBACK;

  return (
    <QuoteView
      service={serviceResult.data}
      studio={studio}
    />
  );
}


