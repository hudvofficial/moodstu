import { useCallback } from "react";
import { haptic, type HapticStyle, isHapticSupported } from "@/lib/haptic";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Hook for haptic feedback - only triggers on mobile devices
 * Returns a memoized callback that can be used in event handlers
 */
export function useHaptic() {
  const isMobile = useIsMobile();

  const trigger = useCallback(
    (style: HapticStyle = "light") => {
      if (!isMobile) return false;
      return haptic(style);
    },
    [isMobile]
  );

  return {
    trigger,
    isSupported: isMobile && isHapticSupported(),
  };
}
