"use client";

import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Heart, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GalleryImage } from "@/types/gallery";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";

interface GalleryVirtualGridProps {
  images: GalleryImage[];
  columns: number;
  onImageClick: (index: number) => void;
  onToggleStar?: (imageId: string, currentSelected: boolean) => void;
  reactionCounts?: ReactionCounts;
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

function getResponsiveThumbnailUrl(
  thumbnailUrl: string,
  originalUrl: string,
  size: number,
): string {
  if (!thumbnailUrl || !thumbnailUrl.includes("googleusercontent.com")) {
    return originalUrl;
  }
  return thumbnailUrl.replace(/=s\d+/, `=s${size}`);
}

export default function GalleryVirtualGrid({
  images,
  columns,
  onImageClick,
  onToggleStar,
  reactionCounts,
  publicMode = false,
}: GalleryVirtualGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group images into rows
  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < images.length; i += columns) {
      result.push(images.slice(i, i + columns));
    }
    return result;
  }, [images, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated row height (will auto-adjust)
    overscan: 2, // Render 2 extra rows above/below viewport
    measureElement: (el) => el?.getBoundingClientRect().height,
  });

  const columnWidth = parentRef.current
    ? (parentRef.current.clientWidth - (columns - 1) * 16) / columns // 16px = gap-4
    : 300;

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto px-4"
      style={{ height: "calc(100vh - 200px)", minHeight: "400px" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const rowImages = rows[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-4 pb-4"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {rowImages.map((image, colIndex) => {
                  const absoluteIndex = virtualRow.index * columns + colIndex;
                  const imageSrc = getResponsiveThumbnailUrl(
                    image.thumbnail_url || image.image_url,
                    image.image_url,
                    resolveThumbnailSize(columnWidth),
                  );

                  return (
                    <div
                      key={image.id}
                      className="group relative overflow-hidden bg-bg-card rounded-lg shadow-xs ring-1 ring-border/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:ring-border/45"
                    >
                      <button
                        onClick={() => onImageClick(absoluteIndex)}
                        className="relative w-full aspect-square overflow-hidden"
                      >
                        <img
                          src={imageSrc}
                          alt={image.file_name || "Photo"}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />

                        {/* Hover overlay */}
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />

                        {/* File name on hover */}
                        <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <p className="truncate text-xs font-medium text-white drop-shadow-lg">
                            {image.file_name}
                          </p>
                        </div>
                      </button>

                      {/* Selection heart button */}
                      {onToggleStar && (
                        <Button
                          unstyled
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleStar(image.id, image.is_selected || false);
                          }}
                          className={`absolute right-2 bottom-2 z-20 flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                            image.is_selected
                              ? "opacity-100 scale-100"
                              : "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                          }`}
                        >
                          <Heart
                            size={24}
                            fill={image.is_selected ? "#ff3b30" : "none"}
                            stroke={image.is_selected ? "#ff3b30" : "white"}
                            strokeWidth={2}
                            style={{
                              transition: "fill 0.3s, stroke 0.3s",
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                            }}
                          />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
