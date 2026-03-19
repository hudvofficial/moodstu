/**
 * 📦 Toast Utility (V2)
 *
 * Shared toast notifications — lightweight wrapper.
 * Uses native alert as fallback until toast library is added.
 * Pattern: toast(message, type) — same API as mcoffe
 */

type ToastType = "success" | "error" | "info" | "warning";

/**
 * Show a toast notification.
 * Currently console-based; swap for sonner/react-hot-toast when ready.
 */
export function toast(message: string, type: ToastType = "info") {
  // For now: console + can be swapped for any toast lib
  const prefix = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  }[type];

  console.log(`${prefix} [toast/${type}] ${message}`);

  // TODO: Replace with sonner or react-hot-toast
  // For MVP, we use a simple temporary DOM toast
  if (typeof window !== "undefined") {
    showDomToast(message, type);
  }
}

/** Lightweight DOM toast — no dependencies */
function showDomToast(message: string, type: ToastType) {
  const el = document.createElement("div");
  el.textContent = message;

  const colors: Record<ToastType, string> = {
    success: "#4CAF50",
    error: "#F44336",
    warning: "#FF9800",
    info: "#2196F3",
  };

  Object.assign(el.style, {
    position: "fixed",
    bottom: "80px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 24px",
    borderRadius: "12px",
    background: colors[type],
    color: "white",
    fontSize: "14px",
    fontWeight: "600",
    zIndex: "99999",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
    transition: "opacity 0.3s ease",
    opacity: "0",
    pointerEvents: "none" as const,
  });

  document.body.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.style.opacity = "1";
  });

  // Remove after 3s
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }, 3000);
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
