import { notFound } from "next/navigation";
import QuoteView from "@/components/services/quote/quote-view";
import { getServiceById } from "@/app/actions/service-queries";
import { getStudioInfo } from "@/app/actions/studio";

// ═══════════════════════════════════════════
// /services/[id]/quote — Full-page Quote (SSR)
// Fetches service + studio info server-side
// @see Phase 1d / Task 2
// ═══════════════════════════════════════════

interface Props {
  params: Promise<{ id: string }>;
}

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

  const studio = studioResult.success && studioResult.data ? {
    id: studioResult.data.id,
    name: studioResult.data.name,
    address: studioResult.data.address,
    phone: studioResult.data.hotline || null, // Map hotline to phone for V2 compat
    email: null, // DB missing email
    logo_url: studioResult.data.logo_url,
    tagline: null, // DB missing tagline
  } : {
    id: "",
    name: "Mood Studio",
    address: null,
    phone: null,
    email: null,
    logo_url: null,
    tagline: null,
  };

  return (
    <QuoteView
      service={serviceResult.data}
      studio={studio}
    />
  );
}
