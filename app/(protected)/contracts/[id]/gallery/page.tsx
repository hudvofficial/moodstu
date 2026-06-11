export const metadata = { title: "Thư viện hợp đồng" };

import GalleryFullPage from "@/components/contracts/gallery/gallery-full-page";

// Gallery Full Page — Client-first shell.
// Perf: Do not block TTFB on getGallerySummariesByContract / getGalleryDataV2;
// rely on SWR/React Query inside useGalleryData to fetch on the client side.
export default async function GalleryPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ galleryId?: string; folder?: string }>;
}) {
  const { id: contractId } = await props.params;
  const { galleryId, folder } = await props.searchParams;

  return (
    <GalleryFullPage
      contractId={contractId}
      galleryId={galleryId || null}
      folderType={folder || null}
    />
  );
}
