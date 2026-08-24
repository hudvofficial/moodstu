/**
 * 🎯 Toast Manager (Phase 1: Foundation)
 *
 * Centralized toast system với:
 * - Deduplication (prevent spam)
 * - Loading → Success/Error flow
 * - Batch operations (summary toasts)
 * - Server action integration
 * - React Query compatibility
 *
 * @example
 * // Simple usage
 * toast.success("Đã lưu");
 *
 * @example
 * // Loading flow
 * const id = toast.loading("Đang tải...");
 * toast.success("Xong", { id });
 *
 * @example
 * // Batch summary
 * toast.batchSuccess(["file1.jpg", "file2.jpg"], "tải xuống");
 * // → "Đã tải xuống 2 mục"
 */

import { toast as sonnerToast } from "sonner";
import { recoverFromStaleServerAction } from "@/lib/client/stale-server-action-recovery";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export interface ToastOptions {
  /** Unique ID for deduplication or updating existing toast */
  id?: string | number;

  /** Duration in ms (default: 4000) */
  duration?: number;

  /** Secondary text below title */
  description?: string;

  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };

  /** Close button (default: false, true for critical toasts) */
  closeButton?: boolean;
}

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

// ═══════════════════════════════════════════
// Toast Manager Class
// ═══════════════════════════════════════════

class ToastManager {
  /**
   * Active toasts map for deduplication
   * Key: toast ID (auto-generated from message if not provided)
   * Value: Sonner toast ID
   */
  private activeToasts = new Map<string, string | number>();

  /**
   * Loading toasts map for update flow
   * Key: custom ID
   * Value: Sonner toast ID
   */
  private loadingToasts = new Map<string, string | number>();

  // ═══════════════════════════════════════════
  // Core Toast Methods
  // ═══════════════════════════════════════════

  /**
   * Show success toast with automatic deduplication
   */
  success(message: string, options?: ToastOptions) {
    return this._showToast("success", message, options);
  }

  /**
   * Show error toast with automatic deduplication
   */
  error(message: string, options?: ToastOptions) {
    // Deploy skew: client cũ gọi server action đã đổi ID sau deploy → Next ném
    // "Server Action … was not found on the server". Hầu hết mutation (React Query,
    // runOptimisticMutation, try/catch) BẮT lỗi rồi toast, nên listener toàn cục
    // StaleServerActionRecovery (chỉ nghe unhandledrejection) không bao giờ thấy.
    // Mọi lỗi hiển thị cho user đều đi qua đây → reload 1 lần/build tại chỗ này.
    recoverFromStaleServerAction(message);
    return this._showToast("error", message, options);
  }

  /**
   * Show info toast
   */
  info(message: string, options?: ToastOptions) {
    return this._showToast("info", message, options);
  }

  /**
   * Show warning toast
   */
  warning(message: string, options?: ToastOptions) {
    return this._showToast("warning", message, options);
  }

  /**
   * Show loading toast (no auto-dismiss)
   * Returns toast ID for later update
   *
   * @example
   * const id = toast.loading("Đang tải...");
   * // later...
   * toast.success("Xong", { id });
   */
  loading(message: string, options?: Omit<ToastOptions, "duration">) {
    const toastId = sonnerToast.loading(message, {
      description: options?.description,
    });

    // Always register so loading → success/error updates THIS toast instead of
    // orphaning it. Supports both `toast.loading(msg, { id })` and the documented
    // `const id = toast.loading(msg); toast.success(msg, { id })` flow.
    this.loadingToasts.set(String(options?.id ?? toastId), toastId);

    return toastId;
  }

  // ═══════════════════════════════════════════
  // Internal Helper
  // ═══════════════════════════════════════════

  private _showToast(
    type: Exclude<ToastType, "loading">,
    message: string,
    options?: ToastOptions
  ) {
    const dedupeKey = options?.id ? String(options.id) : message;

    // Update existing toast if ID is provided (for loading → success/error flow)
    if (options?.id) {
      const existingId = this.loadingToasts.get(String(options.id));
      if (existingId) {
        sonnerToast[type](message, {
          id: existingId,
          description: options.description,
          duration: options.duration || 4000,
          action: options.action,
          closeButton: options.closeButton,
            });

        // Cleanup
        this.loadingToasts.delete(String(options.id));
        return existingId;
      }
    }

    // Prevent duplicate toasts (same message shown simultaneously)
    if (this.activeToasts.has(dedupeKey)) {
      return this.activeToasts.get(dedupeKey);
    }

    // Show new toast
    const toastId = sonnerToast[type](message, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
      closeButton: options?.closeButton,
      onDismiss: () => this.activeToasts.delete(dedupeKey),
      onAutoClose: () => this.activeToasts.delete(dedupeKey),
    });

    this.activeToasts.set(dedupeKey, toastId);
    return toastId;
  }

  // ═══════════════════════════════════════════
  // Loading Flow Helpers
  // ═══════════════════════════════════════════

  /**
   * Start a loading toast with custom ID
   *
   * @example
   * toast.startLoading("upload-photos", "Đang tải 10 ảnh...");
   * // later...
   * toast.finishLoading("upload-photos", "success", "Đã tải 10 ảnh");
   */
  startLoading(id: string, message: string) {
    const toastId = sonnerToast.loading(message);
    this.loadingToasts.set(id, toastId);
    return toastId;
  }

  /**
   * Finish a loading toast (update to success/error)
   */
  finishLoading(
    id: string,
    result: "success" | "error",
    message: string,
    options?: Omit<ToastOptions, "id">
  ) {
    const toastId = this.loadingToasts.get(id);
    if (!toastId) {
      // No loading toast found, just show new toast
      return this[result](message, options);
    }

    sonnerToast[result](message, {
      id: toastId,
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
    });

    this.loadingToasts.delete(id);
    return toastId;
  }

  /**
   * Update a loading toast with new message
   */
  updateLoading(id: string, message: string) {
    const toastId = this.loadingToasts.get(id);
    if (!toastId) return;

    sonnerToast.loading(message, { id: toastId });
  }

  // ═══════════════════════════════════════════
  // Batch Operations (Summary Toasts)
  // ═══════════════════════════════════════════

  /**
   * Show summary toast for batch success operations
   *
   * @param items - List of item names
   * @param action - Action verb (e.g., "tải xuống", "xóa", "lưu")
   *
   * @example
   * toast.batchSuccess(["ảnh1.jpg", "ảnh2.jpg", "ảnh3.jpg"], "tải xuống");
   * // → "Đã tải xuống 3 mục"
   * //   "ảnh1.jpg, ảnh2.jpg, ảnh3.jpg"
   */
  batchSuccess(items: string[], action: string) {
    if (items.length === 0) return;

    // Single item: show specific message
    if (items.length === 1) {
      return this.success(`Đã ${action} ${items[0]}`);
    }

    // Multiple items: show summary with description
    const preview = items.slice(0, 3).join(", ");
    const remaining = items.length > 3 ? ` và ${items.length - 3} mục khác` : "";

    return this.success(`Đã ${action} ${items.length} mục`, {
      description: preview + remaining,
    });
  }

  /**
   * Show summary toast for batch error operations
   */
  batchError(items: string[], action: string) {
    if (items.length === 0) return;

    if (items.length === 1) {
      return this.error(`Không thể ${action} ${items[0]}`);
    }

    const preview = items.slice(0, 3).join(", ");
    const remaining = items.length > 3 ? ` và ${items.length - 3} mục khác` : "";

    return this.error(`Không thể ${action} ${items.length} mục`, {
      description: preview + remaining,
    });
  }

  // ═══════════════════════════════════════════
  // Server Action Integration
  // ═══════════════════════════════════════════

  /**
   * Show toast based on server action result
   * Compatible with existing `toastResult()` pattern
   *
   * @example
   * const result = await createGallery(...);
   * toast.result(result, "Tạo album thành công");
   */
  result(
    result: { success: boolean; error?: string },
    successMessage: string,
    options?: ToastOptions
  ) {
    if (result.success) {
      return this.success(successMessage, options);
    } else {
      return this.error(result.error || "Có lỗi xảy ra", options);
    }
  }

  // ═══════════════════════════════════════════
  // Promise Helper (Auto Loading → Success/Error)
  // ═══════════════════════════════════════════

  /**
   * Wrap a promise with automatic loading → success/error toast
   *
   * @example
   * await toast.promise(
   *   fetchData(),
   *   {
   *     loading: "Đang tải...",
   *     success: "Thành công!",
   *     error: "Lỗi!"
   *   }
   * );
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error?: string | ((error: any) => string);
    }
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err) => {
        if (typeof messages.error === "function") {
          return messages.error(err);
        }
        return messages.error || err?.message || "Có lỗi xảy ra";
      },
    });
  }

  // ═══════════════════════════════════════════
  // Action Toasts (Undo/Retry)
  // ═══════════════════════════════════════════

  /**
   * Success toast with undo action
   *
   * @example
   * toast.successWithUndo("Đã xóa ảnh", () => restoreImage(id));
   */
  successWithUndo(
    message: string,
    onUndo: () => void,
    options?: Omit<ToastOptions, "action">
  ) {
    return this.success(message, {
      ...options,
      duration: options?.duration || 6000, // Longer for actions
      action: {
        label: "Hoàn tác",
        onClick: onUndo,
      },
    });
  }

  /**
   * Error toast with retry action
   *
   * @example
   * toast.errorWithRetry("Không thể tải", () => retryDownload());
   */
  errorWithRetry(
    message: string,
    onRetry: () => void,
    options?: Omit<ToastOptions, "action">
  ) {
    return this.error(message, {
      ...options,
      duration: options?.duration || 8000,
      action: {
        label: "Thử lại",
        onClick: onRetry,
      },
    });
  }

  // ═══════════════════════════════════════════
  // Critical Toasts (No Auto-Dismiss)
  // ═══════════════════════════════════════════

  /**
   * Critical toast that requires manual dismiss
   * Used for important errors/warnings that user must acknowledge
   *
   * @example
   * toast.critical("Thanh toán thất bại - Vui lòng kiểm tra lại", "error");
   */
  critical(message: string, type: "success" | "error" | "warning" = "error") {
    return this[type](message, {
      duration: Infinity, // Never auto-dismiss
      closeButton: true, // Must manually close
    });
  }

  // ═══════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════

  /**
   * Dismiss a specific toast by ID
   */
  dismiss(toastId?: string | number) {
    sonnerToast.dismiss(toastId);
  }

  /**
   * Clear all active toasts
   */
  clear() {
    this.activeToasts.forEach((id) => sonnerToast.dismiss(id));
    this.loadingToasts.forEach((id) => sonnerToast.dismiss(id));
    this.activeToasts.clear();
    this.loadingToasts.clear();
  }
}

// ═══════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════

export const toastManager = new ToastManager();

// ═══════════════════════════════════════════
// Backward-Compatible API (Default Export)
// ═══════════════════════════════════════════

/**
 * Simple toast API (backward compatible)
 *
 * @example
 * import { toast } from "@/lib/toast-manager";
 * toast.success("Đã lưu");
 * toast.error("Lỗi");
 */
export const toast = {
  // Core methods
  success: (msg: string, opts?: ToastOptions) => toastManager.success(msg, opts),
  error: (msg: string, opts?: ToastOptions) => toastManager.error(msg, opts),
  info: (msg: string, opts?: ToastOptions) => toastManager.info(msg, opts),
  warning: (msg: string, opts?: ToastOptions) => toastManager.warning(msg, opts),
  loading: (msg: string, opts?: Omit<ToastOptions, "duration">) => toastManager.loading(msg, opts),

  // Loading flow
  startLoading: toastManager.startLoading.bind(toastManager),
  finishLoading: toastManager.finishLoading.bind(toastManager),
  updateLoading: toastManager.updateLoading.bind(toastManager),

  // Batch operations
  batchSuccess: toastManager.batchSuccess.bind(toastManager),
  batchError: toastManager.batchError.bind(toastManager),

  // Server actions
  result: toastManager.result.bind(toastManager),

  // Promise helper
  promise: toastManager.promise.bind(toastManager),

  // Action toasts
  successWithUndo: toastManager.successWithUndo.bind(toastManager),
  errorWithRetry: toastManager.errorWithRetry.bind(toastManager),

  // Critical
  critical: toastManager.critical.bind(toastManager),

  // Utilities
  dismiss: toastManager.dismiss.bind(toastManager),
  clear: toastManager.clear.bind(toastManager),
};
