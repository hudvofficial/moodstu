/* eslint-disable @next/next/no-img-element */
"use client";

import { Heart, ImageOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import { getResponsiveThumbnailUrl, type ImageGroup } from "./gallery-helpers";
import { useMasonryPinterest } from "./use-masonry-pinterest";

interface GalleryImageGridPinterestProps {
  groups: ImageGroup[];
  onImageClick: (index: number) => void;
  reactionCounts?: ReactionCounts;
  onToggleStar?: (imageId: string, currentSelected: boolean) => void;
  watermarkEnabled?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  publicMode?: boolean;
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

export default function GalleryImageGridPinterest({
  groups,
  onImageClick,
  reactionCounts,
  onToggleStar,
  watermarkEnabled,
  onLoadMore,
  loadingMore,
  hasMore: hasMoreServer,
  publicMode,
}: GalleryImageGridPinterestProps) {
  const {
    containerRef,
    sentinelRef,
    visibleItems,
    totalHeight,
    visibleCount,
    showSentinel,
    stats
  } = useMasonryPinterest({
    groups,
    hasMoreServer,
    onLoadMore,
    maxColumns: publicMode ? 5 : undefined
  });

  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set(prev).add(imageId));
  }, []);

  const handleImageError = useCallback((imageId: string) => {
    setErrorImages(prev => new Set(prev).add(imageId));
  }, []);

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <ImageOff size={48} className="mx-auto mb-3 text-text-muted/20" />
        <p className="text-body-sm text-text-muted">Chưa có ảnh nào</p>
      </div>
    );
  }

  return (
    <>
      {/* Container with relative positioning and padding */}
      <div
        ref={containerRef}
        className="px-3 py-3 md:px-6 md:py-4"
        style={{
          position: "relative",
          height: `${totalHeight}px`,
          width: "100%",
          boxSizing: "border-box"
        }}
      >
          {/* Render visible items with absolute positioning */}
          {visibleItems.map((item, index) => {
            const { position, group } = item;
            const image = group.displayImage;
            const imageId = image.id;
            const isLoaded = loadedImages.has(imageId);
            const isError = errorImages.has(imageId);
            const hasBoth = group.hasRaw && group.hasJpg;
            const imageSrc = getResponsiveThumbnailUrl(
              image.thumbnail_url,
              image.image_url,
              resolveThumbnailSize(position.width),
            );

            const overlayChipStyle = {
              backgroundColor: "var(--gallery-admin-overlay-chip)",
              color: "var(--color-text-primary)",
              boxShadow: "0 6px 18px rgba(32, 24, 18, 0.08)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            };
            const showFileBadge = hasBoth || group.hasRaw;
            const fileBadgeLabel = hasBoth ? "RAW+JPG" : "RAW";
            const isAdmin = !publicMode;

            return (
              <div
                key={group.fileGroup}
                role="button"
                tabIndex={0}
                onClick={() => onImageClick(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onImageClick(index);
                }}
                className="group absolute overflow-hidden bg-bg-card text-left shadow-xs ring-1 ring-border/25 transition-[transform,box-shadow,ring-color] duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:ring-border/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: `${position.width}px`,
                  height: `${position.height}px`,
                  borderRadius: "var(--gallery-admin-tile-radius)",
                  transform: "translateZ(0)", // GPU acceleration
                  willChange: "transform"
                }}
              >
                {/* Skeleton loader */}
                {!isLoaded && !isError && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(180deg, var(--gallery-admin-skeleton-highlight) 0%, var(--gallery-admin-skeleton-base) 100%)",
                    }}
                  />
                )}

                {/* Image */}
                {!isError && (
                  <img
                    src={imageSrc}
                    alt={image.file_name || "Photo"}
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
                    style={{ opacity: isLoaded ? 1 : 0 }}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => handleImageLoad(imageId)}
                    onError={() => handleImageError(imageId)}
                  />
                )}

                {/* Error state */}
                {isError && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-hover text-text-muted">
                    <ImageOff size={24} className="mb-2 opacity-40" />
                    <span className="max-w-full truncate px-3 text-micro font-medium">{image.file_name}</span>
                    <span className="text-micro opacity-60">Lỗi nguồn Drive</span>
                  </div>
                )}

                {/* Watermark */}
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

                {/* Hover overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(180deg, transparent 0%, transparent 48%, var(--gallery-admin-overlay-gradient-mid) 76%, var(--gallery-admin-overlay-gradient-start) 100%)",
                  }}
                />

                {/* Star/Heart button */}
                {onToggleStar && (
                  <Button
                    unstyled
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleStar(image.id, isAdmin ? !!image.is_starred : !!image.is_selected);
                    }}
                    className={`absolute ${publicMode ? 'right-2 bottom-2' : 'left-2 top-2'} z-20 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${(isAdmin ? image.is_starred : image.is_selected) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    style={publicMode ? {} : overlayChipStyle}
                  >
                    {publicMode ? (
                      <Heart
                        size={20}
                        fill={image.is_selected ? "#ff3b30" : "none"}
                        stroke={image.is_selected ? "#ff3b30" : "white"}
                        strokeWidth={2}
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                      />
                    ) : (
                      <Star size={16} className={image.is_starred ? "fill-warning text-warning" : "text-text-muted"} />
                    )}
                  </Button>
                )}

                {/* Admin badges */}
                {!publicMode && (showFileBadge || image.is_selected) && (
                  <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                    {image.is_selected && (
                      <span className="flex h-5 items-center justify-center rounded-full px-2" style={overlayChipStyle}>
                        <Heart size={12} className="fill-error text-error" />
                      </span>
                    )}
                    {showFileBadge && (
                      <span className="rounded-full px-2 py-1 text-tiny font-semibold tracking-[0.04em]" style={overlayChipStyle}>
                        {fileBadgeLabel}
                      </span>
                    )}
                  </div>
                )}

                {/* File name on hover */}
                <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="truncate text-micro font-medium text-text-inverse">{image.file_name}</p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Sentinel for infinite scroll */}
      {showSentinel && (
        <div ref={sentinelRef} className="py-6 text-center">
          {loadingMore ? (
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-caption text-text-muted">Đang tải thêm ảnh...</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-caption text-text-muted">
                Đang tải thêm... ({visibleCount}/{groups.length})
              </p>
              {stats.removed > 0 && (
                <p className="text-tiny text-text-muted/60">
                  🚀 Virtual: {stats.rendered}/{stats.total} rendered ({stats.efficiency}% optimized)
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
