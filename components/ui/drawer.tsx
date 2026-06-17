"use client";

/**
 * 📦 Drawer — Shared slide panel
 *
 * Desktop: side drawer from right (480px default)
 * Mobile: bottom sheet (85vh, rounded top, drag handle)
 * Portal rendered, overlay click + Escape to close, body scroll lock.
 */

import { useEffect, useCallback, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── TYPES ───────────────────────────────────────

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Optional badge rendered next to the title (e.g. status badge) */
  titleBadge?: ReactNode;
  /** Optional element rendered at the right side of header (e.g. print button) */
  headerRight?: ReactNode;
  children: ReactNode;
  /** 
   * Pre-defined sizes ensuring project-wide consistency 
   * md: 480px (Gold Standard - Default)
   * lg: 600px (Forms / CRM detail / Multi-column content)
   */
  size?: "md" | "lg";
  /** 
   * Desktop panel width — deprecated in favor of `size` prop.
   * Retained for backward-compatibility. 
   */
  width?: string;
}

// ─── HOOK: Body scroll lock ─────────────────────

function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}

// ─── COMPONENT ───────────────────────────────────

export function Drawer({
  isOpen,
  onClose,
  title,
  titleBadge,
  headerRight,
  children,
  size = "md",
  width,
}: DrawerProps) {
  const desktopPanelRef = useRef<HTMLElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const desktopTitleId = `${titleId}-desktop`;
  const mobileTitleId = `${titleId}-mobile`;

  // Resolve width based on size, fallback to explicit 'width' prop if provided
  const resolvedWidth = width || (size === "lg" ? "600px" : "480px");

  const getActivePanel = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      return desktopPanelRef.current;
    }
    return mobilePanelRef.current;
  }, []);

  // Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Body scroll lock
  useBodyScrollLock(isOpen);

  // Restore focus and move focus into the active panel when opened.
  useEffect(() => {
    if (!isOpen) return;

    const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const rafId = window.requestAnimationFrame(() => {
      getActivePanel()?.focus();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      previousActive?.focus();
    };
  }, [getActivePanel, isOpen]);

  const trapFocus = useCallback((container: HTMLElement, backwards: boolean, preventDefault: () => void) => {
    const focusables = container.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (backwards && document.activeElement === first) {
      preventDefault();
      last.focus();
    } else if (!backwards && document.activeElement === last) {
      preventDefault();
      first.focus();
    }
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden
      />

      {/* ── Desktop: Side panel from right ── */}
      <aside
        ref={desktopPanelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? desktopTitleId : undefined}
        aria-label={title ? undefined : "Chi tiết"}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            trapFocus(e.currentTarget, e.shiftKey, () => e.preventDefault());
          }
        }}
        className="hidden md:flex flex-col fixed right-0 top-0 h-full bg-bg-base shadow-md rounded-l-2xl z-10 animate-slide-in-right outline-none"
        style={{ width: resolvedWidth, maxWidth: "90vw", outline: "none" }}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <h2 id={desktopTitleId} className="text-h3 truncate">{title}</h2>
              {titleBadge}
            </div>
            <div className="flex items-center gap-1">
              {headerRight}
              <Button
                unstyled
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary"
                aria-label="Đóng"
              >
                <X className="size-[18px]" />
              </Button>
            </div>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-6">{children}</div>
      </aside>

      {/* ── Mobile: Bottom sheet ── */}
      <aside
        ref={mobilePanelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? mobileTitleId : undefined}
        aria-label={title ? undefined : "Chi tiết"}
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            trapFocus(e.currentTarget, e.shiftKey, () => e.preventDefault());
          }
        }}
        className="md:hidden flex flex-col fixed bottom-0 left-0 right-0 bg-bg-base shadow-md rounded-t-2xl z-10 animate-slide-in-up outline-none"
        style={{ height: "85vh", outline: "none" }}
        tabIndex={-1}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border/50" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pb-3 shrink-0 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <h2 id={mobileTitleId} className="text-h3 truncate">{title}</h2>
              {titleBadge}
            </div>
            <div className="flex items-center gap-1">
              {headerRight}
              <Button
                unstyled
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-black/5 hover:text-text-primary"
                aria-label="Đóng"
              >
                <X className="size-[18px]" />
              </Button>
            </div>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
