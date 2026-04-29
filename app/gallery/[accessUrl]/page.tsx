import { getPublicGallery } from "@/app/actions/gallery-actions";
import type { Metadata } from "next";
import GalleryPageClient from "@/components/gallery/gallery-page-client";

// ═══════════════════════════════════════════
// /gallery/[accessUrl] — Public Gallery Page
// NO AUTH — khách xem + chọn ảnh
// ═══════════════════════════════════════════

interface PageProps {
  params: Promise<{ accessUrl: string }>;
  searchParams: Promise<{ mode?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { accessUrl } = await params;
  const res = await getPublicGallery(accessUrl);

  if (!res.success) {
    return { title: "Album không tồn tại", robots: { index: false, follow: false } };
  }

  const title = res.data.title || "Album ảnh";
  const imageCount = !res.data.needsPassword && "gallery_images" in res.data
    ? (res.data.gallery_images?.length || 0)
    : 0;
  const description = imageCount > 0
    ? `Xem ${imageCount} ảnh trong album "${res.data.title || "Album"}"`
    : `Album ảnh - ${res.data.title || "Mood Studio"}`;
  const coverImage = !res.data.needsPassword && "gallery_images" in res.data
    ? res.data.gallery_images?.[0]?.thumbnail_url
    : undefined;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: res.data.title || "Album ảnh",
      description,
      type: "website",
      ...(coverImage ? { images: [{ url: coverImage }] } : {}),
    },
  };
}

export default async function GalleryPage({ params, searchParams }: PageProps) {
  const { accessUrl } = await params;
  const { mode: modeParam } = await searchParams;
  const mode = modeParam === "view" ? "view" as const : "select" as const;
  const res = await getPublicGallery(accessUrl);

  if (!res.success || !res.data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg-main, #faf8f5)" }}
      >
        <div className="text-center px-6">
          <div className="text-6xl mb-4" style={{ opacity: 0.3 }}>{"📷"}</div>
          <h1
            className="text-xl font-bold mb-2"
            style={{ color: "var(--color-text-primary, #2c2c2c)" }}
          >
            Album chưa sẵn sàng
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-text-muted, #999)" }}
          >
            Album này chưa được chia sẻ hoặc không tồn tại.
          </p>
        </div>
      </div>
    );
  }

  return <GalleryPageClient initialData={res.data} mode={mode} />;
}
