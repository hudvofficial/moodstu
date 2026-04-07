"use client";

import { Loader2 } from "lucide-react";

// ═══════════════════════════════════════════
// FormActions — Submit + Cancel + Save Draft
//
// variant="fixed"  → fixed bottom-0 footer (mobile only, lg:hidden)
// variant="panel"  → inline buttons for right sticky panel (desktop)
// ═══════════════════════════════════════════

interface Props {
  isSubmitting: boolean;
  isEditMode: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onSaveDraft?: () => void;
  error?: string;
  /** "fixed" = mobile fixed footer | "panel" = desktop right panel inline */
  variant?: "fixed" | "panel";
}

export function FormActions({
  isSubmitting,
  isEditMode,
  onSubmit,
  onCancel,
  onSaveDraft,
  error,
  variant = "fixed",
}: Props) {
  // ── Panel variant: inline buttons for right column (desktop) ──
  if (variant === "panel") {
    return (
      <div className="card-base p-4 space-y-3">
        {error && (
          <p className="error-text bg-error/10 px-3 py-2 rounded-radius-md text-sm">
            {error}
          </p>
        )}

        {/* Primary CTA */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="btn btn-interactive w-full justify-center font-bold shadow-sm shadow-interactive/20"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditMode ? "Cập nhật hợp đồng" : "Tạo hợp đồng"}
        </button>

        {/* Secondary actions */}
        <div className="flex items-center gap-2">
          {!isEditMode && onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="btn btn-ghost flex-1 border border-interactive/20 text-interactive hover:bg-interactive/5"
            >
              Lưu nháp
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn btn-ghost flex-1 text-text-secondary"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  // ── Fixed variant: bottom-0 footer (mobile only) ──
  return (
    <>
      {error && (
        <p className="lg:hidden error-text bg-error/10 px-4 py-2 rounded-radius-md mb-3 fixed bottom-[72px] left-4 right-4 z-50">
          {error}
        </p>
      )}

      {/* Fixed footer — hidden on desktop (right panel handles it) */}
      <footer className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-card shadow-md shadow-black/5 py-3 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Mobile: 3 buttons in 1 row */}
        <div className="flex items-center gap-2">
          {/* Hủy */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn btn-ghost flex-1 h-11 text-sm text-text-secondary border border-border-default"
          >
            Hủy
          </button>

          {/* Lưu nháp */}
          {!isEditMode && onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="btn flex-1 h-11 text-sm text-interactive border border-interactive/30 hover:bg-interactive/5"
            >
              Lưu nháp
            </button>
          )}

          {/* CTA chính */}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="btn btn-interactive flex-1 h-11 text-sm font-semibold shadow-sm"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditMode ? "Cập nhật" : "Tạo HĐ"}
          </button>
        </div>
      </footer>
    </>
  );
}
