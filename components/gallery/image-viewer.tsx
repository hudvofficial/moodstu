"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  onToggleStar: (imageId: string) => void;
  onSaveNote: (imageId: string, note: string) => void;
  mode?: "select" | "view";
  accessToken?: string;
  totalImagesCount?: number;
}

export default function ImageViewer({
  images,
  currentIndex,
  onClose,
  onIndexChange,
  onToggleStar,
  onSaveNote,
  mode = "select",
  accessToken = "admin",
  totalImagesCount,
}: ImageViewerProps) {
  const current = images[currentIndex];

  // Decode capability from token if not admin
  let clientCapability = "select";
  if (accessToken && accessToken !== "admin") {
    try {
      const [bodyPart] = accessToken.split(".");
      const payload = JSON.parse(atob(bodyPart.replace(/-/g, "+").replace(/_/g, "/")));
      clientCapability = payload.capability || "select";
    } catch {}
  }

  const showDownloadButton = current?.drive_file_id && (accessToken === "admin" || clientCapability !== "view");

  // Preload next/prev images for smooth navigation
  useEffect(() => {
    const preload = (idx: number) => {
      const img = images[idx];
      if (!img) return;
      // Use image_url (lh3) directly, not thumbnail_url (drive redirect)
      const url = img.image_url
        ? (img.image_url.includes('=s')
            ? img.image_url.replace(/=s\d+/, '=s1600')
            : img.image_url + '=s1600')
        : img.thumbnail_url || '';
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

  // ─── Universal Download (hidden iframe - works on ALL platforms) ───────────────
  const handleDownload = useCallback(() => {
    if (!current) return;
    const apiUrl = `/api/gallery-download/${accessToken}/${current.id}`;
    const fileName = current.file_name || "photo.jpg";

    // Hidden iframe method - works universally (same as admin)
    // iOS Safari, Android, Desktop all work without user intervention!
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = apiUrl;
      document.body.appendChild(iframe);

      // Cleanup after 10s
      setTimeout(() => {
        try { iframe.remove(); } catch {}
      }, 10000);

      // Show success toast
      toast.success(`Đang tải ${fileName}...`, { duration: 3000 });
    } catch (error) {
      // Fallback: open in new window
      window.open(apiUrl, "_blank", "noopener,noreferrer");
      toast.info("Đã mở ảnh trong tab mới", { duration: 3000 });
    }
  }, [current, accessToken]);

  if (!current) return null;

  // Big image URL - Use image_url directly (lh3) with size parameter
  // DO NOT use thumbnail_url → it redirects and browser can't follow in some contexts
  const bigImageUrl = current.image_url
    ? (current.image_url.includes('=s')
        ? current.image_url.replace(/=s\d+/, '=s1600')
        : current.image_url + '=s1600')
    : current.thumbnail_url || '';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#000" }}
    >
      {/* Top bar */}
      <div className="grid grid-cols-3 items-center px-4 py-3 relative z-10 bg-gradient-to-b from-black/60 to-transparent">
        {/* Left: Blank */}
        <div className="flex justify-start"></div>

        {/* Center: File name */}
        <div className="flex justify-center min-w-0">
          <span className="text-sm font-medium text-white/90 truncate px-3 py-1 bg-black/30 rounded-full max-w-[200px] md:max-w-[400px]">
            {current.file_name || "Photo"}
          </span>
        </div>

        {/* Right: Close */}
        <div className="flex justify-end">
          <div
            role="button"
            tabIndex={0}
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === "Enter") onClose() }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 cursor-pointer hover:bg-white/20 transition-colors"
          >
            <X size={20} style={{ color: "white" }} />
          </div>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative overflow-hidden px-2 py-2 md:px-12"
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
          key={current.id}
          src={bigImageUrl}
          alt={current.file_name || "ảnh"}
          className="max-w-full max-h-full object-contain"
          style={{ animation: "fadeIn 0.25s ease-out" }}
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

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-4 py-3 relative z-10 bg-gradient-to-t from-black/60 to-transparent">
        {/* Left: Info */}
        <div className="flex items-center">
          <span className="text-caption font-medium text-white/90 bg-black/40 px-3 py-1.5 rounded-full">
            {currentIndex + 1} / {totalImagesCount || images.length}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {showDownloadButton && (
            <div
              role="button"
              tabIndex={0}
              onClick={handleDownload}
              onKeyDown={(e) => { if (e.key === "Enter") handleDownload(); }}
              className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Download size={22} style={{ color: "white" }} />
            </div>
          )}

          {/* Select button (Heart) */}
          {mode === "select" && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => onToggleStar(current.id)}
              onKeyDown={(e) => { if (e.key === "Enter") onToggleStar(current.id) }}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-transform cursor-pointer hover:scale-105 active:scale-95"
              style={{ background: current.is_selected ? "rgba(255, 59, 48, 0.25)" : "rgba(255,255,255,0.15)" }}
            >
              <Heart
                size={22}
                fill={current.is_selected ? "#ff3b30" : "none"}
                stroke={current.is_selected ? "#ff3b30" : "white"}
                style={{ transition: "fill 0.3s, stroke 0.3s" }}
              />
            </div>
          )}
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
