"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscape } from "@/hooks/useEscape";
import { useSwipeDismiss } from "@/hooks/useSwipeDismiss";
import { ModalPortal } from "@/components/ui/modal-portal";

// ─── Constants ─────────────────────────────────────────────────────────────────

const CLOSE_DURATION = 250; // ms — phải khớp với animation duration

// C1: Size system
// Dùng inline style thay Tailwind dynamic class (Tailwind không thể scan dict lookup)
// maxWidth áp dụng mọi lúc: trên mobile (< 430px) luôn < mọi giá trị → full-width tự nhiên
const MAX_WIDTH_MAP: Record<ModalSize, string | undefined> = {
  sm:   "384px",
  md:   "448px",
  lg:   "512px",   // DEFAULT
  xl:   "576px",
  "2xl": "672px",
  "3xl": "768px",
  full: undefined, // không giới hạn
} as const;

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";

// ─── Props ────────────────────────────────────────────────────────────────────

interface UnifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  /** Đóng khi click backdrop (default: true) */
  closeOnBackdrop?: boolean;
  /** Đóng khi nhấn ESC (default: true) */
  closeOnEsc?: boolean;
  /** Hiện drag handle trên mobile (default: true) */
  showDragHandle?: boolean;
  /** C1: Size preset — chỉ ảnh hưởng desktop (default: "lg") */
  size?: ModalSize;
  /** C2: Sticky footer — không cuộn cùng body */
  footer?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UnifiedModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  showDragHandle = true,
  size = "lg",
  footer,
}: UnifiedModalProps) {
  const [isClosing, setIsClosing] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  // handleClose — wrap onClose với delay để animation chạy trước
  const handleClose = React.useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, CLOSE_DURATION);
  }, [isClosing, onClose]);

  // A3+D3: Scroll lock + scrollbar compensation (prevent page shift on Windows)
  React.useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  // D1: Auto-focus REMOVED — consumers use autoFocus prop on their inputs
  // C3: Tab cycling handler kept below for accessibility

  // C3: Tab cycling handler
  const handleTabKey = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const el = dialogRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // A5: ESC key via reusable hook
  useEscape(handleClose, closeOnEsc && isOpen && !isClosing);

  // B4: Swipe-to-dismiss (mobile)
  const { swipeStyle, backdropOpacity, isSwiping, handlers } = useSwipeDismiss(handleClose);

  // A4: Backdrop click
  const handleBackdropClick = React.useCallback(() => {
    if (closeOnBackdrop) handleClose();
  }, [closeOnBackdrop, handleClose]);

  // B2: Animation classes dùng V2 CSS system (pages.css)
  const contentAnimation = isSwiping
    ? ""
    : isClosing
      ? "animate-slide-down lg:animate-modal-out"
      : "animate-slide-up lg:card-entrance";

  const backdropAnimation = isClosing
    ? "opacity-0 transition-opacity duration-200"
    : "animate-backdrop-in";

  if (!isOpen && !isClosing) return null;

  return (
    <ModalPortal>
      {/*
        B1 FIX: flex-col justify-end (mobile = bottom sheet full-width)
        → lg: justify-center items-center (desktop = centered dialog)
        KHÔNG dùng flex-row items-end vì justify-center sẽ shrink modal
      */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleTabKey}
        style={{ position: "fixed", inset: 0, zIndex: 9999 }}
        className="flex flex-col justify-end lg:justify-center lg:items-center"
      >
        {/* Backdrop */}
        <div
          className={cn("absolute inset-0 bg-black/40 backdrop-blur-[2px]", backdropAnimation)}
          style={backdropOpacity !== undefined ? { opacity: backdropOpacity } : undefined}
          onClick={handleBackdropClick}
        />

        {/* Modal card — full-width mobile, capped on desktop */}
        <div
          className={cn(
            "relative w-full z-10 will-change-transform",
            "rounded-t-2xl lg:rounded-2xl",
            "max-h-[98dvh] lg:max-h-[90vh]",
            "bg-(--color-bg-card) shadow-2xl",
            "flex flex-col overflow-hidden",
            contentAnimation,
            className
          )}
          style={{
            maxWidth: MAX_WIDTH_MAP[size],
            marginLeft: "auto",
            marginRight: "auto",
            animationDuration: "200ms", // D2: match original V2 speed (was 300ms)
            ...swipeStyle,
          }}
        >
          {/* B3: Drag handle (mobile only, swipeable) */}
          {showDragHandle && (
            <div
              className="lg:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
              {...handlers}
            >
              <div className={cn(
                "w-10 h-1 rounded-full transition-colors",
                isSwiping ? "bg-text-muted" : "bg-border"
              )} />
            </div>
          )}

          {/* Header (also swipeable on mobile) */}
          {(title || showCloseButton) && (
            <div
              className="shrink-0 flex items-start justify-between px-6 pt-5 pb-4 sm:px-8"
              {...(showDragHandle ? handlers : {})}
            >
              <div className="flex flex-col gap-1">
                {title && <h3 className="text-h3">{title}</h3>}
                {description && (
                  <p className="text-xs text-text-muted font-medium">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  aria-label="Đóng"
                  className="shrink-0 p-2 bg-(--color-bg-hover) rounded-full text-text-muted hover:text-dark transition-all hover:rotate-90 active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 sm:px-8 overflow-x-hidden">
            {children}
          </div>

          {/* C2: Sticky footer — shrink-0, không cuộn cùng body */}
          {footer && (
            <div className="shrink-0 px-6 py-4 sm:px-8 border-t border-border flex gap-3 justify-end">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
