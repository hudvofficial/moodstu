/**
 * 📦 Toast Utility (V2)
 *
 * Shared toast notifications — thin wrapper over Sonner.
 * Pattern: toast(message, type) — same API as mcoffe
 */

import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "info" | "warning";

/**
 * Show a toast notification via Sonner.
 * Sonner <Toaster> is mounted in app/layout.tsx with design-system styling.
 */
export function toast(message: string, type: ToastType = "info") {
  switch (type) {
    case "success":
      sonnerToast.success(message);
      break;
    case "error":
      sonnerToast.error(message);
      break;
    case "warning":
      sonnerToast.warning(message);
      break;
    case "info":
    default:
      sonnerToast.info(message);
      break;
  }
}

/**
 * Toast result from server action
 * Pattern: const result = await action(); toastResult(result, "Thành công!");
 */
export function toastResult(
  result: { success: boolean; error?: string },
  successMessage: string
) {
  if (result.success) {
    toast(successMessage, "success");
  } else {
    toast(result.error || "Có lỗi xảy ra", "error");
  }
}
