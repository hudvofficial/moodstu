"use client";

import { useState } from "react";
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
  status: string;
  selection_deadline: string | null;
  needsPassword: boolean;
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

  // ─── Password gate ─────────────────────────
  if (!gallery) {
    return (
      <PasswordGate
        galleryId={initialData.id}
        galleryTitle={initialData.title}
        mode={mode}
        onUnlock={(unlocked) => setGallery(unlocked)}
      />
    );
  }

  // ─── Gallery view ──────────────────────────
  return <PublicGalleryClient gallery={gallery} mode={mode} />;
}
