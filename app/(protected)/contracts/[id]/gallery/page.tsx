import { notFound } from "next/navigation";
import GalleryFullPage from "@/components/contracts/gallery/gallery-full-page";

export const metadata = { title: "Thư viện hợp đồng" };

// ═══════════════════════════════════════════
// Gallery Full Page — Admin view all images in a gallery
// Route: /contracts/[id]/gallery?galleryId=xxx
// ═══════════════════════════════════════════

export default async function GalleryPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ galleryId?: string; folder?: string }>;
}) {
  const { id: contractId } = await props.params;
  const { galleryId, folder } = await props.searchParams;

  if (!contractId) notFound();

  return (
    <GalleryFullPage
      contractId={contractId}
      galleryId={galleryId || null}
      folderType={folder || null}
    />
  );
}

