"use client";

import { useMemo } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  Heart,
  MessageCircle,
  Share2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import DownloadManager from "@/components/gallery/download-manager";
import GallerySortDropdown, { type SortOption } from "./gallery-sort-dropdown";
import type { GalleryAlbum } from "@/app/actions/gallery-album-actions";
import { type FileFilter, type StatsFilter, FOLDER_LABELS, type ImageGroup } from "./gallery-helpers";
import type { Gallery, GalleryImage } from "@/types/gallery";

import { MobilePrimaryStatCard, MobileSecondaryStatChip } from "./gallery-toolbar-stats";
import { GalleryFilterTabs, GalleryDesktopFilterGroup, DesktopFilterDivider } from "./gallery-toolbar-filters";
import {
  ActionButton,
  ViewModeToggle,
  GalleryMoreMenu,
  AlbumCreateInput,
  desktopActionClassName,
  mobileIconActionClassName,
} from "./gallery-toolbar-actions";

// ═══════════════════════════════════════════
// GalleryToolbar — Main toolbar orchestrator
// Sub-components extracted to:
//   gallery-toolbar-stats.tsx (MobilePrimaryStatCard, MobileSecondaryStatChip)
//   gallery-toolbar-filters.tsx (GalleryFilterTabs, GalleryDesktopFilterGroup)
//   gallery-toolbar-actions.tsx (ActionButton, ViewModeToggle, MoreMenu, AlbumInput)
// ═══════════════════════════════════════════

const compactDownloadClassName = "h-9 min-w-[7.5rem] flex-1 justify-center px-3 text-caption font-semibold whitespace-nowrap sm:flex-none";
const ALL_ALBUMS_TAB = "__all_albums__";

interface GalleryToolbarProps {
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  galleries: Gallery[];
  images: GalleryImage[];
  groupedImages: ImageGroup[];
  fileFilter: FileFilter;
  activeFilter: StatsFilter;
  activeGalleryId: string | null;
  rawCount: number;
  jpgCount: number;
  selectedCount: number;
  totalHearts: number;
  commentCount: number;
  viewMode: "grid" | "list";
  sortBy: SortOption;
  watermarkOn: boolean;
  albums: GalleryAlbum[];
  activeAlbumId: string | null;
  showAlbumInput: boolean;
  newAlbumName: string;
  selectedDownloadFiles: { driveFileId: string; fileName: string }[];
  allDownloadFiles: { driveFileId: string; fileName: string }[];
  onSetActiveGalleryId: (id: string) => void;
  onSetFileFilter: (filter: FileFilter) => void;
  onSetActiveFilter: (filter: StatsFilter) => void;
  onSetActiveAlbumId: (id: string | null) => void;
  onSort: (sort: SortOption) => void;
  onViewMode: (mode: "grid" | "list") => void;
  onWatermarkToggle: () => void;
  onOpenShare: () => void;
  onSetShowAlbumInput: (show: boolean) => void;
  onSetNewAlbumName: (name: string) => void;
  onCreateAlbum: () => void;
}

export default function GalleryToolbar({
  breadcrumbItems,
  galleries,
  images,
  groupedImages,
  fileFilter,
  activeFilter,
  activeGalleryId,
  rawCount,
  jpgCount,
  selectedCount,
  totalHearts,
  commentCount,
  viewMode,
  sortBy,
  watermarkOn,
  albums,
  activeAlbumId,
  showAlbumInput,
  newAlbumName,
  selectedDownloadFiles,
  allDownloadFiles,
  onSetActiveGalleryId,
  onSetFileFilter,
  onSetActiveFilter,
  onSetActiveAlbumId,
  onSort,
  onViewMode,
  onWatermarkToggle,
  onOpenShare,
  onSetShowAlbumInput,
  onSetNewAlbumName,
  onCreateAlbum,
}: GalleryToolbarProps) {
  const statsItems = useMemo<StatItem[]>(() => ([
    {
      icon: Camera,
      label: "ảnh",
      value: String(images.length),
      tone: "primary",
      onClick: () => onSetActiveFilter("all"),
    },
    {
      icon: Star,
      label: "đề xuất",
      value: String(selectedCount),
      tone: "success",
      active: activeFilter === "starred",
      onClick: () => onSetActiveFilter(activeFilter === "starred" ? "all" : "starred"),
    },
    {
      icon: Heart,
      label: "thích",
      value: String(totalHearts),
      tone: "error",
      active: activeFilter === "hearted",
      onClick: () => onSetActiveFilter(activeFilter === "hearted" ? "all" : "hearted"),
    },
    {
      icon: MessageCircle,
      label: "bình luận",
      value: String(commentCount),
      tone: "info",
      active: activeFilter === "commented",
      onClick: () => onSetActiveFilter(activeFilter === "commented" ? "all" : "commented"),
    },
  ]), [activeFilter, commentCount, images.length, onSetActiveFilter, selectedCount, totalHearts]);

  const galleryTabs = useMemo(
    () => galleries.map((gallery) => ({
      label: FOLDER_LABELS[gallery.folder_type || ""] || gallery.title || "Album",
      value: gallery.id,
      count: gallery.gallery_images?.length || 0,
    })),
    [galleries]
  );

  const fileTabs = useMemo(
    () => [
      { label: "Tất cả", value: "all", count: groupedImages.length },
      { label: "JPG", value: "jpg", count: jpgCount },
      { label: "RAW", value: "raw", count: rawCount },
    ],
    [groupedImages.length, jpgCount, rawCount]
  );

  const albumTabs = useMemo(
    () => [
      { label: "Tất cả", value: ALL_ALBUMS_TAB },
      ...albums.map((album) => ({
        label: album.title,
        value: album.id,
        count: album.image_count || 0,
      })),
    ],
    [albums]
  );

  const hasDesktopFilters = galleries.length > 1 || rawCount > 0 || albums.length > 0 || Boolean(activeGalleryId);
  const mobileSecondaryStats = useMemo(
    () => statsItems.filter((item, index) => index > 1 && (Number(item.value) > 0 || item.active)),
    [statsItems]
  );

  return (
    <div className="sticky top-0 z-20 border-b border-border/60 bg-bg-base/95 backdrop-blur-md">
      <div className="space-y-2.5 px-3 py-3 md:px-6 md:py-4">
        <div className="min-w-0">
          {breadcrumbItems && (
            <div className="min-w-0">
              <Breadcrumb items={breadcrumbItems} className="text-caption md:text-body-sm" />
            </div>
          )}
        </div>

        <div className="rounded-xl bg-bg-card px-3 py-3 shadow-xs sm:px-4">
          <div className="space-y-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2">
              {statsItems.slice(0, 2).map((item) => (
                <MobilePrimaryStatCard key={item.label} item={item} />
              ))}
            </div>

            {mobileSecondaryStats.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mobileSecondaryStats.map((item) => (
                  <MobileSecondaryStatChip key={item.label} item={item} />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <GallerySortDropdown value={sortBy} onChange={onSort} />
              <Button unstyled onClick={onOpenShare} className={mobileIconActionClassName} title="Chia sẻ album">
                <Share2 size={16} />
              </Button>
              {selectedDownloadFiles.length > 0 && (
                <DownloadManager
                  files={selectedDownloadFiles}
                  label={`Tải ${selectedDownloadFiles.length}`}
                  variant="button"
                  className={compactDownloadClassName}
                />
              )}
              <GalleryMoreMenu
                allDownloadFiles={allDownloadFiles}
                viewMode={viewMode}
                onViewMode={onViewMode}
                watermarkOn={watermarkOn}
                onWatermarkToggle={onWatermarkToggle}
              />
            </div>
          </div>

          <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-3">
            <StatsBar items={statsItems} className="min-w-0 flex-1" />

            <div className="shrink-0 items-center justify-end gap-2 overflow-x-auto scrollbar-hide lg:flex">
              <GallerySortDropdown value={sortBy} onChange={onSort} />
              <ViewModeToggle viewMode={viewMode} onChange={onViewMode} />
              <ActionButton onClick={onWatermarkToggle} title={watermarkOn ? "Tắt watermark" : "Bật watermark"}>
                {watermarkOn ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>WM</span>
              </ActionButton>
              <ActionButton onClick={onOpenShare} title="Chia sẻ album">
                <Share2 size={15} />
                <span className="hidden lg:inline">Chia sẻ</span>
              </ActionButton>
              {selectedDownloadFiles.length > 0 && (
                <DownloadManager
                  files={selectedDownloadFiles}
                  label={`Tải ${selectedDownloadFiles.length} đã chọn`}
                  variant="button"
                  className={desktopActionClassName}
                />
              )}
              <DownloadManager
                files={allDownloadFiles}
                label="Tải tất cả"
                variant="button"
                className={desktopActionClassName}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2 lg:hidden">
          {galleries.length > 1 && (
            <GalleryFilterTabs
              tabs={galleryTabs}
              activeTab={activeGalleryId || galleryTabs[0]?.value || ""}
              onChange={(value) => {
                onSetActiveGalleryId(value);
                onSetFileFilter("all");
              }}
            />
          )}

          {rawCount > 0 && (
            <GalleryFilterTabs
              tabs={fileTabs}
              activeTab={fileFilter}
              onChange={(value) => onSetFileFilter(value as FileFilter)}
            />
          )}

          {albums.length > 0 && (
            <GalleryFilterTabs
              tabs={albumTabs}
              activeTab={activeAlbumId || ALL_ALBUMS_TAB}
              onChange={(value) => onSetActiveAlbumId(value === ALL_ALBUMS_TAB ? null : value)}
              trailing={(
                <AlbumCreateInput
                  show={showAlbumInput}
                  name={newAlbumName}
                  onSetShow={onSetShowAlbumInput}
                  onSetName={onSetNewAlbumName}
                  onCreate={onCreateAlbum}
                />
              )}
            />
          )}

          {albums.length === 0 && activeGalleryId && (
            <AlbumCreateInput
              show={showAlbumInput}
              name={newAlbumName}
              onSetShow={onSetShowAlbumInput}
              onSetName={onSetNewAlbumName}
              onCreate={onCreateAlbum}
              placeholder="Tên album đầu tiên..."
            />
          )}
        </div>

        {hasDesktopFilters && (
          <div className="hidden rounded-md bg-elevated p-1 shadow-xs lg:flex lg:items-center lg:gap-3 lg:overflow-x-auto lg:scrollbar-hide">
            {galleries.length > 1 && (
              <>
                <GalleryDesktopFilterGroup
                  tabs={galleryTabs}
                  activeTab={activeGalleryId || galleryTabs[0]?.value || ""}
                  onChange={(value) => {
                    onSetActiveGalleryId(value);
                    onSetFileFilter("all");
                  }}
                />
                {(rawCount > 0 || albums.length > 0 || activeGalleryId) && <DesktopFilterDivider />}
              </>
            )}

            {rawCount > 0 && (
              <>
                <GalleryDesktopFilterGroup
                  tabs={fileTabs}
                  activeTab={fileFilter}
                  onChange={(value) => onSetFileFilter(value as FileFilter)}
                />
                {(albums.length > 0 || activeGalleryId) && <DesktopFilterDivider />}
              </>
            )}

            {albums.length > 0 ? (
              <div className="flex min-w-0 items-center gap-2">
                <GalleryDesktopFilterGroup
                  tabs={albumTabs}
                  activeTab={activeAlbumId || ALL_ALBUMS_TAB}
                  onChange={(value) => onSetActiveAlbumId(value === ALL_ALBUMS_TAB ? null : value)}
                />
                <AlbumCreateInput
                  show={showAlbumInput}
                  name={newAlbumName}
                  onSetShow={onSetShowAlbumInput}
                  onSetName={onSetNewAlbumName}
                  onCreate={onCreateAlbum}
                />
              </div>
            ) : activeGalleryId ? (
              <AlbumCreateInput
                show={showAlbumInput}
                name={newAlbumName}
                onSetShow={onSetShowAlbumInput}
                onSetName={onSetNewAlbumName}
                onCreate={onCreateAlbum}
                placeholder="Tên album đầu tiên..."
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
