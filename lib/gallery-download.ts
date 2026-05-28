import { toast } from "@/lib/toast-manager";
import { TOAST_MESSAGES } from "@/lib/toast-messages";

// ═══════════════════════════════════════════
// Gallery Download Utilities with Retry Logic
// Shared between admin and customer downloads
// ═══════════════════════════════════════════

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

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const success = await attemptDownloadViaIframe(accessToken, imageId);

      if (success) {
        // Success!
        if (showToast && toastId) {
          // Different message for iOS Safari (requires manual save)
          if (isIOSSafari()) {
            toast.info('Nhấn giữ ảnh → chọn "Lưu hình ảnh" để lưu vào Album', { id: toastId, duration: 5000 });
          } else {
            toast.success(successMessage || TOAST_MESSAGES.GALLERY.DOWNLOAD_SUCCESS(fileName), { id: toastId });
          }
        }
        return true;
      }

      // If iframe method fails, throw to trigger retry
      throw new Error("Iframe download failed");

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
    const fallbackSuccess = await attemptDownloadViaWindowOpen(accessToken, imageId);
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
      { id: toastId }
    );
  }

  return false;
}

/**
 * Detect iOS Safari (not iOS WebView)
 */
function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) &&
         /Safari/.test(ua) &&
         !/CriOS|FxiOS|OPiOS|mercury|Line|FBAV|FBAN|FB_IAB|Instagram|Zalo/.test(ua);
}

/**
 * Attempt download using hidden iframe method
 * This triggers native browser download and works on most platforms
 * For iOS Safari, uses inline mode + window.open (native iOS UX)
 */
function attemptDownloadViaIframe(
  accessToken: string,
  imageId: string
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const baseUrl = `/api/gallery-download/${accessToken}/${imageId}`;

      // iOS Safari needs special handling
      if (isIOSSafari()) {
        // Open in new tab with inline mode
        // User can long-press → "Save Image" to Photos
        const url = `${baseUrl}?mode=view`;
        const newWindow = window.open(url, "_blank", "noopener,noreferrer");

        if (!newWindow) {
          resolve(false);
          return;
        }

        // Show iOS-specific instruction
        setTimeout(() => resolve(true), 500);
        return;
      }

      // All other platforms: Hidden iframe (auto-download)
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.src = baseUrl;

      document.body.appendChild(iframe);

      // Wait a bit to ensure download started
      setTimeout(() => {
        try {
          iframe.remove();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        resolve(true);
      }, 2000);

    } catch (error) {
      console.error("[downloadSingleImage] Iframe error:", error);
      resolve(false);
    }
  });
}

/**
 * Fallback download method using window.open
 * Opens download in new tab/window
 */
function attemptDownloadViaWindowOpen(
  accessToken: string,
  imageId: string
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const url = `/api/gallery-download/${accessToken}/${imageId}`;
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");

      // If popup was blocked, fail
      if (!newWindow) {
        resolve(false);
        return;
      }

      // Assume success if window opened
      resolve(true);

    } catch (error) {
      console.error("[downloadSingleImage] window.open error:", error);
      resolve(false);
    }
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
    ? `${baseUrl}?ids=${imageIds.join(",")}`
    : baseUrl;

  let lastError: Error | null = null;

  // Retry loop
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Trigger download via window.location (most reliable for large files)
      window.location.href = url;

      // Wait a bit before considering success
      await new Promise(resolve => setTimeout(resolve, 1500));

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
