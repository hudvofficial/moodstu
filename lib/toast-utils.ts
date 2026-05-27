/**
 * 📦 Toast Utility (V3 - Phase 1: Foundation)
 *
 * Now powered by ToastManager with:
 * - Automatic deduplication
 * - Batch operations
 * - Loading flow support
 * - Server action integration
 *
 * Maintains backward compatibility with V2 API.
 */

import { toast as toastManager } from "@/lib/toast-manager";

type ToastType = "success" | "error" | "info" | "warning";

/**
 * Show a toast notification via ToastManager.
 * Backward compatible with V2 API: toast(message, type)
 *
 * @example
 * toast("Đã lưu", "success");
 * toast("Có lỗi xảy ra", "error");
 */
export function toast(message: string, type: ToastType = "info") {
  switch (type) {
    case "success":
      return toastManager.success(message);
    case "error":
      return toastManager.error(message);
    case "warning":
      return toastManager.warning(message);
    case "info":
    default:
      return toastManager.info(message);
  }
}

/**
 * Toast result from server action
 * Pattern: const result = await action(); toastResult(result, "Thành công!");
 *
 * Now uses ToastManager.result() under the hood
 */
export function toastResult(
  result: { success: boolean; error?: string },
  successMessage: string
) {
  return toastManager.result(result, successMessage);
}

// Re-export ToastManager for advanced usage
export { toastManager } from "@/lib/toast-manager";
