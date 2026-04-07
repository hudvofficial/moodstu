"use client";

import { Heart, Star, ImageIcon } from "lucide-react";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import type { ImageGroup } from "./gallery-helpers";

// ═══════════════════════════════════════════
// GalleryImageList — List view of gallery images
// ═══════════════════════════════════════════

interface GalleryImageListProps {
  groups: ImageGroup[];
  onImageClick: (index: number) => void;
  reactionCounts?: ReactionCounts;
  onToggleStar?: (imageId: string, currentSelected: boolean) => void;
  watermarkEnabled?: boolean;
}

export default function GalleryImageList({ groups, onImageClick, reactionCounts, onToggleStar, watermarkEnabled }: GalleryImageListProps) {
  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <ImageIcon size={48} className="text-text-muted/20 mx-auto mb-3" />
        <p className="text-body-sm text-text-muted">Chưa có ảnh nào</p>
      </div>
    );
  }

  return (
    <div className="p-3 lg:p-4">
      {/* Header row */}
      <div
        className="hidden lg:grid items-center gap-3 px-3 py-2 mb-1"
        style={{
          gridTemplateColumns: "80px 1fr 80px 100px 60px",
          fontSize: "var(--font-size-caption)",
          color: "var(--color-text-muted)",
          fontWeight: 600,
        }}
      >
        <span>Ảnh</span>
        <span>Tên file</span>
        <span>Loại</span>
        <span>Ngày tạo</span>
        <span>⭐</span>
        <span className="text-center">❤️</span>
      </div>

      {/* Image rows */}
      {groups.map((group, idx) => {
        const img = group.displayImage;
        const hearts = reactionCounts?.[img.id]?.hearts || 0;
        const fileType = group.hasRaw && group.hasJpg ? "RAW+JPG" : group.hasRaw ? "RAW" : "JPG";
        const dateStr = img.created_at
          ? new Date(img.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
          : "—";

        return (
          <div
            key={group.fileGroup}
            className="grid items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-(--color-bg-hover)"
            style={{
              gridTemplateColumns: "80px 1fr 80px 100px 40px 60px",
              borderBottom: "1px solid var(--color-border-light)",
            }}
            onClick={() => onImageClick(idx)}
          >
            {/* Thumbnail */}
            <div
              className="relative overflow-hidden"
              style={{ width: 80, height: 56, borderRadius: "var(--radius-sm, 6px)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.thumbnail_url || img.image_url}
                alt={img.file_name || "Photo"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {img.is_selected && (
                <div className="absolute top-1 left-1">
                  <Star size={12} className="text-success fill-success" />
                </div>
              )}
              {/* Watermark overlay */}
              {watermarkEnabled && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <span className="text-white/40 font-extrabold rotate-[-30deg] select-none" style={{ fontSize: "14px", letterSpacing: "3px" }}>PROOF</span>
                </div>
              )}
              {/* Number badge */}
              <div
                className="absolute bottom-0.5 right-0.5 flex items-center justify-center bg-black/50 text-white font-semibold rounded"
                style={{
                  width: 18, height: 18,
                  fontSize: "9px",
                }}
              >
                {idx + 1}
              </div>
            </div>

            {/* File name */}
            <p className="truncate" style={{ fontSize: "var(--font-size-body-sm)", color: "var(--color-text-primary)" }}>
              {img.file_name || `Photo ${idx + 1}`}
            </p>

            {/* File type */}
            <span
              className={`px-1.5 py-0.5 rounded text-center font-semibold ${group.hasRaw ? "bg-primary/10 text-primary" : "bg-black/5 text-text-muted"}`}
              style={{ fontSize: "10px" }}
            >
              {fileType}
            </span>

            {/* Date */}
            <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-muted)" }}>
              {dateStr}
            </span>

            {/* Star toggle (Admin) */}
            <div className="flex items-center justify-center">
              {onToggleStar && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onToggleStar(img.id, !!img.is_selected); }}
                  onKeyDown={(e) => { if (e.key === "Enter") onToggleStar(img.id, !!img.is_selected); }}
                  className="flex items-center transition-colors cursor-pointer"
                  style={{ background: "none", border: "none", padding: 0 }}
                  title={img.is_selected ? "Bỏ đề xuất" : "Đề xuất"}
                >
                  <Star
                    size={14}
                    className={img.is_selected ? "text-success fill-success" : "text-text-muted fill-none"}
                  />
                </div>
              )}
            </div>

            {/* Heart count (read-only) */}
            <div className="flex items-center justify-center gap-1">
              {hearts > 0 && (
                <div className="flex items-center gap-0.5">
                  <Heart size={13} className="text-error fill-error" />
                  <span className="font-semibold text-error text-micro">{hearts}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
