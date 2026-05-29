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
 *
 * Strategy:
 * 1. Proxy mode: use /api/drive-download for same-origin loading
 * 2. Prefer lh3.googleusercontent.com (whitelisted in next.config.ts)
 * 3. Fallback to drive.google.com/thumbnail (requires <img> tag or config update)
 */
export function getResponsiveThumbnailUrl(
  thumbnailUrl: string | null,
  imageUrl: string,
  targetSize: number,
  useProxy: boolean = false
): string {
  // Strategy 1: Use proxy for same-origin loading (public mode)
  if (useProxy) {
    const fileIdMatch =
      thumbnailUrl?.match(/[?&]id=([^&]+)/) ||
      imageUrl?.match(/\/d\/([^/?]+)/);
    const fileId = fileIdMatch?.[1] || fileIdMatch?.[2];

    if (fileId) {
      return `/api/drive-download/${fileId}`;
    }
  }

  const normalizedSize = Math.max(200, Math.round(targetSize));

  // Strategy 2: Prefer lh3.googleusercontent.com (already whitelisted for Next.js Image)
  // lh3 URLs support =sXXX parameter for responsive sizing
  if (imageUrl && /lh3\.googleusercontent\.com/i.test(imageUrl)) {
    // Remove existing size param if present
    const baseUrl = imageUrl.replace(/[?=]s\d+$/, '');
    return `${baseUrl}=s${normalizedSize}`;
  }

  // Strategy 3: Fallback to drive.google.com/thumbnail
  // Note: Requires drive.google.com in next.config.ts remotePatterns OR using <img> tag
  if (!thumbnailUrl) return imageUrl;

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

/** Group images by file_group (RAW+JPG pairs), ensuring duplicate JPGs are NOT hidden */
export function groupByFileGroup(images: GalleryImage[]): ImageGroup[] {
  const raws = images.filter((i) => isRawFile(i.file_name || ""));
  const nonRaws = images.filter((i) => !isRawFile(i.file_name || ""));
  
  // Create a map of RAWs by file_group/file_name for pairing
  const rawByGroup = new Map<string, GalleryImage[]>();
  for (const raw of raws) {
    const key = raw.file_group || raw.file_name || raw.id;
    if (!rawByGroup.has(key)) rawByGroup.set(key, []);
    rawByGroup.get(key)!.push(raw);
  }

  const groups: ImageGroup[] = [];
  const usedRaws = new Set<string>();

  // 1. Each non-Raw (JPG) creates a distinct group to avoid hiding duplicate uploads
  for (const img of nonRaws) {
    const key = img.file_group || img.file_name || img.id;
    let pairedRaw: GalleryImage | undefined;
    
    // Pair with an unused RAW that matches the key
    if (rawByGroup.has(key)) {
      pairedRaw = rawByGroup.get(key)!.find((r) => !usedRaws.has(r.id));
    }
    
    const groupImages = [img];
    if (pairedRaw) {
      groupImages.push(pairedRaw);
      usedRaws.add(pairedRaw.id);
    }
    
    groups.push({
      fileGroup: key,
      images: groupImages,
      displayImage: img,
      hasRaw: !!pairedRaw,
      hasJpg: true,
    });
  }

  // 2. Any unpaired RAWs get their own group
  for (const raw of raws) {
    if (!usedRaws.has(raw.id)) {
      const key = raw.file_group || raw.file_name || raw.id;
      groups.push({
        fileGroup: key,
        images: [raw],
        displayImage: raw,
        hasRaw: true,
        hasJpg: false,
      });
    }
  }

  // Maintain original sort order (images array was already sorted)
  groups.sort((a, b) => {
    const orderA = a.displayImage.sort_order ?? 0;
    const orderB = b.displayImage.sort_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    // Fallback to created_at
    const timeA = new Date(a.displayImage.created_at).getTime();
    const timeB = new Date(b.displayImage.created_at).getTime();
    return timeA - timeB;
  });

  return groups;
}
