"use client";

import type { MouseEvent, TouchEvent } from "react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, X } from "lucide-react";
import type { GalleryImage } from "@/types/gallery";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ═══════════════════════════════════════════
// ImageViewer — Full-screen gallery slider (Public)
// Cloned UI from Admin Gallery Lightbox
// ═══════════════════════════════════════════

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

function withThumbSize(url: string, size: number): string {
  if (/sz=s\d+/.test(url)) return url.replace(/sz=s\d+/, `sz=s${size}`);
  if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${size}`);
  // Nếu là url lh3 mà chưa có tham số size thì tự thêm
  if (url.includes('lh3.googleusercontent.com') && !url.includes('=s')) {
    return url + `=s${size}`;
  }
  return url;
}

function getPreviewUrls(image: GalleryImage | undefined): { src: string; srcSet?: string } {
  if (!image) return { src: "" };
  // Ưu tiên dùng image_url (lh3) để tránh lỗi redirect chéo tên miền trên mobile Safari
  const base = image.image_url || image.thumbnail_url;
  if (!base) return { src: "" };

  const canResize = /sz=s\d+/.test(base) || /=s\d+/.test(base) || base.includes("lh3.googleusercontent.com");
  if (!canResize) return { src: base };

  const mobile = withThumbSize(base, 1200);
  const desktop = withThumbSize(base, 2048);
  return { src: desktop, srcSet: `${mobile} 1200w, ${desktop} 2048w` };
}

export default function ImageViewer({
  images,
  currentIndex,
  onClose,
  onIndexChange,
  onToggleStar,
  mode = "select",
  accessToken = "admin",
  totalImagesCount,
}: ImageViewerProps) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const currentIdx = currentIndex;
  const setCurrentIdx = onIndexChange;
  const img = images[currentIdx];

  const { src, srcSet } = useMemo(() => getPreviewUrls(img), [img]);

  // Decode capability from token if not admin
  let clientCapability = "select";
  if (accessToken && accessToken !== "admin") {
    try {
      const [bodyPart] = accessToken.split(".");
      const payload = JSON.parse(atob(bodyPart.replace(/-/g, "+").replace(/_/g, "/")));
      clientCapability = payload.capability || "select";
    } catch {}
  }

  const showDownloadButton = img?.drive_file_id && (accessToken === "admin" || clientCapability !== "view");

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Preload prev/next images
  useEffect(() => {
    const preload = (idx: number) => {
      const next = images[idx];
      if (!next) return null;
      const { src: nextSrc } = getPreviewUrls(next);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = nextSrc;
      document.head.appendChild(link);
      return link;
    };

    const links = [preload(currentIdx - 1), preload(currentIdx + 1)].filter(Boolean) as HTMLLinkElement[];
    return () => links.forEach((l) => l.remove());
  }, [currentIdx, images]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrentIdx(Math.max(0, currentIdx - 1));
      if (e.key === "ArrowRight") setCurrentIdx(Math.min(images.length - 1, currentIdx + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIdx, images.length, onClose, setCurrentIdx]);

  if (!img) return null;

  const downloadFileName = img.file_name || "photo.jpg";
  const apiUrl = `/api/gallery-download/${accessToken}/${img.id}`;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      const toastId = toast.loading(`Đang chuẩn bị ảnh...`);
      window.open(`${apiUrl}?mode=view`, "_blank", "noopener,noreferrer");
      toast.info('Nhấn giữ ảnh → chọn "Lưu hình ảnh"', { id: toastId, duration: 5000 });
      return;
    }

    const toastId = toast.loading(`Đang tải ${downloadFileName}...`);
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
      toast.success(`Đã tải ${downloadFileName}`, { id: toastId });
    } catch (error) {
      console.error("[handleDownload] Error:", error);
      window.open(apiUrl, "_blank", "noopener,noreferrer");
      toast.info('Nhấn giữ ảnh → chọn "Lưu hình ảnh"', { id: toastId, duration: 5000 });
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    const x = e.touches[0]?.clientX;
    if (typeof x === "number") setTouchStartX(x);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLImageElement>) => {
    if (touchStartX === null) return;
    const x = e.changedTouches[0]?.clientX;
    setTouchStartX(null);
    if (typeof x !== "number") return;

    const diff = touchStartX - x;
    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      setCurrentIdx(Math.min(images.length - 1, currentIdx + 1));
    } else {
      setCurrentIdx(Math.max(0, currentIdx - 1));
    }
  };

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.9)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar */}
      <div
        className="absolute inset-x-0 top-0 z-20 bg-linear-to-b from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="grid grid-cols-3 items-center px-4 py-3"
          style={{
            paddingTop: "calc(var(--spacing-base) + env(safe-area-inset-top))",
            paddingLeft: "calc(var(--spacing-base) + env(safe-area-inset-left))",
            paddingRight: "calc(var(--spacing-base) + env(safe-area-inset-right))",
          }}
        >
          {/* Left: Trống */}
          <div className="flex justify-start"></div>

          {/* Center: File name */}
          <div className="flex justify-center min-w-0">
            <span className="text-sm font-medium text-white/90 truncate px-3 py-1 bg-black/30 rounded-full max-w-[200px] md:max-w-[400px]">
              {img.file_name || "Photo"}
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex justify-end items-center gap-3">
            {mode === "select" && (
              <Button
                unstyled
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleStar(img.id); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-semibold transition-all"
                style={{
                  borderRadius: "var(--radius-md)",
                  background: img.is_selected ? "rgba(255, 59, 48, 0.2)" : "rgba(255,255,255,0.1)",
                  color: img.is_selected ? "#ff3b30" : "rgba(255,255,255,0.85)",
                }}
                aria-label="Chọn ảnh"
              >
                <Heart size={14} className={img.is_selected ? "fill-[#ff3b30] text-[#ff3b30]" : ""} />
                <span className="hidden sm:inline">
                  {img.is_selected ? "Đã chọn" : "Chọn ảnh"}
                </span>
              </Button>
            )}
            <Button
              unstyled
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="inline-flex items-center justify-center"
              style={{
                width: "var(--icon-container-sm)",
                height: "var(--icon-container-sm)",
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.85)",
              }}
              aria-label="Đóng"
              title="Đóng"
            >
              <X size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {currentIdx > 0 && (
        <Button
          unstyled
          type="button"
          className="absolute z-20 inline-flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setCurrentIdx(Math.max(0, currentIdx - 1)); }}
          aria-label="Ảnh trước"
          title="Ảnh trước"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            left: "calc(var(--spacing-base) + env(safe-area-inset-left))",
            width: "var(--icon-container-sm)",
            height: "var(--icon-container-sm)",
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <ChevronLeft size={22} />
        </Button>
      )}
      {currentIdx < images.length - 1 && (
        <Button
          unstyled
          type="button"
          className="absolute z-20 inline-flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setCurrentIdx(Math.min(images.length - 1, currentIdx + 1)); }}
          aria-label="Ảnh tiếp theo"
          title="Ảnh tiếp theo"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            right: "calc(var(--spacing-base) + env(safe-area-inset-right))",
            width: "var(--icon-container-sm)",
            height: "var(--icon-container-sm)",
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <ChevronRight size={22} />
        </Button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={img.id}
        src={src}
        srcSet={srcSet}
        sizes="(max-width: 768px) 100vw, 95vw"
        alt={img.file_name || "Photo"}
        className="max-h-[90vh] w-[100vw] max-w-[100vw] object-contain md:w-auto md:max-w-[95vw]"
        style={{ borderRadius: "var(--radius-lg)" }}
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />

      {/* Bottom bar */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 pt-3"
          style={{
            paddingBottom: "calc(var(--spacing-base) + env(safe-area-inset-bottom))",
            paddingLeft: "calc(var(--spacing-base) + env(safe-area-inset-left))",
            paddingRight: "calc(var(--spacing-base) + env(safe-area-inset-right))",
          }}
        >
          <div className="flex items-center">
            <span className="text-caption font-medium text-white/90 bg-black/40 px-3 py-1.5 rounded-full">
              {currentIdx + 1} / {totalImagesCount || images.length}
            </span>
          </div>
          {showDownloadButton && (
            <Button
              unstyled
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-3 py-2"
              style={{
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.90)",
              }}
              aria-label="Tải xuống"
              title="Tải xuống"
            >
              <Download size={16} />
              <span className="text-caption font-semibold">Tải xuống</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
