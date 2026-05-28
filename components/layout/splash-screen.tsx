"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);
  const hasCheckedSession = useRef(false);

  // Check sessionStorage immediately on mount (synchronous)
  useEffect(() => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    try {
      const hasVisited = sessionStorage.getItem("ms_v2_loaded");

      if (hasVisited) {
        // User has visited before - hide immediately
        setTimeout(() => {
          setHidden(true);
          setShow(false);
        }, 0);
      } else {
        // First visit - mark as visited and show splash
        sessionStorage.setItem("ms_v2_loaded", "1");
      }
    } catch (error) {
      // If sessionStorage fails, just show the splash
    }
  }, []);

  useEffect(() => {
    // If hidden, don't bother with fade animation
    if (hidden) return;

    // Wait for the window to load or just after a small delay
    const startFadeOut = () => {
      setFadeOut(true);
      setTimeout(() => {
        setShow(false);
      }, 300);
    };

    if (document.readyState === "complete") {
      const t = setTimeout(startFadeOut, 500);
      return () => clearTimeout(t);
    } else {
      window.addEventListener("load", startFadeOut);
      const t = setTimeout(startFadeOut, 4000);
      return () => {
        window.removeEventListener("load", startFadeOut);
        clearTimeout(t);
      };
    }
  }, [hidden]);

  if (!show) return null;

  return (
    <div
      id="splash-screen"
      className={`${fadeOut ? "fade-out" : ""} ${hidden ? "hidden" : ""}`}
      suppressHydrationWarning
    >
      <Image src="/logo.png" alt="Mood Studio" width={80} height={80} priority />
    </div>
  );
}
