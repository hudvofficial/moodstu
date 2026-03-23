"use client";

import { useState } from "react";
import { Heart, ImageOff } from "lucide-react";

// ═══════════════════════════════════════════
// GalleryGrid — Admin photo grid
// Desktop 4 cột / Mobile 2 cột
// Stitch: thumbnail + file name + heart icon
// ═══════════════════════════════════════════

interface GalleryImage {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  file_name: string | null;
  is_selected: boolean;
  client_note: string | null;
  selected_at: string | null;
}

type FilterType = "all" | "selected" | "unselected" | "noted";

interface GalleryGridProps {
  images: GalleryImage[];
  filter: FilterType;
}

export default function GalleryGrid({ images, filter }: GalleryGridProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Apply filter
  const filtered = images.filter((img) => {
    if (filter === "selected") return img.is_selected;
    if (filter === "unselected") return !img.is_selected;
    if (filter === "noted") return !!img.client_note;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center">
        <ImageOff size={32} className="text-text-muted/40 mx-auto mb-2" />
        <p className="text-caption text-text-muted">
          {filter === "selected"
            ? "Chưa có ảnh nào được chọn"
            : filter === "unselected"
              ? "Tất cả ảnh đã được chọn"
              : "Chưa có ảnh nào"}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      }}
    >
      {filtered.map((img, index) => (
        <div
          key={img.id}
          className="stagger-item group relative overflow-hidden"
          style={{
            borderRadius: "var(--radius-sm)",
            animationDelay: `${Math.min(index * 20, 200)}ms`,
          }}
        >
          {/* Thumbnail */}
          <div
            className="relative w-full bg-black/5"
            style={{ aspectRatio: "1 / 1" }}
          >
            {failedImages.has(img.id) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/5">
                <ImageOff size={20} className="text-text-muted/40 mb-1" />
                <span className="text-caption text-text-muted/60">Lỗi</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.thumbnail_url || img.image_url}
                alt={img.file_name || "ảnh"}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={() =>
                  setFailedImages((prev) => new Set(prev).add(img.id))
                }
              />
            )}

            {/* Heart overlay */}
            {img.is_selected && (
              <div className="absolute top-1 right-1">
                <Heart
                  size={16}
                  className="text-red-500 drop-shadow-sm"
                  fill="currentColor"
                />
              </div>
            )}

            {/* Note indicator */}
            {img.client_note && (
              <div
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-primary)", fontSize: "8px" }}
              >
                <span className="text-white font-bold">💬</span>
              </div>
            )}
          </div>

          {/* File name */}
          <div
            className="px-1 py-1 truncate text-text-secondary"
            style={{ fontSize: "10px", lineHeight: "14px" }}
            title={img.file_name || undefined}
          >
            {img.file_name || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
