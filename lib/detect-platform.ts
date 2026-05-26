// ═══════════════════════════════════════════
// Platform Detection — Detect iOS Safari, iOS Webview, Android, Desktop
// Used by image-viewer.tsx for hybrid download strategy
// ═══════════════════════════════════════════

export type Platform = "ios-safari" | "ios-webview" | "android" | "desktop";

/**
 * Detect the current platform for download strategy selection.
 *
 * - ios-safari:  Native Safari on iPhone/iPad → supports long-press "Save Image"
 * - ios-webview: In-app browser (Zalo, Facebook, Chrome on iOS) → fallback to native download
 * - android:     Any Android browser → native download auto-saves to Gallery
 * - desktop:     Everything else → native download
 */
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";

  const ua = navigator.userAgent;

  // iPad with desktop UA (iPadOS 13+)
  const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPad;

  if (isIOS) {
    // Safari on iOS: has "Safari" in UA but NOT Chrome/Firefox/etc wrappers
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome|EdgiOS|OPiOS/.test(ua);
    return isSafari ? "ios-safari" : "ios-webview";
  }

  if (/Android/.test(ua)) return "android";

  return "desktop";
}
