"use client";

/**
 * 🎯 Responsive Toaster Wrapper (Phase 3: Mobile UX)
 *
 * Features:
 * - Responsive positioning: bottom-center on mobile, top-right on desktop
 * - Mobile bottom nav offset (avoids overlap)
 * - Swipe-to-dismiss enabled
 * - Maintains design system styling
 *
 * Mobile (<768px): bottom-center with bottom nav offset
 * Desktop (≥768px): top-right with header offset
 */

import { Toaster } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { useEffect, useState } from "react";

export function ToasterWrapper() {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on client-side
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Prevent hydration mismatch - render with default first
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // SSR: render with desktop config
    return (
      <Toaster
        position="top-right"
        className="!top-[60px] lg:!top-[72px] !right-4 lg:!right-8 flex flex-col items-end"
        toastOptions={{
          classNames: {
            toast: "group flex flex-row-reverse items-center gap-2.5 !w-auto !min-w-0 max-w-[400px] ml-auto",
            title: "text-[13px] font-medium text-text-primary",
            description: "text-[12px] text-text-muted mt-0.5",
            icon: "m-0 shrink-0",
          },
          style: {
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "8px 12px",
            boxShadow: "var(--shadow-md)",
          },
        }}
        icons={{
          success: <CheckCircle2 className="w-4 h-4 text-success" />,
          error: <XCircle className="w-4 h-4 text-error" />,
          warning: <AlertCircle className="w-4 h-4 text-warning" />,
          info: <Info className="w-4 h-4 text-text-muted" />,
        }}
      />
    );
  }

  // Client-side: responsive config
  return (
    <Toaster
      // Responsive positioning
      position={isMobile ? "bottom-center" : "top-right"}
      // Responsive offset classes
      className={
        isMobile
          ? // Mobile: bottom-center với bottom nav offset (60px nav + max(0.5rem, safe-area) + 1rem gap)
            "!bottom-[calc(60px+max(0.5rem,env(safe-area-inset-bottom))+1rem)] !left-1/2 !-translate-x-1/2 flex flex-col items-center"
          : // Desktop: top-right với header offset
            "!top-[60px] lg:!top-[72px] !right-4 lg:!right-8 flex flex-col items-end"
      }
      // Mobile-specific options
      closeButton={isMobile} // Show close button on mobile
      expand={!isMobile} // Don't expand on mobile
      richColors={true} // Better colors
      // Toast options
      toastOptions={{
        classNames: {
          toast: isMobile
            ? // Mobile: centered, full-width (with max)
              "group flex flex-row-reverse items-center gap-2.5 !w-[calc(100vw-2rem)] !max-w-[400px] mx-auto"
            : // Desktop: right-aligned
              "group flex flex-row-reverse items-center gap-2.5 !w-auto !min-w-0 max-w-[400px] ml-auto",
          title: "text-[13px] font-medium text-text-primary",
          description: "text-[12px] text-text-muted mt-0.5",
          icon: "m-0 shrink-0",
          closeButton: "!bg-bg-hover !border-border",
        },
        style: {
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "8px 12px",
          boxShadow: "var(--shadow-md)",
          // Enable swipe gestures on mobile
          touchAction: isMobile ? "pan-y" : "auto",
        },
        // Mobile: shorter duration (thumb-friendly)
        duration: isMobile ? 3000 : 4000,
      }}
      // Icons (same for mobile and desktop)
      icons={{
        success: <CheckCircle2 className="w-4 h-4 text-success" />,
        error: <XCircle className="w-4 h-4 text-error" />,
        warning: <AlertCircle className="w-4 h-4 text-warning" />,
        info: <Info className="w-4 h-4 text-text-muted" />,
      }}
    />
  );
}
