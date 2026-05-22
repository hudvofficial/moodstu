/**
 * Haptic feedback utility for mobile devices
 * Uses navigator.vibrate() API - only works on Android and some other devices
 * iOS Safari doesn't support vibrate, but this will silently fail
 */

export type HapticStyle = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 40, 20],
  error: [30, 30, 30],
};

/**
 * Trigger haptic feedback
 * @param style - The type of haptic feedback
 * @returns true if vibration was triggered, false otherwise
 */
export function haptic(style: HapticStyle = "light"): boolean {
  if (typeof navigator === "undefined" || !navigator.vibrate) {
    return false;
  }

  try {
    return navigator.vibrate(HAPTIC_PATTERNS[style]);
  } catch {
    return false;
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}
