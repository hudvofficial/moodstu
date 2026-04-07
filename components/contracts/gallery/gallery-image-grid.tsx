"use client";
/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import { Heart, Star, ImageIcon, GripVertical } from "lucide-react";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import type { ImageGroup } from "./gallery-helpers";

// ═══════════════════════════════════════════
// GalleryImageGrid — Responsive grid with RAW/JPG badges
// Features: lazy loading, progressive render, watermark, drag reorder
// ═══════════════════════════════════════════

interface GalleryImageGridProps {
  groups: ImageGroup[];
  onImageClick: (index: number) => void;
  reactionCounts?: ReactionCounts;
  onToggleStar?: (imageId: string, currentSelected: boolean) => void;
  watermarkEnabled?: boolean;
  draggable?: boolean;
  onReorder?: (fromIdx: number, toIdx: number) => void;
  // Server-side pagination (lazy-load)
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
}

const BATCH_SIZE = 50;

export default function GalleryImageGrid({
  groups, onImageClick, reactionCounts, onToggleStar,
  watermarkEnabled, draggable, onReorder,
  onLoadMore, loadingMore, hasMore: hasMoreServer,
}: GalleryImageGridProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const groupsLen = groups.length;
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Reset khi groups thay đổi
  useEffect(() => { setVisibleCount(BATCH_SIZE); }, [groupsLen]);

  // IntersectionObserver cho infinite scroll (client batch + server pagination)
  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting) {
      setVisibleCount((prev) => {
        const next = Math.min(prev + BATCH_SIZE, groups.length);
        // If client batches exhausted and server has more → trigger load
        if (next >= groups.length && hasMoreServer && onLoadMore) {
          onLoadMore();
        }
        return next;
      });
    }
  }, [groups.length, hasMoreServer, onLoadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleIntersect, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleIntersect]);

  // Drag handlers
  const handleDragStart = (idx: number, e: React.DragEvent) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleDragOver = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };
  const handleDrop = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (!isNaN(fromIdx) && fromIdx !== idx && onReorder) {
      onReorder(fromIdx, idx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <ImageIcon size={48} className="text-text-muted/20 mx-auto mb-3" />
        <p className="text-body-sm text-text-muted">Chưa có ảnh nào</p>
      </div>
    );
  }

  const visibleGroups = groups.slice(0, visibleCount);
  const hasMoreLocal = visibleCount < groups.length;
  const showSentinel = hasMoreLocal || hasMoreServer;

  return (
    <>
      <div
        className="p-3 lg:p-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "8px",
        }}
      >
        {visibleGroups.map((group, idx) => {
          const img = group.displayImage;
          const hasBoth = group.hasRaw && group.hasJpg;
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx && dragIdx !== idx;

          return (
            <div
              key={group.fileGroup}
              className="group relative cursor-pointer overflow-hidden"
              style={{
                borderRadius: "var(--radius-md)",
                aspectRatio: "1",
                opacity: isDragging ? 0.4 : 1,
                outline: isDragOver ? "2px solid var(--color-primary)" : "none",
                outlineOffset: -2,
                transition: "opacity 0.15s, outline 0.15s",
              }}
              onClick={() => onImageClick(idx)}
              title={img.created_at ? new Date(img.created_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : undefined}
              draggable={draggable}
              onDragStart={draggable ? (e) => handleDragStart(idx, e) : undefined}
              onDragOver={draggable ? (e) => handleDragOver(idx, e) : undefined}
              onDrop={draggable ? (e) => handleDrop(idx, e) : undefined}
              onDragEnd={draggable ? handleDragEnd : undefined}
            >
              <img
                src={img.thumbnail_url || img.image_url}
                alt={img.file_name || "Photo"}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
              />

              {/* Watermark overlay */}
              {watermarkEnabled && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                  style={{ zIndex: 5 }}
                >
                  <span
                    className="text-white/35 font-extrabold rotate-[-30deg] uppercase select-none drop-shadow-sm"
                    style={{
                      fontSize: "28px",
                      letterSpacing: "6px",
                    }}
                  >
                    PROOF
                  </span>
                </div>
              )}

              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-linear-to-t from-black/50 from-0% to-transparent to-50%"
              />

              {/* Drag handle */}
              {draggable && (
                <div
                  className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-black/50 p-[3px] rounded-sm z-10"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} className="text-white" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                {hasBoth && (
                  <span className="px-1.5 py-0.5 rounded bg-black/60 text-white font-medium text-tiny">
                    RAW+JPG
                  </span>
                )}
                {!hasBoth && group.hasRaw && (
                  <span className="px-1.5 py-0.5 rounded bg-black/60 text-white font-medium text-tiny">
                    RAW
                  </span>
                )}
              </div>

              {/* ⭐ Admin đề xuất — góc trái trên */}
              {onToggleStar ? (
                <button
                  className={`absolute top-1.5 transition-opacity ${img.is_selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  style={{
                    left: draggable ? "32px" : "6px",
                    background: "none", border: "none", cursor: "pointer", padding: "2px",
                    zIndex: 6,
                  }}
                  onClick={(e) => { e.stopPropagation(); onToggleStar(img.id, !!img.is_selected); }}
                  title={img.is_selected ? "Bỏ đề xuất" : "Đề xuất cho khách"}
                >
                  <Star size={16}
                    className={img.is_selected ? "text-success fill-success" : "text-white/70 fill-none"}
                  />
                </button>
              ) : img.is_selected ? (
                <div className="absolute top-1.5" style={{ left: draggable ? "32px" : "6px", zIndex: 6 }}>
                  <Star size={16} className="text-success fill-success" />
                </div>
              ) : null}

              {/* ❤️ Khách đã tim — góc phải trên, read-only */}
              {(reactionCounts?.[img.id]?.hearts || 0) > 0 && (
                <div
                  className="absolute top-1.5 flex items-center gap-0.5 bg-black/60 rounded-sm px-1.5 py-0.5 text-white text-tiny font-medium z-10"
                  style={{ right: hasBoth ? "72px" : group.hasRaw ? "42px" : "6px" }}
                  title={`${reactionCounts![img.id].hearts} lượt thích từ khách`}
                >
                  <Heart size={11} className="text-error fill-error" />
                  <span>{reactionCounts![img.id].hearts}</span>
                </div>
              )}

              {/* Image number badge */}
              <div className="absolute bottom-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-sm bg-black/50 text-white text-tiny font-semibold leading-none">
                {idx + 1}
              </div>

              <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white truncate text-micro">{img.file_name}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite scroll sentinel */}
      {showSentinel && (
        <div ref={sentinelRef} className="py-6 text-center">
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-caption text-text-muted">Đang tải thêm ảnh...</p>
            </div>
          ) : (
            <p className="text-caption text-text-muted">Đang tải thêm... ({visibleCount}/{groups.length})</p>
          )}
        </div>
      )}
    </>
  );
}
