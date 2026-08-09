import { toast } from "@/lib/toast-manager";
import { TOAST_MESSAGES } from "@/lib/toast-messages";

// ═══════════════════════════════════════════
// Gallery Download Utilities with Retry Logic
// Shared between admin and customer downloads
// ═══════════════════════════════════════════

// iOS device detection (iPad/iPhone/iPod + iPad Pro desktop mode)
// Used to pick the iOS-friendly download path BEFORE async work,
// because iOS Safari user-gesture token expires after ~1s.
const detectIOS = (): boolean => {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

export interface DownloadOptions {
  /**
   * Maximum number of retry attempts (default: 3)
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds (default: 1000)
   */
  retryDelay?: number;

  /**
   * Show toast notifications (default: true)
   */
  showToast?: boolean;

  /**
   * Custom error message for toast
   */
  errorMessage?: string;

  /**
   * Custom success message for toast
   */
  successMessage?: string;
}

/**
 * Download a single image using hidden iframe method (works on all platforms)
 * Automatically retries on failure with exponential backoff
 *
 * @param accessToken - Gallery access token or "admin"
 * @param imageId - Image UUID
 * @param fileName - File name for download (optional, for toast message)
 * @param options - Download options
 * @returns Promise<boolean> - true if download succeeded
 */
export async function downloadSingleImage(
  accessToken: string,
  imageId: string,
  fileName?: string,
  options: DownloadOptions = {}
): Promise<boolean> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
    errorMessage,
    successMessage,
  } = options;

  const displayName = fileName || "ảnh";

  // Show loading toast
  let toastId: string | number | undefined;
  if (showToast) {
    toastId = toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_START);
  }

  // ─── iOS Safari path (MUST run BEFORE any heavy async) ────────────────
  // iOS Safari user-gesture token expires ~1s. The blob path (below) does
  // 4 sequential awaits before link.click() → token gone → iOS blocks it.
  // Workaround: open the direct Drive URL in a new tab using window.open()
  // after only ONE await (the JSON lookup). The user can then long-press
  // the image → "Lưu hình ảnh" to save to Photos.
  if (detectIOS()) {
    try {
      const lookupUrl = `/api/gallery-download/${accessToken}/${imageId}`;
      const response = await fetch(lookupUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          // window.open() với "noopener,noreferrer" LUÔN trả null theo HTML spec,
          // nên không thể check newWindow để coi là fail. Tab vẫn mở → return true.
          window.open(data.url, "_blank", "noopener,noreferrer");
          if (showToast && toastId) {
            toast.success(
              successMessage || TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(fileName),
              { id: toastId }
            );
          }
          return true;
        }
      }
    } catch (error) {
      console.error("[downloadSingleImage][ios] Error:", error);
      // Fall through to retry loop below
    }
    // If iOS path failed, fall through to retry loop
  }

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Try blob method first (works on iOS Safari!)
      const success = await attemptDownloadViaBlob(accessToken, imageId, fileName);

      if (success) {
        // Success!
        if (showToast && toastId) {
          toast.success(successMessage || TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(fileName), { id: toastId });
        }
        return true;
      }

      // If blob method fails, throw to trigger retry
      throw new Error("Blob download failed");

    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // If not the last attempt, wait before retrying with exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));

        if (showToast && toastId) {
          toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_RETRY(attempt + 2, maxRetries), { id: toastId });
        }
      }
    }
  }

  // All retries failed - try fallback method
  try {
    const fallbackSuccess = await attemptDownloadViaWindowOpen(accessToken, imageId, fileName);
    if (fallbackSuccess) {
      if (showToast && toastId) {
        toast.success(successMessage || TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(fileName), { id: toastId });
      }
      return true;
    }
  } catch (fallbackError) {
    // Fallback also failed
  }

  // Complete failure
  if (showToast && toastId) {
    toast.error(
      errorMessage || TOAST_MESSAGES.GALLERY.DOWNLOAD_ERROR(fileName),
      {
        id: toastId,
        // Kèm nguyên nhân kỹ thuật (HTTP 429/403, NetworkError...) — user gửi screenshot
        // là biết ngay chết ở tầng nào, hết chẩn đoán mò (vụ DSC_0067 09/08 không trace
        // được vì toast chỉ nói "Không thể tải").
        description: lastError?.message || undefined,
      }
    );
  }

  return false;
}

/**
 * Attempt download using blob + <a> tag method
 * This works reliably on iOS Safari (same as admin method)
 *
 * NOTE: iOS Safari user-gesture token expires ~1s. We still keep this path
 * for non-iOS / fallback; on iOS we use a separate synchronous path
 * (see downloadSingleImage → detectIOS branch).
 */
async function attemptDownloadViaBlob(
  accessToken: string,
  imageId: string,
  fileName?: string
): Promise<boolean> {
  try {
    const url = `/api/gallery-download/${accessToken}/${imageId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.url) throw new Error("No direct URL returned");

    const directResponse = await fetch(data.url);
    if (!directResponse.ok) {
      throw new Error(`Drive HTTP ${directResponse.status}`);
    }

    const blob = await directResponse.blob();
    const objectUrl = URL.createObjectURL(blob);

    // Create temporary <a> tag and trigger download
    const link = document.createElement("a");
    link.href = objectUrl;
    // Use provided fileName so iOS/Android show correct name; fall back to ""
    // (server Content-Disposition header still controls final name if blank)
    link.download = fileName || "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(objectUrl), 100);

    return true;
  } catch (error) {
    console.error("[attemptDownloadViaBlob] Error:", error);
    return false;
  }
}

/**
 * Attempt download using hidden iframe method (fallback)
 */
function attemptDownloadViaIframe(
  accessToken: string,
  imageId: string
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const baseUrl = `/api/gallery-download/${accessToken}/${imageId}`;

      fetch(baseUrl)
        .then((res) => res.json())
        .then((data) => {
          if (!data.url) throw new Error("No direct URL returned");
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.style.position = "absolute";
          iframe.style.width = "0";
          iframe.style.height = "0";
          iframe.style.border = "none";
          iframe.src = data.url;
          document.body.appendChild(iframe);
          setTimeout(() => {
            try {
              iframe.remove();
            } catch {}
            resolve(true);
          }, 2000);
        })
        .catch((error) => {
          console.error("[attemptDownloadViaIframe] Error:", error);
          resolve(false);
        });

    } catch (error) {
      console.error("[attemptDownloadViaIframe] Error:", error);
      resolve(false);
    }
  });
}

/**
 * Fallback download method using window.open
 * Opens download in new tab/window
 *
 * NOTE: window.open() called after an `await` is always blocked by the
 * browser's popup blocker (gesture token already spent). The iOS path is
 * handled separately at the top of downloadSingleImage via a dedicated
 * branch. For non-iOS we rely on the blob download path above, so this
 * fallback now short-circuits to `false` and lets the caller surface
 * the proper error toast.
 */
function attemptDownloadViaWindowOpen(
  accessToken: string,
  imageId: string,
  fileName?: string
): Promise<boolean> {
  return new Promise((resolve) => {
    // Intentionally a no-op: see note above.
    // `fileName` and `accessToken`/`imageId` are kept in the signature
    // for API stability and to avoid breaking any future call site.
    void accessToken;
    void imageId;
    void fileName;
    resolve(false);
  });
}

/**
 * Download multiple images as ZIP
 *
 * @param accessToken - Gallery access token or "admin"
 * @param imageIds - Array of image UUIDs (optional, downloads all selected if empty)
 * @param options - Download options
 * @returns Promise<boolean> - true if download succeeded
 */
export async function downloadBatchAsZip(
  accessToken: string,
  imageIds?: string[],
  options: DownloadOptions = {}
): Promise<boolean> {
  const {
    maxRetries = 2, // Fewer retries for batch (heavy operation)
    retryDelay = 2000,
    showToast = true,
    errorMessage,
    successMessage,
  } = options;

  const count = imageIds?.length || 0;
  const displayName = count > 0 ? `${count} ảnh` : "album";

  // Show loading toast
  let toastId: string | number | undefined;
  if (showToast) {
    const message = count > 0
      ? TOAST_MESSAGES.GALLERY.DOWNLOAD_BATCH_START(count)
      : TOAST_MESSAGES.GALLERY.DOWNLOAD_START;
    toastId = toast.loading(message);
  }

  // Build URL
  const baseUrl = `/api/gallery-download-batch/${accessToken}`;
  const url = imageIds && imageIds.length > 0
    ? `${baseUrl}?ids=${imageIds.join(",")}&client_zip=true`
    : `${baseUrl}?client_zip=true`;

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.images || !Array.isArray(data.images)) throw new Error("Invalid ZIP payload");

      const JSZip = (await import("jszip")).default;
      const { saveAs } = await import("file-saver");
      const zip = new JSZip();

      for (const img of data.images) {
        const imgRes = await fetch(img.url);
        if (imgRes.ok) {
          const blob = await imgRes.blob();
          zip.file(img.name, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, data.zipName || `${displayName}.zip`);

      // Assume success (no reliable way to detect native download completion)
      if (showToast && toastId) {
        const message = count > 0
          ? TOAST_MESSAGES.GALLERY.DOWNLOAD_BATCH_SUCCESS(count)
          : TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS();
        toast.success(
          successMessage || message,
          { id: toastId, duration: 5000 }
        );
      }
      return true;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // If not the last attempt, wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));

        if (showToast && toastId) {
          toast.loading(TOAST_MESSAGES.GALLERY.DOWNLOAD_RETRY(attempt + 2, maxRetries), { id: toastId });
        }
      }
    }
  }

  // All retries failed
  if (showToast && toastId) {
    const message = count > 0
      ? `Không thể tải ${count} ảnh. Vui lòng thử lại sau.`
      : TOAST_MESSAGES.GALLERY.DOWNLOAD_ERROR();
    toast.error(
      errorMessage || message,
      { id: toastId }
    );
  }

  return false;
}

/**
 * Download from arbitrary URL (for non-Drive images)
 *
 * @param url - Image URL
 * @param fileName - File name for download
 * @param options - Download options
 * @returns Promise<boolean> - true if download succeeded
 */
export async function downloadFromUrl(
  url: string,
  fileName: string,
  options: DownloadOptions = {}
): Promise<boolean> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Create temporary link element
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      }, 100);

      if (showToast) {
        toast.success(TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(fileName));
      }

      return true;

    } catch (error) {
      console.error(`[downloadFromUrl] Attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  // All retries failed - try fallback to window.open
  try {
    window.open(url, "_blank", "noopener,noreferrer");
    if (showToast) {
      toast.info("Đã mở ảnh trong tab mới"); // Keep this - not a gallery download
    }
    return true;
  } catch {
    if (showToast) {
      toast.error(TOAST_MESSAGES.GALLERY.DOWNLOAD_ERROR(fileName));
    }
    return false;
  }
}
