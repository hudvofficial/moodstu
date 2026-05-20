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
  client_note: string | null;
  drive_file_id: string | null;
  file_name: string | null;
  file_group: string | null;
  selected_at: string | null;
  created_at: string;
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
  og_image_url?: string | null;
  share_version?: number | null;
  selection_limit?: number | null;
  allow_comments?: boolean | null;
  allow_download?: boolean | null;
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
  gallery_images?: GalleryImage[];
}

export interface GallerySummary extends Omit<Gallery, "gallery_images"> {
  imageCount: number;
  selectedCount: number;
  coverImageUrl: string | null;
  hasPassword: boolean;
}

export interface GalleryPublicPreview {
  id: string;
  title: string | null;
  status: string | null;
  selection_deadline: string | null;
  access_url: string | null;
  imageCount: number;
  coverImageUrl: string | null;
  hasPassword: boolean;
  capability?: GalleryShareCapability;
  shareSlug?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
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
  file_name: string | null;
  drive_file_id: string | null;
  sort_order: number | null;
  client_note: string | null;
  created_at: string;
}

export interface GalleryFilterJob {
  id: string;
  gallery_id: string;
  batch_id: string | null;
  job_type: GalleryFilterJobType;
  status: GalleryFilterJobStatus;
  total_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  target_url: string | null;
  manifest_url: string | null;
  error: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
