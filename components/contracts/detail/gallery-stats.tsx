"use client";

import { ImageIcon, Heart, MessageCircle } from "lucide-react";

// ═══════════════════════════════════════════
// GalleryStats — Stats bar (Tổng | Đã chọn | Ghi chú)
// Stitch: 2x2 compact stats (mobile) / inline (desktop)
// ═══════════════════════════════════════════

interface GalleryStatsProps {
  totalImages: number;
  selectedCount: number;
  noteCount: number;
}

export default function GalleryStats({
  totalImages,
  selectedCount,
  noteCount,
}: GalleryStatsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        <ImageIcon size={14} className="text-primary" />
        <span className="text-caption font-semibold text-text-primary">
          {totalImages}
        </span>
        <span className="text-caption text-text-muted">ảnh</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Heart
          size={14}
          className={selectedCount > 0 ? "text-red-500" : "text-text-muted"}
          fill={selectedCount > 0 ? "currentColor" : "none"}
        />
        <span className="text-caption font-semibold text-text-primary">
          {selectedCount}
        </span>
        <span className="text-caption text-text-muted">đã chọn</span>
      </div>

      {noteCount > 0 && (
        <div className="flex items-center gap-1.5">
          <MessageCircle size={14} className="text-primary" />
          <span className="text-caption font-semibold text-text-primary">
            {noteCount}
          </span>
          <span className="text-caption text-text-muted">ghi chú</span>
        </div>
      )}
    </div>
  );
}
