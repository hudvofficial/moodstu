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

export interface Gallery {
  id: string;
  contract_id: string;
  title: string | null;
  access_url: string | null;
  password: string | null;
  status: string;
  selection_deadline: string | null;
  shared_at: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  folder_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  gallery_images?: GalleryImage[];
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
