"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // If skip-splash is on html, it means sessionStorage was already set
    // We can just remove it immediately without fading out
    if (document.documentElement.classList.contains("skip-splash")) {
      setShow(false);
      return;
    }

    // Wait for the window to load or just after a small delay
    const startFadeOut = () => {
      setFadeOut(true);
      setTimeout(() => {
        setShow(false);
      }, 300); // matches the CSS transition duration
    };

    if (document.readyState === "complete") {
      // If already loaded
      const t = setTimeout(startFadeOut, 500); // small delay to let users see it
      return () => clearTimeout(t);
    } else {
      window.addEventListener("load", startFadeOut);
      // Fallback in case load takes too long
      const t = setTimeout(startFadeOut, 4000);
      return () => {
        window.removeEventListener("load", startFadeOut);
        clearTimeout(t);
      };
    }
  }, []);

  if (!show) return null;

  return (
    <div id="splash-screen" className={fadeOut ? "fade-out" : ""}>
      <img src="/logo.png" alt="Mood Studio" width={80} height={80} />
    </div>
  );
}
