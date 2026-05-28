"use client";

import { useState, useEffect } from "react";
import { useIsMobile, useIsSmallMobile } from "./use-mobile";

/**
 * Hook to detect if the virtual keyboard is open on mobile devices.
 * Relies on listening to focus events on text inputs and textareas.
 */
export function useVirtualKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const isMobile = useIsMobile(); // <1024px

  useEffect(() => {
    // Only detect on mobile devices
    if (!isMobile) {
      if (isKeyboardOpen) setIsKeyboardOpen(false);
      return;
    }

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const tagName = target.tagName;
      const isTextInput =
        tagName === "INPUT" &&
        ["text", "search", "password", "email", "number", "tel", "url"].includes(
          (target as HTMLInputElement).type
        );
      const isTextArea = tagName === "TEXTAREA";
      const isContentEditable = target.isContentEditable;

      if (isTextInput || isTextArea || isContentEditable) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      // Small delay to prevent flickering when moving focus between inputs
      setTimeout(() => {
        const activeElement = document.activeElement as HTMLElement;
        if (!activeElement) {
          setIsKeyboardOpen(false);
          return;
        }

        const tagName = activeElement.tagName;
        const isTextInput =
          tagName === "INPUT" &&
          ["text", "search", "password", "email", "number", "tel", "url"].includes(
            (activeElement as HTMLInputElement).type
          );
        const isTextArea = tagName === "TEXTAREA";
        const isContentEditable = activeElement.isContentEditable;

        if (!isTextInput && !isTextArea && !isContentEditable) {
          setIsKeyboardOpen(false);
        }
      }, 50);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, [isMobile, isKeyboardOpen]);

  return isKeyboardOpen;
}
