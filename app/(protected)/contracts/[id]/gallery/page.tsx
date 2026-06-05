import { notFound } from "next/navigation";
import GalleryFullPage from "@/components/contracts/gallery/gallery-full-page";
import { getGallerySummariesByContract } from "@/app/actions/gallery-admin-actions";
import { getGalleryDataV2 } from "@/app/actions/gallery-composite-actions";

export const metadata = { title: "Thư viện hợp đồng" };
// TODO: Research Next.js 16 PPR API - experimental_ppr export removed

// ═══════════════════════════════════════════
// Gallery Full Page — Admin view all images in a gallery
// Route: /contracts/[id]/gallery?galleryId=xxx
// SSR song song summaries + (nếu có galleryId trong URL) gallery v2 page 0 →
// bỏ waterfall ~300-700ms client mount. Promise.allSettled → 1 RPC fail không phá page,
// component vẫn fetch lại như cũ ở client mode (đường an toàn giữ nguyên).
// ═══════════════════════════════════════════

export default async function GalleryPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ galleryId?: string; folder?: string }>;
}) {
  const { id: contractId } = await props.params;
  const { galleryId, folder } = await props.searchParams;

  if (!contractId) notFound();

  const [summariesRes, dataRes] = await Promise.allSettled([
    getGallerySummariesByContract(contractId),
    galleryId ? getGalleryDataV2(galleryId, 0, 60) : Promise.resolve(null),
  ]);

  const initialGalleries = summariesRes.status === "fulfilled" && summariesRes.value.success
    ? summariesRes.value.data
    : undefined;
  const initialGalleryData = dataRes.status === "fulfilled" && dataRes.value && dataRes.value.success && dataRes.value.data
    ? dataRes.value.data
    : undefined;

  return (
    <GalleryFullPage
      contractId={contractId}
      galleryId={galleryId || null}
      folderType={folder || null}
      initialGalleries={initialGalleries}
      initialGalleryData={initialGalleryData}
    />
  );
}

