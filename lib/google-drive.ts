/**
 * Google Drive Integration Helpers
 * Server-side only — API key never exposed to client
 */

// ─── Types ─────────────────────────────────────────

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

export interface DriveFolder {
  id: string;
  name: string;
}

// ─── URL Parsing ───────────────────────────────────

/**
 * Parse folder ID từ nhiều format Google Drive URL
 * Supports:
 *   https://drive.google.com/drive/folders/FOLDER_ID
 *   https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 *   https://drive.google.com/drive/u/0/folders/FOLDER_ID
 */
export function parseDriveFolderUrl(url: string): string | null {
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ─── URL Builders ──────────────────────────────────

/** Build thumbnail URL từ file ID (cho grid) */
export function getDriveThumbnailUrl(
  fileId: string,
  size: number = 400,
): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=s${size}`;
}

/** Build full image URL (cho viewer/download) */
export function getDriveImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/** Build download URL via our proxy API */
export function getDriveDownloadUrl(fileId: string): string {
  return `/api/drive-download/${fileId}`;
}

// ─── File Grouping ─────────────────────────────────

/**
 * Extract base filename (without extension) for grouping RAW/JPG duplicates
 * DSC09882.ARW → DSC09882
 * DSC09882.JPG → DSC09882
 * photo_001.CR2 → photo_001
 */
export function extractFileGroup(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > 0 ? filename.substring(0, lastDot) : filename;
}

// ─── API Fetching ──────────────────────────────────

/**
 * Fetch danh sách file ảnh từ Google Drive folder
 * Tự động paginate nếu folder có > 100 ảnh
 * Server-side only (cần GOOGLE_DRIVE_API_KEY)
 */
export async function fetchDriveFiles(
  folderId: string,
): Promise<DriveFile[]> {
  const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
  if (!API_KEY) {
    throw new Error("Missing GOOGLE_DRIVE_API_KEY in environment variables");
  }

  const allFiles: DriveFile[] = [];
  let pageToken: string | null = null;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains 'image'`,
      fields: "nextPageToken,files(id,name,mimeType)",
      key: API_KEY,
      pageSize: "100",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params}`,
      { next: { revalidate: 0 } }, // No cache
    );

    if (!res.ok) {
      const err = await res.json();
      const message = err.error?.message || "Drive API error";

      // Gợi ý người dùng nếu folder chưa public
      if (res.status === 404 || res.status === 403) {
        throw new Error(
          "Không thể truy cập folder. Hãy kiểm tra folder đã được chia sẻ 'Anyone with the link' chưa.",
        );
      }

      throw new Error(message);
    }

    const data = await res.json();
    allFiles.push(...data.files);
    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return allFiles;
}

/**
 * Fetch subfolders trong một parent folder
 * Dùng để auto-detect "Ảnh gốc", "Ảnh đã sửa", "Ảnh chọn in"
 */
export async function fetchDriveSubfolders(
  parentFolderId: string,
): Promise<DriveFolder[]> {
  const API_KEY = process.env.GOOGLE_DRIVE_API_KEY;
  if (!API_KEY) {
    throw new Error("Missing GOOGLE_DRIVE_API_KEY");
  }

  const params = new URLSearchParams({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
    fields: "files(id,name)",
    key: API_KEY,
    pageSize: "20",
  });

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    { next: { revalidate: 0 } },
  );

  if (!res.ok) {
    return []; // Graceful: nếu không tìm thấy subfolder thì trả rỗng
  }

  const data = await res.json();
  return data.files || [];
}

// ─── Subfolder Type Detection ──────────────────────

/** Folder name patterns cho auto-detect */
const FOLDER_TYPE_PATTERNS: Record<string, RegExp[]> = {
  goc: [
    /[aả]nh\s*g[oố]c/i,
    /raw/i,
    /original/i,
    /full/i,
  ],
  da_sua: [
    /[aả]nh\s*([đd][aã])?\s*s[uử]a/i,
    /edit/i,
    /retouch/i,
    /retouched/i,
  ],
  chon_in: [
    /ch[oọ]n\s*in/i,
    /[aả]nh\s*in/i,
    /print/i,
    /selected/i,
  ],
};

/**
 * Auto-detect folder_type from folder name
 * Returns 'goc' | 'da_sua' | 'chon_in' | null
 */
export function detectFolderType(folderName: string): string | null {
  for (const [type, patterns] of Object.entries(FOLDER_TYPE_PATTERNS)) {
    if (patterns.some((p) => p.test(folderName))) {
      return type;
    }
  }
  return null;
}
