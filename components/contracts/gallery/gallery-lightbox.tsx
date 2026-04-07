"use client";

import type { GalleryImage } from "@/types/gallery";
import DownloadManager from "@/components/gallery/download-manager";

// ═══════════════════════════════════════════
// GalleryLightbox — Fullscreen image viewer
// ═══════════════════════════════════════════

interface GalleryLightboxProps {
  images: GalleryImage[];
  currentIdx: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function GalleryLightbox({ images, currentIdx, onClose, onPrev, onNext }: GalleryLightboxProps) {
  const img = images[currentIdx];
  if (!img) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
      >✕</button>
      {currentIdx > 0 && (
        <button className="absolute left-4 text-white/70 hover:text-white text-2xl" onClick={(e) => { e.stopPropagation(); onPrev(); }}>‹</button>
      )}
      {currentIdx < images.length - 1 && (
        <button className="absolute right-4 text-white/70 hover:text-white text-2xl" onClick={(e) => { e.stopPropagation(); onNext(); }}>›</button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.image_url}
        alt={img.file_name || "Photo"}
        className="max-h-[90vh] max-w-[95vw] object-contain"
      />
      <div className="absolute bottom-4 flex items-center gap-3 text-white/70 text-caption">
        <span>{img.file_name} · {currentIdx + 1}/{images.length}</span>
        {img.drive_file_id && (
          <DownloadManager files={[{ driveFileId: img.drive_file_id!, fileName: img.file_name || "photo" }]} variant="icon" />
        )}
      </div>
    </div>
  );
}
