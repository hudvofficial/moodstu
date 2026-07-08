"use client";

import type { Gallery } from "@/types/gallery";
import PublicGalleryClient from "./public-gallery-client";

interface GalleryData {
  id: string;
  title: string | null;
  status: string | null;
  selection_deadline: string | null;
  access_url?: string | null;
  accessToken?: string;
  capability?: "select" | "view" | "download";
  needsPassword?: boolean;
  imageCount?: number;
  selectedCount?: number;
  hasMoreImages?: boolean;
  currentPage?: number;
  gallery_images?: Gallery["gallery_images"];
}

interface GalleryPageClientProps {
  initialData: GalleryData;
  mode: "select" | "view";
}

export default function GalleryPageClient({ initialData, mode }: GalleryPageClientProps) {
  return <PublicGalleryClient gallery={initialData as unknown as Gallery} mode={mode} />;
}