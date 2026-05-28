"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  // Start with mounted=false to ensure consistent SSR/CSR initial render
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // If skip-splash is on html, it means sessionStorage was already set
    if (document.documentElement.classList.contains("skip-splash")) {
      setShow(false);
      return;
    }

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
  }, [mounted]);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) return null;
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
