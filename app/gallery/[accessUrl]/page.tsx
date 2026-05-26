import { getPublicGallery, getPublicGalleryPreview } from "@/app/actions/gallery-public-actions";
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

function getAbsoluteMetadataImage(url: string | null | undefined) {
  if (!url) return undefined;

  try {
    return new URL(url).toString();
  } catch {
    const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || (vercelUrl ? `https://${vercelUrl}` : 'https://stu.moodwedding.com');
    if (!baseUrl) return undefined;
    return new URL(url, baseUrl).toString();
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { accessUrl } = await params;
  const res = await getPublicGalleryPreview(accessUrl);

  if (!res.success) {
    return { title: "Album không tồn tại", robots: { index: false, follow: false } };
  }

  const title = res.data.title || "Album ảnh";
  const imageCount = res.data.imageCount;
  const description = res.data.ogDescription || (imageCount > 0
    ? `Xem ${imageCount} ảnh trong album "${res.data.title || "Album"}"`
    : `Album ảnh - ${res.data.title || "Mood Studio"}`);
    
  const ogImageUrl = getAbsoluteMetadataImage(`/api/og/gallery/${accessUrl}`);

  return {
    title,
    description,
    metadataBase: new URL(getAbsoluteMetadataImage("/") || "https://stu.moodwedding.com"),
    robots: { index: true, follow: true },
    openGraph: {
      title: res.data.ogTitle || title,
      description,
      type: "website",
      url: `/gallery/${accessUrl}`,
      ...(ogImageUrl ? { images: [{ url: `${ogImageUrl}?ext=.png`, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: res.data.ogTitle || title,
      description,
      ...(ogImageUrl ? { images: [`${ogImageUrl}?ext=.png`] } : {}),
    },
  };
}

export default async function GalleryPage({ params, searchParams }: PageProps) {
  const { accessUrl } = await params;
  const { mode: modeParam } = await searchParams;
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

  const capability = "capability" in res.data ? res.data.capability : undefined;
  const mode = capability === "view" || capability === "download" || modeParam === "view"
    ? "view" as const
    : "select" as const;

  return <GalleryPageClient initialData={res.data} mode={mode} />;
}
