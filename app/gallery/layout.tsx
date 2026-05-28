"use client";

import { useEffect } from "react";

/**
 * Gallery Public Layout
 * Override body overflow:hidden cho gallery pages
 * (globals.css đặt overflow:hidden trên html,body cho app-shell,
 *  gallery page không dùng app-shell nên cần unlock scroll)
 */
export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Override globals.css html,body { overflow: hidden; height: 100% }
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = "auto";
    html.style.height = "auto";
    body.style.overflow = "auto";
    body.style.height = "auto";

    return () => {
      // Cleanup khi navigate ra khỏi gallery
      html.style.overflow = "";
      html.style.height = "";
      body.style.overflow = "";
      body.style.height = "";
    };
  }, []);

  return <div className="gallery-public-layout">{children}</div>;
}
