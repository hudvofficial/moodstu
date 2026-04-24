"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, ImageIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import { getResponsiveThumbnailUrl, type ImageGroup } from "./gallery-helpers";
import { useMasonryGrid } from "./use-masonry-grid";

interface GalleryImageGridProps {
  groups: ImageGroup[];
  onImageClick: (index: number) => void;
  reactionCounts?: ReactionCounts;
  onToggleStar?: (imageId: string, currentSelected: boolean) => void;
  watermarkEnabled?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
}

const MIN_THUMBNAIL_SIZE = 400;
const MAX_THUMBNAIL_SIZE = 1200;

function resolveThumbnailSize(columnWidth: number): number {
  if (typeof window === "undefined") return 600;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  return Math.min(
    MAX_THUMBNAIL_SIZE,
    Math.max(MIN_THUMBNAIL_SIZE, Math.ceil((columnWidth * dpr) / 100) * 100),
  );
}

export default function GalleryImageGrid({
  groups,
  onImageClick,
  reactionCounts,
  onToggleStar,
  watermarkEnabled,
  onLoadMore,
  loadingMore,
  hasMore: hasMoreServer,
}: GalleryImageGridProps) {
  const {
    masonryRef,
    sentinelRef,
    columnGroups,
    columnCount,
    columnWidth,
    visibleCount,
    showSentinel,
    aspectRatios,
    loadedGroups,
    handleImageLoad,
    handleImageError,
    DEFAULT_ASPECT_RATIO
  } = useMasonryGrid({ groups, hasMoreServer, onLoadMore });

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <ImageIcon size={48} className="mx-auto mb-3 text-text-muted/20" />
        <p className="text-body-sm text-text-muted">Chưa có ảnh nào</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-3 py-3 md:px-6 md:py-4">
        <div
          ref={masonryRef}
          className="grid items-start"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            gap: "var(--gallery-admin-masonry-gap)",
            maxWidth: "100%",
          }}
        >
          {columnGroups.map((column, columnIndex) => (
            <div
              key={`gallery-column-${columnIndex}`}
              className="flex min-w-0 flex-col"
              style={{ gap: "var(--gallery-admin-masonry-gap)" }}
            >
              {column.map(({ group, index }) => {
                const image = group.displayImage;
                const hasBoth = group.hasRaw && group.hasJpg;
                const imageAspectRatio = aspectRatios[group.fileGroup] || DEFAULT_ASPECT_RATIO;
                const imageLoaded = loadedGroups[group.fileGroup] === true;
                const imageSrc = getResponsiveThumbnailUrl(
                  image.thumbnail_url,
                  image.image_url,
                  resolveThumbnailSize(columnWidth),
                );
                const eagerLoad = index < Math.max(columnCount * 2, 6);
                const overlayChipStyle = {
                  backgroundColor: "var(--gallery-admin-overlay-chip)",
                  color: "var(--color-text-primary)",
                  boxShadow: "0 6px 18px rgba(32, 24, 18, 0.08)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                };
                const showFileBadge = hasBoth || group.hasRaw;
                const fileBadgeLabel = hasBoth ? "RAW+JPG" : "RAW";
                const showHeartCount = (reactionCounts?.[image.id]?.hearts || 0) > 0;

                return (
                  <div
                    key={group.fileGroup}
                    role="button"
                    tabIndex={0}
                    onClick={() => onImageClick(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") onImageClick(index);
                    }}
                    title={image.created_at ? new Date(image.created_at).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : undefined}
                    className="group relative min-w-0 overflow-hidden bg-bg-card text-left shadow-xs ring-1 ring-border/25 transition-[transform,box-shadow,ring-color] duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:ring-border/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    style={{ borderRadius: "var(--gallery-admin-tile-radius)" }}
                  >
                    <div
                      className="relative w-full overflow-hidden bg-bg-card"
                      style={{ aspectRatio: String(imageAspectRatio) }}
                    >
                      <div
                        className={`absolute inset-0 transition-opacity duration-300 ${imageLoaded ? "opacity-0" : "opacity-100"}`}
                        style={{
                          background: "linear-gradient(180deg, var(--gallery-admin-skeleton-highlight) 0%, var(--gallery-admin-skeleton-base) 100%)",
                        }}
                      />

                      {/* eslint-disable-next-line @next/next/no-img-element -- Drive thumbnail URL is computed per tile width */}
                      <img
                        src={imageSrc}
                        alt={image.file_name || "Photo"}
                        className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.025] ${imageLoaded ? "opacity-100" : "opacity-0"}`}
                        loading={eagerLoad ? "eager" : "lazy"}
                        fetchPriority={eagerLoad ? "high" : "auto"}
                        decoding="async"
                        onLoad={(event) => handleImageLoad(group.fileGroup, event)}
                        onError={(event) => handleImageError(image.image_url, event)}
                      />

                      {watermarkEnabled && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                          <span
                            className="select-none rotate-[-30deg] drop-shadow-sm"
                            style={{
                              color: "var(--gallery-admin-watermark)",
                              fontSize: "28px",
                              letterSpacing: "6px",
                              fontWeight: 800,
                            }}
                          >
                            PROOF
                          </span>
                        </div>
                      )}

                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          background: "linear-gradient(180deg, transparent 0%, transparent 48%, var(--gallery-admin-overlay-gradient-mid) 76%, var(--gallery-admin-overlay-gradient-start) 100%)",
                        }}
                      />

                      {onToggleStar ? (
                        <Button
                          unstyled
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleStar(image.id, !!image.is_selected);
                          }}
                          className={`absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${image.is_selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          style={overlayChipStyle}
                          title={image.is_selected ? "Bỏ đề xuất" : "Đề xuất cho khách"}
                        >
                          <Star size={16} className={image.is_selected ? "fill-success text-success" : "text-text-muted"} />
                        </Button>
                      ) : image.is_selected ? (
                        <div
                          className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full"
                          style={overlayChipStyle}
                        >
                          <Star size={16} className="fill-success text-success" />
                        </div>
                      ) : null}

                      {(showFileBadge || showHeartCount) && (
                        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                          {showHeartCount && (
                            <div
                              className="flex items-center gap-1 rounded-full px-2 py-1 text-tiny font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                              style={overlayChipStyle}
                              title={`${reactionCounts?.[image.id]?.hearts || 0} lượt thích từ khách`}
                            >
                              <Heart size={11} className="fill-error text-error" />
                              <span>{reactionCounts?.[image.id]?.hearts || 0}</span>
                            </div>
                          )}
                          {showFileBadge && (
                            <span className="rounded-full px-2 py-1 text-tiny font-semibold tracking-[0.04em]" style={overlayChipStyle}>
                              {fileBadgeLabel}
                            </span>
                          )}
                        </div>
                      )}

                      <div
                        className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{
                          background: "linear-gradient(180deg, transparent 0%, var(--gallery-admin-overlay-gradient-mid) 40%, var(--gallery-admin-overlay-gradient-start) 100%)",
                        }}
                      >
                        <p className="truncate text-micro font-medium text-text-inverse">{image.file_name}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {showSentinel && (
        <div ref={sentinelRef} className="py-6 text-center">
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-caption text-text-muted">Đang tải thêm ảnh...</p>
            </div>
          ) : (
            <p className="text-caption text-text-muted">
              Đang tải thêm... ({visibleCount}/{groups.length})
            </p>
          )}
        </div>
      )}
    </>
  );
}
