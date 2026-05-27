"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import type { GalleryImage } from "@/types/gallery";

interface GalleryImageTileProps {
  imageSrc: string;
  image: GalleryImage;
  imageLoaded: boolean;
  isError: boolean;
  eagerLoad: boolean;
  imageAspectRatio: number;
  columnWidth: number;
  fileGroup: string;
  onImageLoad: (fileGroup: string, event: any) => void;
  onImageError: (imageUrl: string, event: any, fileGroup: string) => void;
  children?: React.ReactNode;
}

/**
 * Gallery Image Tile with SSR-safe BlurHash placeholder
 * No hooks, no canvas - just CSS background-image with pre-computed data URL
 */
export function GalleryImageTile({
  imageSrc,
  image,
  imageLoaded,
  isError,
  eagerLoad,
  imageAspectRatio,
  columnWidth,
  fileGroup,
  onImageLoad,
  onImageError,
  children,
}: GalleryImageTileProps) {
  return (
    <div
      className="relative w-full overflow-hidden bg-bg-card"
      style={{
        aspectRatio: String(imageAspectRatio),
        contentVisibility: "auto",
        containIntrinsicSize: `auto ${Math.round(columnWidth / imageAspectRatio)}px`,
      }}
    >
      {/* BlurHash placeholder or gradient skeleton */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${imageLoaded ? "opacity-0" : "opacity-100"}`}
        style={
          image.blur_data_url
            ? {
                backgroundImage: `url(${image.blur_data_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background:
                  "linear-gradient(180deg, var(--gallery-admin-skeleton-highlight) 0%, var(--gallery-admin-skeleton-base) 100%)",
              }
        }
      />

      {/* Actual image - Next.js Image with WebP/AVIF auto-conversion */}
      <Image
        src={imageSrc}
        alt={image.file_name || "Photo"}
        fill
        sizes={`${Math.round(columnWidth)}px`}
        className={`object-cover transition-all duration-500 group-hover:scale-[1.025] ${imageLoaded ? "opacity-100" : "opacity-0"}`}
        priority={eagerLoad}
        placeholder={image.blur_data_url ? "blur" : "empty"}
        blurDataURL={image.blur_data_url || undefined}
        quality={85}
        onLoad={(event) => {
          const img = event.currentTarget as HTMLImageElement;
          if (img.complete && img.naturalWidth > 0) {
            onImageLoad(fileGroup, event);
          }
        }}
        onError={(event) => onImageError(image.image_url, event, fileGroup)}
      />

      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-bg-hover text-text-muted">
          <ImageOff size={24} className="mb-2 opacity-40" />
          <span className="max-w-full truncate px-3 text-micro font-medium">
            {image.file_name}
          </span>
          <span className="text-micro opacity-60">Lỗi nguồn Drive</span>
        </div>
      )}

      {/* Additional overlays (watermark, buttons, etc) */}
      {children}
    </div>
  );
}
