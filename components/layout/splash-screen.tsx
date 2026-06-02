"use client";

import { useEffect, useState } from "react";
// Removed Next/Image to prevent hydration mismatch on injected attributes

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Check if user has visited before (skip splash on repeat visits)
    let shouldShow = true;
    try {
      const hasVisited = sessionStorage.getItem("ms_v2_loaded");
      if (hasVisited) {
        shouldShow = false;
        setShow(false);
        return;
      }
      sessionStorage.setItem("ms_v2_loaded", "1");
    } catch {
      // If sessionStorage fails, show splash anyway
    }

    if (!shouldShow) return;

    // Fade out after minimum display time
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 800);

    const hideTimer = setTimeout(() => {
      setShow(false);
    }, 1100); // 800ms display + 300ms fade

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      id="splash-screen"
      className={fadeOut ? "fade-out" : ""}
      suppressHydrationWarning
    >
      <img src="/logo.png" alt="Mood Studio" width={80} height={80} />
    </div>
  );
}
