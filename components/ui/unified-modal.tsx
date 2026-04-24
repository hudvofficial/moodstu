"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscape } from "@/hooks/useEscape";
import { useSwipeDismiss } from "@/hooks/useSwipeDismiss";
import { ModalPortal } from "@/components/ui/modal-portal";
import { Button } from "@/components/ui/button";

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

  // F2: Scroll lock — V1 pattern (V1 CÓ scroll lock VÀ mượt, Phase E xóa sai)
  React.useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

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

  // B2+E/N2: Animation classes — ultra-fast for instant feel
  const contentAnimation = isSwiping
    ? ""
    : isClosing
      ? "animate-slide-down lg:animate-modal-out"
      : "animate-slide-up lg:animate-modal-in";

  const backdropAnimation = isClosing
    ? "opacity-0 transition-opacity duration-200"
    : "animate-backdrop-in";

  if (!isOpen && !isClosing) return null;

  return (
    <ModalPortal>
      {/* B1: modal-overlay = fixed inset-0, flex-col justify-end (mobile) → center (desktop) */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={handleTabKey}
        className="modal-overlay"
      >
        {/* Backdrop */}
        <div
          className={cn("absolute inset-0 bg-black/60", backdropAnimation)}
          style={backdropOpacity !== undefined ? { opacity: backdropOpacity } : undefined}
          onClick={handleBackdropClick}
        />

        {/* Modal card — modal-card SSOT + dynamic maxWidth/swipeStyle only */}
        <div
          className={cn("modal-card", contentAnimation, className)}
          style={{
            maxWidth: MAX_WIDTH_MAP[size],
            ...swipeStyle,
          }}
        >
          {/* B3: Drag handle (mobile only, swipeable) */}
          {showDragHandle && (
            <div
              className="lg:hidden flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
              {...handlers}
            >
              <div className={cn("modal-drag-handle", isSwiping && "is-swiping")} />
            </div>
          )}

          {/* Header (also swipeable on mobile) */}
          {(title || showCloseButton) && (
            <div
              className="modal-header"
              {...(showDragHandle ? handlers : {})}
            >
              <div className="flex flex-col gap-1">
                {title && <h3 className="text-h3">{title}</h3>}
                {description && (
                  <p className="text-xs text-text-muted font-medium">{description}</p>
                )}
              </div>
              {showCloseButton && (
                <Button
                  unstyled
                  type="button"
                  onClick={handleClose}
                  aria-label="Đóng"
                  className="modal-close-btn"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          )}

          {/* Body — scrollable */}
          <div className="modal-body">
            {children}
          </div>

          {/* C2: Sticky footer — modal-footer SSOT (shadow separator, no border-t) */}
          {footer && (
            <div className="modal-footer">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
