"use client";

import { useCallback, useState } from "react";
import type { Gallery } from "@/types/gallery";
import PublicGalleryClient from "./public-gallery-client";
import PasswordGate from "./password-gate";

// ═══════════════════════════════════════════
// GalleryPageClient — Wrapper xử lý password gate
// needsPassword → PasswordGate → onUnlock → Gallery
// ═══════════════════════════════════════════

interface GalleryData {
  id: string;
  title: string | null;
  status: string | null;
  selection_deadline: string | null;
  access_url?: string | null;
  accessToken?: string;
  capability?: "select" | "view" | "download";
  needsPassword: boolean;
  imageCount?: number;
  hasMoreImages?: boolean;
  currentPage?: number;
  gallery_images?: Gallery["gallery_images"];
}

interface GalleryPageClientProps {
  initialData: GalleryData;
  mode: "select" | "view";
}

export default function GalleryPageClient({ initialData, mode }: GalleryPageClientProps) {
  const [gallery, setGallery] = useState<Gallery | null>(
    initialData.needsPassword ? null : (initialData as unknown as Gallery),
  );
  const handleUnlock = useCallback((unlocked: Gallery) => {
    setGallery(unlocked);
  }, []);

  // ─── Password gate ─────────────────────────
  if (!gallery) {
    return (
      <PasswordGate
        galleryId={initialData.id}
        accessUrl={initialData.access_url || ""}
        galleryTitle={initialData.title}
        mode={mode}
        onUnlock={handleUnlock}
      />
    );
  }

  // ─── Gallery view ──────────────────────────
  return <PublicGalleryClient gallery={gallery} mode={mode} />;
}
