"use client";

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
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    style={{
                      fontSize: "28px",
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.35)",
                      transform: "rotate(-30deg)",
                      letterSpacing: "6px",
                      textTransform: "uppercase",
                      userSelect: "none",
                      textShadow: "0 1px 4px rgba(0,0,0,0.2)",
                    }}
                  >
                    PROOF
                  </span>
                </div>
              )}

              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }}
              />

              {/* Drag handle */}
              {draggable && (
                <div
                  className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    borderRadius: "var(--radius-sm, 6px)",
                    padding: "3px",
                    zIndex: 10,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical size={14} color="#fff" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-1.5 right-1.5 flex gap-1">
                {hasBoth && (
                  <span className="text-caption font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "10px" }}>
                    RAW+JPG
                  </span>
                )}
                {!hasBoth && group.hasRaw && (
                  <span className="text-caption font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: "10px" }}>
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
                    fill={img.is_selected ? "#4CAF50" : "none"}
                    color={img.is_selected ? "#4CAF50" : "rgba(255,255,255,0.7)"}
                  />
                </button>
              ) : img.is_selected ? (
                <div className="absolute top-1.5" style={{ left: draggable ? "32px" : "6px", zIndex: 6 }}>
                  <Star size={16} fill="#4CAF50" color="#4CAF50" />
                </div>
              ) : null}

              {/* ❤️ Khách đã tim — góc phải trên, read-only */}
              {(reactionCounts?.[img.id]?.hearts || 0) > 0 && (
                <div
                  className="absolute top-1.5 flex items-center gap-0.5"
                  style={{
                    right: hasBoth ? "72px" : group.hasRaw ? "42px" : "6px",
                    background: "rgba(0,0,0,0.55)",
                    borderRadius: "var(--radius-sm, 6px)",
                    padding: "2px 5px",
                    color: "#fff",
                    fontSize: "10px",
                    fontWeight: 500,
                    zIndex: 6,
                  }}
                  title={`${reactionCounts![img.id].hearts} lượt thích từ khách`}
                >
                  <Heart size={11} fill="#F44336" color="#F44336" />
                  <span>{reactionCounts![img.id].hearts}</span>
                </div>
              )}

              {/* Image number badge */}
              <div
                className="absolute bottom-1.5 right-1.5 flex items-center justify-center"
                style={{
                  width: 22, height: 22,
                  borderRadius: "var(--radius-sm, 6px)",
                  background: "rgba(0,0,0,0.5)",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {idx + 1}
              </div>

              <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white truncate" style={{ fontSize: "11px" }}>{img.file_name}</p>
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
