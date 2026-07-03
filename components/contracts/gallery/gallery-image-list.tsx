"use client";

import { useState } from "react";
import { GripVertical, Heart, ImageIcon, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import { getResponsiveThumbnailUrl, type ImageGroup } from "./gallery-helpers";

interface GalleryImageListProps {
  groups: ImageGroup[];
  onImageClick: (index: number) => void;
  reactionCounts?: ReactionCounts;
  onToggleStar?: (imageId: string, currentSelected: boolean) => void;
  watermarkEnabled?: boolean;
  draggable?: boolean;
  onReorder?: (fromIdx: number, toIdx: number) => void;
}

export default function GalleryImageList({
  groups,
  onImageClick,
  reactionCounts,
  onToggleStar,
  watermarkEnabled,
  draggable = false,
  onReorder,
}: GalleryImageListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <ImageIcon size={48} className="mx-auto mb-3 text-text-muted/20" />
        <p className="text-body-sm text-text-muted">Chưa có ảnh nào</p>
      </div>
    );
  }

  const headerColumns = draggable
    ? "36px 80px minmax(220px,1fr) 84px 110px 40px 60px"
    : "80px minmax(220px,1fr) 84px 110px 40px 60px";

  return (
    <div className="overflow-x-auto px-3 py-3 md:px-6 md:py-4">
      <div style={{ minWidth: 720 }}>
        <div
          className="mb-1 hidden items-center gap-3 px-3 py-2 lg:grid"
          style={{
            gridTemplateColumns: headerColumns,
            fontSize: "var(--font-size-caption)",
            color: "var(--color-text-muted)",
            fontWeight: 600,
          }}
        >
          {draggable && <span className="text-center">↕</span>}
          <span>Ảnh</span>
          <span>Tên file</span>
          <span>Loại</span>
          <span>Ngày tạo</span>
          <span className="text-center">♥</span>
          <span className="text-center">★</span>
        </div>

        {groups.map((group, index) => {
          const image = group.displayImage;
          const hearts = group.images.reduce((sum, groupImage) => sum + (reactionCounts?.[groupImage.id]?.hearts || 0), 0);
          const fileType = group.hasRaw && group.hasJpg ? "RAW+JPG" : group.hasRaw ? "RAW" : "JPG";
          const dateLabel = image.created_at
            ? new Date(image.created_at).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            : "—";
          const isDragging = dragIndex === index;
          const isDragOver = dragOverIndex === index && dragIndex !== index;

          return (
            <div
              key={group.fileGroup}
              role="button"
              tabIndex={0}
              onClick={() => onImageClick(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onImageClick(index);
              }}
              draggable={draggable}
              onDragStart={draggable ? (event) => {
                setDragIndex(index);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              } : undefined}
              onDragOver={draggable ? (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverIndex(index);
              } : undefined}
              onDrop={draggable ? (event) => {
                event.preventDefault();
                const fromIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
                if (!Number.isNaN(fromIndex) && fromIndex !== index && onReorder) {
                  onReorder(fromIndex, index);
                }
                setDragIndex(null);
                setDragOverIndex(null);
              } : undefined}
              onDragEnd={draggable ? () => {
                setDragIndex(null);
                setDragOverIndex(null);
              } : undefined}
              className="grid cursor-pointer items-center gap-3 rounded-lg border-b border-border-light px-3 py-2 transition-colors duration-150 hover:bg-bg-hover"
              style={{
                gridTemplateColumns: headerColumns,
                opacity: isDragging ? 0.5 : 1,
                outline: isDragOver ? "2px solid var(--color-primary)" : "none",
                outlineOffset: -2,
              }}
            >
              {draggable && (
                <div
                  className="flex items-center justify-center text-text-muted"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <GripVertical size={15} />
                </div>
              )}

              <div className="relative overflow-hidden rounded-md" style={{ width: 80, height: 56 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Drive thumbnail URL is computed per tile width */}
                <img
                  src={getResponsiveThumbnailUrl(image.thumbnail_url, image.image_url, 240)}
                  alt={image.file_name || "Photo"}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {image.is_starred && (
                  <div className="absolute left-1 top-1">
                    <Star size={12} className="fill-warning text-warning" />
                  </div>
                )}
                {watermarkEnabled && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                    <span
                      className="select-none rotate-[-30deg]"
                      style={{
                        color: "var(--gallery-admin-watermark)",
                        fontSize: "14px",
                        letterSpacing: "3px",
                        fontWeight: 800,
                      }}
                    >
                      PROOF
                    </span>
                  </div>
                )}
                <div
                  className="absolute bottom-0.5 right-0.5 flex items-center justify-center rounded font-semibold text-text-inverse"
                  style={{
                    width: 18,
                    height: 18,
                    fontSize: "9px",
                    backgroundColor: "var(--gallery-admin-index-bg)",
                  }}
                >
                  {index + 1}
                </div>
              </div>

              <p className="truncate text-body-sm text-text-primary">
                {image.file_name || `Photo ${index + 1}`}
              </p>

              <Badge variant={group.hasRaw ? "primary" : "neutral"}>{fileType}</Badge>

              <span className="text-caption text-text-muted">{dateLabel}</span>

              <div className="flex items-center justify-center">
                {hearts > 0 ? (
                  <span className="inline-flex items-center gap-1 text-caption font-semibold text-error" title="Khách thả tim">
                    <Heart size={14} className="fill-error text-error" />
                    {hearts}
                  </span>
                ) : image.is_selected ? (
                  <span className="inline-flex items-center" title="Khách chọn">
                    <Heart size={14} className="fill-error text-error" />
                  </span>
                ) : null}
              </div>

              <div className="flex items-center justify-center gap-1">
                {onToggleStar && (
                  <Button
                    unstyled
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleStar(image.id, !!image.is_starred);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.stopPropagation();
                        onToggleStar(image.id, !!image.is_starred);
                      }
                    }}
                    className="flex items-center justify-center"
                    title={image.is_starred ? "Bỏ đề xuất" : "Đánh dấu đề xuất"}
                  >
                    <Star size={14} className={image.is_starred ? "fill-warning text-warning" : "text-text-muted"} />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
