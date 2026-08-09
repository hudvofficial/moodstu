"use client";

import { CircleCheck, Heart, ImageIcon, ImageOff, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import type { GalleryCommentSummary } from "@/app/actions/gallery-composite-actions";
import { getResponsiveThumbnailUrl, type ImageGroup } from "./gallery-helpers";
import { useMasonryGrid } from "./use-masonry-grid";
import { GalleryImageTile } from "./gallery-image-tile";

interface GalleryImageGridProps {
  groups: ImageGroup[];
  onImageClick: (index: number) => void;
  reactionCounts?: ReactionCounts;
  onToggleStar?: (imageId: string, currentSelected: boolean) => void;
  onToggleReaction?: (imageId: string) => void;
  reactedImageIds?: Set<string>;
  watermarkEnabled?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  publicMode?: boolean;
  /** Hiển thị client_note dưới tile (chỉ khi publicMode + truthy). Mặc định: false. */
  showClientNote?: boolean;
  commentsPerImage?: Record<string, GalleryCommentSummary[]>;
}

export default function GalleryImageGrid({
  groups,
  onImageClick,
  reactionCounts,
  onToggleStar,
  onToggleReaction,
  reactedImageIds,
  watermarkEnabled,
  onLoadMore,
  loadingMore,
  hasMore: hasMoreServer,
  publicMode,
  showClientNote = false,
  commentsPerImage = {},
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
    errorGroups,
    handleImageLoad,
    handleImageError,
    DEFAULT_ASPECT_RATIO,
  } = useMasonryGrid({ groups, hasMoreServer, loadingMore, onLoadMore, maxColumns: publicMode ? 5 : undefined });

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
            position: "relative",
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
                const isError = errorGroups[group.fileGroup] === true;
                // Admin + public both load the lh3 sized URL directly (tile marks lh3 unoptimized).
                // Do NOT route public through the /api/drive-download proxy: it 302-redirects to lh3,
                // and Next.js /_next/image cannot optimize a redirect -> 400 on every tile (broken gallery).
                // Cỡ CỐ ĐỊNH =s600 (ADR-012): src SSR === src client — columnWidth đổi sau hydration
                // (SSR giả định 5 cột desktop, mobile đo lại 2 cột) từng làm src đổi → img node bị thay
                // → trình duyệt vứt ảnh HTML, tải lại bằng JS (load delay 2.76s trong trace LCP).
                const imageSrc = getResponsiveThumbnailUrl(
                  image.thumbnail_url,
                  image.image_url,
                  600,
                );
                // Eager phủ ~2 hàng đầu (mobile 2 cột × 2 hàng lẫn desktop) — ADR-012
                const eagerLoad = index < Math.max(columnCount * 2, 4);
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
                const groupHeartCount = group.images.reduce((sum, groupImage) => sum + (reactionCounts?.[groupImage.id]?.hearts || 0), 0);
                const isClientReacted = publicMode ? !!reactedImageIds?.has(image.id) : false;

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
                    <GalleryImageTile
                      imageSrc={imageSrc}
                      image={image}
                      imageLoaded={imageLoaded}
                      isError={isError}
                      eagerLoad={eagerLoad}
                      imageAspectRatio={imageAspectRatio}
                      columnWidth={columnWidth}
                      fileGroup={group.fileGroup}
                      onImageLoad={handleImageLoad}
                      onImageError={handleImageError}
                    >
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

                      {/* Nút CHỌN (✓) trên tile public — đối xứng trái-dưới với ❤️ phải-dưới.
                          Chọn vs Tim là 2 hệ độc lập (✓ xanh = chọn làm album, ❤️ đỏ = yêu thích);
                          link view-only không có onToggleStar → chỉ hiện ✓ tĩnh nếu ảnh đã chọn. */}
                      {publicMode && (onToggleStar ? (
                        <Button
                          unstyled
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleStar(image.id, !!image.is_selected);
                          }}
                          className={`absolute left-2 bottom-2 z-20 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${image.is_selected ? "opacity-100" : "opacity-90"}`}
                          style={{ background: "rgba(0,0,0,0.28)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
                          title={image.is_selected ? "Bỏ chọn" : "Chọn ảnh"}
                        >
                          <CircleCheck
                            size={20}
                            fill={image.is_selected ? "#34c759" : "none"}
                            stroke="white"
                            strokeWidth={2}
                            style={{ transition: "fill 0.3s, stroke 0.3s", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                          />
                        </Button>
                      ) : image.is_selected ? (
                        <div className="absolute left-2 bottom-2 z-20 flex h-8 w-8 items-center justify-center rounded-full">
                          <CircleCheck size={20} fill="#34c759" stroke="white" strokeWidth={2} />
                        </div>
                      ) : null)}

                      {(publicMode ? onToggleReaction : onToggleStar) ? (
                        <Button
                          unstyled
                          onClick={(event) => {
                            event.stopPropagation();
                            if (publicMode) {
                              onToggleReaction?.(image.id);
                              return;
                            }
                            onToggleStar?.(image.id, !!image.is_starred);
                          }}
                          className={`absolute ${publicMode ? 'right-2 bottom-2' : 'left-2 top-2'} z-20 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                            publicMode
                              ? (isClientReacted ? "opacity-100" : "opacity-90")
                              : (image.is_starred ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                          }`}
                          style={publicMode ? { background: "rgba(0,0,0,0.28)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" } : overlayChipStyle}
                          title={publicMode ? (isClientReacted ? "Bỏ yêu thích" : "Yêu thích") : (image.is_starred ? "Bỏ đề xuất" : "Đánh dấu đề xuất")}
                        >
                          {publicMode ? (
                            <Heart
                              size={20}
                              fill={isClientReacted ? "#ff3b30" : "none"}
                              stroke={isClientReacted ? "#ff3b30" : "white"}
                              strokeWidth={2}
                              style={{ transition: "fill 0.3s, stroke 0.3s", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                            />
                          ) : (
                            <Star size={16} className={image.is_starred ? "fill-warning text-warning" : "text-text-muted"} />
                          )}
                        </Button>
                      ) : (isAdmin ? image.is_starred : isClientReacted) ? (
                        <div
                          className={`absolute ${publicMode ? 'right-2 bottom-2' : 'left-2 top-2'} z-20 flex h-8 w-8 items-center justify-center rounded-full`}
                          style={publicMode ? {} : overlayChipStyle}
                        >
                          {publicMode ? (
                            <Heart size={20} fill="#ff3b30" stroke="#ff3b30" strokeWidth={2} />
                          ) : (
                            <Star size={16} className="fill-warning text-warning" />
                          )}
                        </div>
                      ) : null}

                      {/* publicMode: góc trái-dưới giờ là nút ✓ → chip ghi chú dời lên trái-trên (admin giữ nguyên vì trái-trên có nút Star) */}
                      {commentsPerImage[image.id]?.length > 0 && (
                        <div
                          className={`absolute ${publicMode ? "left-2 top-2" : "left-2 bottom-2"} z-20 flex h-7 w-7 items-center justify-center rounded-full`}
                          style={overlayChipStyle}
                          title="Có ghi chú"
                        >
                          <MessageSquare size={13} className="text-primary" />
                        </div>
                      )}

                      {!publicMode && (showFileBadge || image.is_selected || groupHeartCount > 0) && (
                        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
                          {image.is_selected && (
                            <span className="flex h-5 items-center justify-center rounded-full px-2" style={overlayChipStyle} title="Khách chọn">
                              <CircleCheck size={12} className="fill-success/20 text-success" />
                            </span>
                          )}
                          {groupHeartCount > 0 && (
                            <span className="flex h-5 items-center gap-1 rounded-full px-2 text-tiny font-semibold" style={overlayChipStyle} title="Khách thả tim">
                              <Heart size={11} className="fill-error text-error" />
                              {groupHeartCount}
                            </span>
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
                        {/* text-center + px-9: chừa 2 góc đáy cho nút ✓ (trái) + ❤️ (phải) — tên file từng bị nút đè khi hover */}
                        <p className="truncate px-9 text-center text-micro font-medium text-text-inverse">{image.file_name}</p>
                      </div>

                      {/* Ghi chú khách từ gallery_comments */}
                      {showClientNote && commentsPerImage[image.id]?.[0]?.content && (
                        <div
                          className="pointer-events-none absolute bottom-0 right-12 left-0 z-20 px-3 pb-2 pt-6"
                          style={{
                            background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.7) 100%)",
                          }}
                          title={commentsPerImage[image.id]?.[0]?.content}
                        >
                          <p className="line-clamp-1 text-xs font-medium text-white/70">
                            {commentsPerImage[image.id]?.[0]?.content}
                          </p>
                        </div>
                      )}
                    </GalleryImageTile>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Invisible sentinel - IntersectionObserver watches this to trigger load-more */}
      {showSentinel && (
        <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
      )}

      {loadingMore && hasMoreServer && (
        <div className="py-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-caption text-text-muted">Đang tải thêm ảnh...</p>
          </div>
        </div>
      )}
    </>
  );
}
