"use client";

import type { MouseEvent, TouchEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, Star, X, Image as ImageIcon, Loader2 } from "lucide-react";
import type { GalleryImage } from "@/types/gallery";
import { downloadSingleFile } from "@/components/gallery/download-manager";
import { Button } from "@/components/ui/button";
import { setGalleryCoverImage } from "@/app/actions/gallery-admin-actions";
import { toast } from "sonner";

// ═══════════════════════════════════════════
// GalleryLightbox — Fullscreen image viewer
// ═══════════════════════════════════════════

interface GalleryLightboxProps {
  images: GalleryImage[];
  initialIdx: number;
  onClose: () => void;
  galleryId?: string | null;
  coverImageId?: string | null;
  onSetCoverSuccess?: (imageId: string) => void;
}

function withThumbSize(url: string, size: number): string {
  if (/sz=s\d+/.test(url)) return url.replace(/sz=s\d+/, `sz=s${size}`);
  if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${size}`);
  return url;
}

function getPreviewUrls(image: GalleryImage | undefined): { src: string; srcSet?: string } {
  if (!image) return { src: "" };
  if (!image.thumbnail_url) return { src: image.image_url };

  const base = image.thumbnail_url;
  const canResize = /sz=s\d+/.test(base) || /=s\d+/.test(base);
  if (!canResize) return { src: base };

  const mobile = withThumbSize(base, 1200);
  const desktop = withThumbSize(base, 2048);
  return { src: desktop, srcSet: `${mobile} 1200w, ${desktop} 2048w` };
}

async function downloadUrl(url: string, fileName: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    return false;
  }
}

export default function GalleryLightbox({ images, initialIdx, onClose, galleryId, coverImageId, onSetCoverSuccess }: GalleryLightboxProps) {
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isSettingCover, setIsSettingCover] = useState(false);

  useEffect(() => {
    setCurrentIdx(initialIdx);
  }, [initialIdx]);

  // Clamp index if the images list changes while lightbox is open
  useEffect(() => {
    setCurrentIdx((idx) => Math.min(Math.max(idx, 0), Math.max(images.length - 1, 0)));
  }, [images.length]);

  const img = images[currentIdx];

  const { src, srcSet } = useMemo(() => getPreviewUrls(img), [img]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Preload prev/next images for smoother navigation (avoid loading full-size originals)
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

  // Keyboard shortcuts (desktop): Esc close, ←/→ navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrentIdx((idx) => Math.max(0, idx - 1));
      if (e.key === "ArrowRight") setCurrentIdx((idx) => Math.min(images.length - 1, idx + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, onClose]);

  if (!img) return null;

  const downloadFileName = img.file_name || "photo";
  const handleDownload = async (e: MouseEvent) => {
    e.stopPropagation();

    if (img.drive_file_id) {
      const ok = await downloadSingleFile("admin", img.id, downloadFileName);
      if (!ok) window.open(`/api/gallery-download/admin/${img.id}`, "_blank", "noopener,noreferrer");
      return;
    }

    const ok = await downloadUrl(img.image_url, downloadFileName);
    if (!ok) window.open(img.image_url, "_blank", "noopener,noreferrer");
  };

  const handleTouchStart = (e: TouchEvent<HTMLImageElement>) => {
    const x = e.touches[0]?.clientX;
    if (typeof x === "number") setTouchStartX(x);
  };

  const handleTouchEnd = (e: TouchEvent<HTMLImageElement>) => {
    if (touchStartX === null) return;
    const x = e.changedTouches[0]?.clientX;
    setTouchStartX(null);
    if (typeof x !== "number") return;

    const diff = touchStartX - x;
    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      setCurrentIdx((idx) => Math.min(images.length - 1, idx + 1));
    } else {
      setCurrentIdx((idx) => Math.max(0, idx - 1));
    }
  };

  const isCover = img.id === coverImageId;

  const handleSetCover = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!galleryId || isCover) return;
    setIsSettingCover(true);
    try {
      const res = await setGalleryCoverImage(galleryId, img.id);
      if (res.success) {
        toast.success("Đã đặt làm ảnh bìa");
        onSetCoverSuccess?.(img.id);
      } else {
        toast.error(res.error || "Không thể đặt ảnh bìa");
      }
    } catch {
      toast.error("Lỗi khi đặt ảnh bìa");
    } finally {
      setIsSettingCover(false);
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
            {img.is_starred && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 bg-white/10 text-white/90 text-caption font-semibold"
                style={{ borderRadius: "var(--radius-md)" }}
                title="Ảnh đề xuất"
              >
                <Star size={14} className="fill-warning text-warning" />
                Đề xuất
              </span>
            )}
            {img.is_selected && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 bg-white/10 text-white/90 text-caption font-semibold"
                style={{ borderRadius: "var(--radius-md)" }}
                title="Khách chọn"
              >
                <Heart size={14} className="fill-error text-error" />
                Khách chọn
              </span>
            )}
            {galleryId && (
              <Button
                unstyled
                type="button"
                onClick={handleSetCover}
                disabled={isSettingCover || isCover}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-semibold transition-all"
                style={{
                  borderRadius: "var(--radius-md)",
                  background: isCover ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                  color: isCover ? "white" : "rgba(255,255,255,0.85)",
                  cursor: isCover ? "default" : "pointer",
                }}
                aria-label="Đặt ảnh bìa"
              >
                {isSettingCover ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} className={isCover ? "text-white" : ""} />
                )}
                {isCover ? "Ảnh bìa hiện tại" : "Đặt làm ảnh bìa"}
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
          onClick={(e) => { e.stopPropagation(); setCurrentIdx((idx) => Math.max(0, idx - 1)); }}
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
          onClick={(e) => { e.stopPropagation(); setCurrentIdx((idx) => Math.min(images.length - 1, idx + 1)); }}
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
              {currentIdx + 1} / {images.length}
            </span>
          </div>
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
        </div>
      </div>
    </div>
  );
}
