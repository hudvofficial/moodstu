"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Heart, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

// ═══════════════════════════════════════════
// ImageViewer — Full-screen gallery slider
// Swipe (mobile) + Arrow keys (desktop)
// ═══════════════════════════════════════════

interface GalleryImage {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  file_name: string | null;
  is_selected: boolean;
  client_note: string | null;
  drive_file_id: string | null;
}

interface ImageViewerProps {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onToggleHeart: (imageId: string) => void;
  onSaveNote: (imageId: string, note: string) => void;
  mode?: "select" | "view";
}

export default function ImageViewer({
  images,
  currentIndex,
  onClose,
  onIndexChange,
  onToggleHeart,
  onSaveNote,
  mode = "select",
}: ImageViewerProps) {
  const [noteValue, setNoteValue] = useState("");
  const current = images[currentIndex];
  const isViewOnly = mode === "view";

  // Sync note when image changes
  /* eslint-disable */
  useEffect(() => {
    setNoteValue(current?.client_note || "");
  }, [currentIndex, current?.client_note]);
  /* eslint-enable */

  // Preload next/prev images for smooth navigation
  useEffect(() => {
    const preload = (idx: number) => {
      const img = images[idx];
      if (!img) return;
      const url = img.thumbnail_url
        ? img.thumbnail_url.replace(/sz=s\d+/, "sz=s1600")
        : img.image_url;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = url;
      document.head.appendChild(link);
      return link;
    };
    const links = [preload(currentIndex - 1), preload(currentIndex + 1)].filter(Boolean) as HTMLLinkElement[];
    return () => links.forEach((l) => l.remove());
  }, [currentIndex, images]);

  // ─── Navigation ────────────────────────────
  const goNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  }, [currentIndex, images.length, onIndexChange]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  }, [currentIndex, onIndexChange]);

  // ─── Keyboard shortcuts ────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "Escape":
          onClose();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  // ─── Touch/swipe support ───────────────────
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    setTouchStart(null);
  };

  // ─── Save note on blur ─────────────────────
  const handleNoteBlur = () => {
    if (noteValue !== (current?.client_note || "")) {
      onSaveNote(current.id, noteValue);
    }
  };

  if (!current) return null;

  // Big image URL (sz=s1600 for full-screen — avoid loading 30MB+ originals)
  const bigImageUrl = current.thumbnail_url
    ? current.thumbnail_url.replace(/sz=s\d+/, "sz=s1600")
    : current.image_url;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.95)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10">
        <div
          role="button"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={(e) => { if (e.key === "Enter") onClose() }}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 cursor-pointer"
        >
          <X size={20} style={{ color: "white" }} />
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs truncate max-w-40"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            {current.file_name || ""}
          </span>

          {/* Download button */}
          {!isViewOnly && current.drive_file_id && (
            <a
              href={`/api/drive-download/${current.drive_file_id}`}
              download
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <Download size={18} style={{ color: "white" }} />
            </a>
          )}

          {/* Heart button */}
          {!isViewOnly && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onToggleHeart(current.id)}
              onKeyDown={(e) => { if (e.key === "Enter") onToggleHeart(current.id) }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${current.is_selected ? "bg-red-500/80" : "bg-white/10"}`}
            >
              <Heart
                size={18}
                fill={current.is_selected ? "white" : "none"}
                style={{ color: "white" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Prev arrow (desktop) */}
        {currentIndex > 0 && (
          <div
            role="button"
            tabIndex={0}
            onClick={goPrev}
            onKeyDown={(e) => { if (e.key === "Enter") goPrev() }}
            className="hidden md:flex absolute left-4 w-10 h-10 rounded-full items-center justify-center z-10 bg-white/10 cursor-pointer"
          >
            <ChevronLeft size={24} style={{ color: "white" }} />
          </div>
        )}

        {/* Mobile tap zones (invisible) */}
        {currentIndex > 0 && (
          <div
            className="md:hidden absolute inset-y-0 left-0 z-10"
            style={{ width: "30%" }}
            onClick={goPrev}
          />
        )}
        {currentIndex < images.length - 1 && (
          <div
            className="md:hidden absolute inset-y-0 right-0 z-10"
            style={{ width: "30%" }}
            onClick={goNext}
          />
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bigImageUrl}
          alt={current.file_name || "ảnh"}
          className="max-w-full max-h-full object-contain"
          style={{ animation: "fadeIn 0.2s ease-out" }}
        />

        {/* Next arrow (desktop) */}
        {currentIndex < images.length - 1 && (
          <div
            role="button"
            tabIndex={0}
            onClick={goNext}
            onKeyDown={(e) => { if (e.key === "Enter") goNext() }}
            className="hidden md:flex absolute right-4 w-10 h-10 rounded-full items-center justify-center z-10 bg-white/10 cursor-pointer"
          >
            <ChevronRight size={24} style={{ color: "white" }} />
          </div>
        )}
      </div>

      {/* Bottom bar — note + counter */}
      <div className="px-4 py-3 relative z-10">
        {/* Note input — hide in view-only */}
        {!isViewOnly && (
          <div className="max-w-lg mx-auto mb-2">
            <Input
              type="text"
              placeholder="Ghi chú cho ảnh này..."
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={handleNoteBlur}
              className="w-full px-3 py-2 text-sm rounded-lg outline-none bg-white/5 text-white ring-1 ring-inset ring-white/10 border-0 focus-visible:ring-1 focus-visible:ring-white/50"
            />
          </div>
        )}

        {/* Counter */}
        <div className="text-center">
          <span
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {currentIndex + 1} / {images.length}
          </span>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
