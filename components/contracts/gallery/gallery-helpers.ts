import type { GalleryImage } from "@/types/gallery";

// ═══════════════════════════════════════════
// Gallery Helpers — Shared types, constants, and utilities
// ═══════════════════════════════════════════

// ─── Types ─────────────────────────────────

export type FileFilter = "all" | "jpg" | "raw";
export type StatsFilter = "all" | "starred" | "hearted" | "commented" | "selected";

export interface ImageGroup {
  fileGroup: string;
  images: GalleryImage[];
  displayImage: GalleryImage;
  hasRaw: boolean;
  hasJpg: boolean;
}

// ─── Constants ─────────────────────────────

export const FOLDER_LABELS: Record<string, string> = {
  goc: "📸 Ảnh gốc",
  da_sua: "✏️ Ảnh đã sửa",
  chon_in: "🖨️ Ảnh chọn in",
};

const RAW_EXTENSIONS = ["arw", "cr2", "cr3", "nef", "raf", "dng", "orf", "rw2"];

// ─── Utilities ─────────────────────────────

export function isRawFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return RAW_EXTENSIONS.includes(ext);
}

/**
 * Get responsive thumbnail URL with fallback to proxy
 * For public/client mode: use proxy API for reliable loading
 */
export function getResponsiveThumbnailUrl(
  thumbnailUrl: string | null,
  imageUrl: string,
  targetSize: number,
  useProxy: boolean = false
): string {
  // Extract file ID from URLs for proxy
  if (useProxy) {
    const fileIdMatch =
      thumbnailUrl?.match(/[?&]id=([^&]+)/) ||
      imageUrl?.match(/\/d\/([^/?]+)/);
    const fileId = fileIdMatch?.[1] || fileIdMatch?.[2];

    if (fileId) {
      return `/api/drive-download/${fileId}`;
    }
  }

  if (!thumbnailUrl) return imageUrl;

  const normalizedSize = Math.max(200, Math.round(targetSize));
  if (!/drive\.google\.com\/thumbnail/i.test(thumbnailUrl)) {
    return thumbnailUrl;
  }

  // Use width-based sizing for better quality
  const sizeParam = `sz=w${normalizedSize}`;

  if (thumbnailUrl.includes('sz=')) {
    return thumbnailUrl.replace(/sz=[sw]\d+/i, sizeParam);
  }

  const separator = thumbnailUrl.includes('?') ? '&' : '?';
  return `${thumbnailUrl}${separator}${sizeParam}`;
}

/** Group images by file_group (RAW+JPG pairs) */
export function groupByFileGroup(images: GalleryImage[]): ImageGroup[] {
  const map = new Map<string, GalleryImage[]>();

  for (const img of images) {
    const key = img.file_group || img.file_name || img.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(img);
  }

  return Array.from(map.entries()).map(([key, imgs]) => {
    const hasRaw = imgs.some((i) => isRawFile(i.file_name || ""));
    const hasJpg = imgs.some((i) => !isRawFile(i.file_name || ""));
    const displayImage = imgs.find((i) => !isRawFile(i.file_name || "")) || imgs[0];

    return { fileGroup: key, images: imgs, displayImage, hasRaw, hasJpg };
  });
}
