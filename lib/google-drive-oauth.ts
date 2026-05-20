/**
 * Google Drive OAuth Service
 * Handles operations that require Write access (Drive scope).
 * Requires an OAuth access token, unlike `lib/google-drive.ts` which uses API_KEY for read-only.
 */

const DRIVE_API_URL = "https://www.googleapis.com/drive/v3";

export async function createDriveFolder(
  accessToken: string,
  parentId: string,
  name: string,
): Promise<string> {
  const url = `${DRIVE_API_URL}/files`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create Drive folder: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.id;
}

export async function copyDriveFile(
  accessToken: string,
  fileId: string,
  destFolderId: string,
): Promise<{ id: string; name: string }> {
  const url = `${DRIVE_API_URL}/files/${fileId}/copy`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parents: [destFolderId],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to copy Drive file: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
  };
}
