/**
 * Google Drive OAuth Service
 * Handles operations that require Write access (Drive scope).
 * Requires an OAuth access token, unlike `lib/google-drive.ts` which uses API_KEY for read-only.
 */

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";

/**
 * Search for an existing folder by name within a parent folder (or root).
 * Returns the folder ID if found, null otherwise.
 */
export async function findDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string | null> {
  const parentQuery = parentId
    ? `'${parentId}' in parents`
    : `'root' in parents`;

  const q = `${parentQuery} and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const params = new URLSearchParams({
    q,
    fields: "files(id,name)",
    pageSize: "1",
  });

  const response = await fetch(`${DRIVE_API_URL}/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.files?.[0]?.id || null;
}

/**
 * Create a folder on Google Drive.
 * If parentId is provided, creates inside that folder.
 * If parentId is omitted/undefined, creates at My Drive root.
 */
export async function createDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };

  if (parentId) {
    body.parents = [parentId];
  }

  const response = await fetch(`${DRIVE_API_URL}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    
    // Phát hiện lỗi quyền cụ thể → message rõ ràng cho user
    if (response.status === 403) {
      throw new Error(
        "PERMISSION_DENIED: Tài khoản Google chưa có quyền chỉnh sửa trên thư mục này. " +
        "Vui lòng mở Google Drive → Chuột phải thư mục → Chia sẻ → Cấp quyền \"Người chỉnh sửa\" (Editor) cho tài khoản studio."
      );
    }
    
    throw new Error(`Failed to create Drive folder: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Find existing folder or create a new one.
 * Prevents duplicate folders with the same name.
 */
export async function findOrCreateDriveFolder(
  accessToken: string,
  name: string,
  parentId?: string,
): Promise<string> {
  const existingId = await findDriveFolder(accessToken, name, parentId);
  if (existingId) return existingId;
  return createDriveFolder(accessToken, name, parentId);
}

/**
 * Create a shortcut to a file on Google Drive in a destination folder.
 * This takes 0 bytes of storage quota and avoids storageQuotaExceeded errors.
 * Includes 1 automatic retry on 401 (token expired).
 */
export async function createDriveShortcut(
  accessToken: string,
  targetFileId: string,
  fileName: string,
  destFolderId: string,
  onTokenExpired?: () => Promise<string>,
): Promise<{ id: string; name: string }> {
  const doCreateShortcut = async (token: string) => {
    const url = `${DRIVE_API_URL}/files`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: fileName,
        mimeType: "application/vnd.google-apps.shortcut",
        shortcutDetails: {
          targetId: targetFileId
        },
        parents: [destFolderId]
      }),
    });
    return response;
  };

  let response = await doCreateShortcut(accessToken);

  // Retry once on 401 if we have a refresh callback
  if (response.status === 401 && onTokenExpired) {
    const newToken = await onTokenExpired();
    response = await doCreateShortcut(newToken);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    
    // Phát hiện lỗi quyền
    if (response.status === 403) {
      if (errorBody.includes("storageQuotaExceeded")) {
         // Shortcut hiếm khi dính lỗi này, nhưng cứ bắt cho chắc
         throw new Error("QUOTA_EXCEEDED: Tài khoản Google Drive đã HẾT DUNG LƯỢNG.");
      }
      throw new Error(
        "PERMISSION_DENIED: Tài khoản Google không có quyền tạo Lối tắt. " +
        "Vui lòng kiểm tra lại quyền truy cập thư mục."
      );
    }
    
    throw new Error(`Failed to create Drive shortcut: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return { id: data.id, name: data.name };
}
