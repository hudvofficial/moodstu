// ═══════════════════════════════════════════
// Gallery Types — Shared between gallery-actions + gallery-drive-actions
// ═══════════════════════════════════════════

export interface GalleryImage {
  id: string;
  gallery_id: string;
  image_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_selected: boolean;
  is_starred?: boolean;
  starred_at?: string | null;
  client_note: string | null;
  drive_file_id: string | null;
  file_name: string | null;
  file_group: string | null;
  selected_at: string | null;
  created_at: string;
  // Masonry layout dimensions
  width?: number | null;
  height?: number | null;
  // BlurHash for instant placeholder (SSR-safe)
  blur_hash?: string | null;
  blur_data_url?: string | null;
}

export type GalleryShareCapability = "select" | "view" | "download";
export type GalleryShareLinkStatus = "active" | "disabled";
export type GallerySelectionBatchStatus =
  | "draft"
  | "client_submitted"
  | "studio_locked"
  | "drive_copied"
  | "local_exported"
  | "retouching"
  | "delivered";
export type GalleryFilterJobType = "drive_copy_jpg" | "local_manifest";
export type GalleryFilterJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Gallery {
  id: string;
  contract_id: string;
  title: string | null;
  access_url: string | null;
  password: string | null;
  password_hash?: string | null;
  access_version?: number | null;
  capability?: GalleryShareCapability;
  share_link_id?: string | null;
  share_slug?: string | null;
  share_link_access_version?: number | null;
  accessToken?: string;
  needsPassword?: boolean;
  status: string;
  selection_deadline: string | null;
  shared_at: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  folder_type: string | null;
  cover_image_id?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  selection_limit?: number | null;
  custom_slug?: string | null;
  client_name?: string | null;
  tags?: string[] | null;
  allow_comments?: boolean | null;
  enable_watermark?: boolean | null;
  show_namecard?: boolean | null;
  allow_download?: boolean | null;
  gallery_images?: GalleryImage[];
  og_image_url?: string | null;
  share_version?: number | null;
  download_unlocked_at?: string | null;
  download_unlocked_by?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  imageCount?: number;
  selectedCount?: number;
  coverImageUrl?: string | null;
  hasMoreImages?: boolean;
  currentPage?: number;
}

export interface GallerySummary extends Omit<Gallery, "gallery_images"> {
  imageCount: number;
  selectedCount: number;
  heartCount?: number;
  coverImageUrl: string | null;
  hasPassword: boolean;
  shareLinks?: GalleryShareLink[];
}

export interface GalleryPublicPreview {
  id: string;
  title: string | null;
  status: string | null;
  selection_deadline: string | null;
  selection_limit: number | null;
  access_url: string | null;
  
  // Custom Settings
  custom_slug?: string | null;
  client_name?: string | null;
  tags?: string[] | null;
  allow_comments?: boolean | null;
  enable_watermark?: boolean | null;
  show_namecard?: boolean | null;
  allow_download?: boolean | null;

  gallery_images?: GalleryImage[] | null;
  imageCount: number;
  coverImageUrl: string | null;
  hasPassword: boolean;
  capability?: GalleryShareCapability;
  shareSlug?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  shareLinks?: GalleryShareLink[];
}

export interface GalleryShareLink {
  id: string;
  gallery_id: string;
  slug: string;
  capability: GalleryShareCapability;
  status: GalleryShareLinkStatus;
  expires_at: string | null;
  access_version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryShareDetails {
  galleryId: string;
  status: string;
  title: string | null;
  accessUrl: string | null;
  hasPassword: boolean;
  shareLinks: GalleryShareLink[];
}

export interface GallerySelectionBatch {
  id: string;
  gallery_id: string;
  contract_id: string;
  status: GallerySelectionBatchStatus;
  selected_count: number;
  created_by_client: string | null;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GallerySelectionBatchItem {
  id: string;
  batch_id: string;
  image_id: string;
  is_selected?: boolean | null;
  selected_at?: string | null;
  file_name: string | null;
  drive_file_id: string | null;
  sort_order: number | null;
  client_note: string | null;
  created_at: string;
}

/**
 * Khớp schema THẬT của bảng gallery_filter_jobs (migration 20260520090100).
 * Bản cũ của interface này mô tả một schema tưởng tượng (batch_id/job_type/
 * total_count/…) chưa từng tồn tại trong DB — code ghi theo nó đều PGRST204.
 */
export interface GalleryFilterJob {
  id: string;
  gallery_id: string;
  folder_id: string;
  folder_name: string | null;
  status: string;
  total_files: number;
  copied_files: number;
  current_file_name: string | null;
  error_log: unknown;
  created_at: string | null;
  updated_at: string | null;
}

// ─── Helpers ───────────────────────────────

export function generateAccessUrl(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export const MAX_NOTE_LENGTH = 500;

/** Nguồn ảnh cho modal "Lọc ảnh": khách bấm chọn (is_selected), khách thả tim (gallery_reactions), hoặc cả hai. */
export type GalleryFilterMode = "selected" | "hearted" | "both";

/** 1 file ứng viên để lọc — imageId dùng để khử trùng khi hợp 2 nguồn. */
export interface GalleryFilterFile {
  imageId: string;
  fileName: string;
}
