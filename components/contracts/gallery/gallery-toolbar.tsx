"use client";

import { useMemo } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  Globe,
  Heart,
  MessageCircle,
  Star,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import GallerySortDropdown, { type SortOption } from "./gallery-sort-dropdown";
import type { GalleryAlbum } from "@/app/actions/gallery-album-actions";
import { type FileFilter, type StatsFilter, FOLDER_LABELS, type ImageGroup } from "./gallery-helpers";
import type { GalleryImage, GallerySummary } from "@/types/gallery";

import { MobilePrimaryStatCard, MobileSecondaryStatChip } from "./gallery-toolbar-stats";
import { GalleryFilterTabs, GalleryDesktopFilterGroup, DesktopFilterDivider } from "./gallery-toolbar-filters";
import {
  ActionButton,
  ViewModeToggle,
  GalleryMoreMenu,
  AlbumCreateInput,
} from "./gallery-toolbar-actions";

// ═══════════════════════════════════════════
// GalleryToolbar — Main toolbar orchestrator
// Sub-components extracted to:
//   gallery-toolbar-stats.tsx (MobilePrimaryStatCard, MobileSecondaryStatChip)
//   gallery-toolbar-filters.tsx (GalleryFilterTabs, GalleryDesktopFilterGroup)
//   gallery-toolbar-actions.tsx (ActionButton, ViewModeToggle, MoreMenu, AlbumInput)
// ═══════════════════════════════════════════

const ALL_ALBUMS_TAB = "__all_albums__";

// ─── Gallery Status Badge ───────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Bản nháp", className: "bg-bg-hover text-text-muted" },
  shared: { label: "Đã chia sẻ", className: "bg-success/10 text-success" },
  locked: { label: "Đã khoá", className: "bg-warning/10 text-warning" },
  delivered: { label: "Đã bàn giao", className: "bg-info/10 text-info" },
};

function GalleryStatusBadge({ status, accessUrl }: { status: string; accessUrl?: string | null }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-tiny font-semibold ${config.className}`}>
        <Globe size={11} />
        {config.label}
      </span>
      {status === "shared" && accessUrl && (
        <span className="hidden text-tiny text-text-muted lg:inline truncate max-w-40" title={accessUrl}>
          /{accessUrl}
        </span>
      )}
    </div>
  );
}

interface GalleryToolbarProps {
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  galleries: GallerySummary[];
  images: GalleryImage[];
  totalImageCount: number;
  groupedImages: ImageGroup[];
  fileFilter: FileFilter;
  activeFilter: StatsFilter;
  activeGalleryId: string | null;
  galleryStatus: string;
  galleryAccessUrl?: string | null;
  rawCount: number;
  jpgCount: number;
  selectedCount: number;
  starredCount: number;
  totalHearts: number;
  commentCount: number;
  viewMode: "grid" | "list";
  sortBy: SortOption;
  watermarkOn: boolean;
  albums: GalleryAlbum[];
  activeAlbumId: string | null;
  showAlbumInput: boolean;
  newAlbumName: string;
  selectedDownloadFiles: { imageId: string; fileName: string }[];
  allDownloadFiles: { imageId: string; fileName: string }[];
  onSetActiveGalleryId: (id: string) => void;
  onSetFileFilter: (filter: FileFilter) => void;
  onSetActiveFilter: (filter: StatsFilter) => void;
  onSetActiveAlbumId: (id: string | null) => void;
  onSort: (sort: SortOption) => void;
  onViewMode: (mode: "grid" | "list") => void;
  onWatermarkToggle: () => void;
  onOpenShare: () => void;
  onOpenSettings?: () => void;
  onSetShowAlbumInput: (show: boolean) => void;
  onSetNewAlbumName: (name: string) => void;
  onCreateAlbum: () => void;
  onOpenFilterModal?: (tab: "drive" | "local" | "export") => void;
  onOpenListModal?: () => void;
}

export default function GalleryToolbar({
  breadcrumbItems,
  galleries,
  images,
  totalImageCount,
  groupedImages,
  fileFilter,
  activeFilter,
  activeGalleryId,
  galleryStatus,
  galleryAccessUrl,
  rawCount,
  jpgCount,
  selectedCount,
  starredCount,
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
  onOpenSettings,
  onSetShowAlbumInput,
  onSetNewAlbumName,
  onCreateAlbum,
  onOpenFilterModal,
  onOpenListModal,
}: GalleryToolbarProps) {
  const activeGallery = useMemo(() => galleries.find(g => g.id === activeGalleryId), [galleries, activeGalleryId]);
  const isGocGallery = activeGallery?.folder_type === "goc";

  const statsItems = useMemo<StatItem[]>(() => ([
    {
      icon: Camera,
      label: "ảnh",
      value: String(totalImageCount || images.length),
      tone: "primary",
      onClick: () => onSetActiveFilter("all"),
    },
    {
      icon: Star,
      label: "đề xuất",
      value: String(starredCount),
      tone: "warning",
      active: activeFilter === "starred",
      onClick: () => onSetActiveFilter(activeFilter === "starred" ? "all" : "starred"),
    },
    {
      icon: Heart,
      label: "khách chọn",
      value: String(selectedCount),
      tone: "error",
      active: activeFilter === "selected",
      onClick: () => onSetActiveFilter(activeFilter === "selected" ? "all" : "selected"),
    },
    {
      icon: MessageCircle,
      label: "bình luận",
      value: String(commentCount),
      tone: "info",
      active: activeFilter === "commented",
      onClick: () => onSetActiveFilter(activeFilter === "commented" ? "all" : "commented"),
    },
  ]), [activeFilter, commentCount, onSetActiveFilter, selectedCount, starredCount, totalImageCount, images.length]);

  const galleryTabs = useMemo(
    () => galleries.map((gallery) => ({
      label: FOLDER_LABELS[gallery.folder_type || ""] || gallery.title || "Album",
      value: gallery.id,
      count: gallery.imageCount || 0,
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

  const hasDesktopFilters = galleries.length > 1 || rawCount > 0 || albums.length > 0;
  const mobileSecondaryStats = useMemo(
    () => statsItems.filter((item, index) => index > 1 && (Number(item.value) > 0 || item.active)),
    [statsItems]
  );

  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-bg-base/95 backdrop-blur-md">
      <div className="space-y-2.5 px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            {breadcrumbItems && (
              <Breadcrumb items={breadcrumbItems} className="text-caption md:text-body-sm" />
            )}
          </div>
          <GalleryStatusBadge status={galleryStatus} accessUrl={galleryAccessUrl} />
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <GallerySortDropdown value={sortBy} onChange={onSort} />
              <GalleryMoreMenu
                downloadFiles={selectedDownloadFiles.length > 0 ? selectedDownloadFiles : allDownloadFiles}
                downloadLabel={selectedDownloadFiles.length > 0 ? `Tải ${selectedDownloadFiles.length} đã chọn` : "Tải tất cả"}
                onOpenShare={onOpenShare}
                onOpenSettings={onOpenSettings}
                onOpenFilterDrive={onOpenFilterModal ? () => onOpenFilterModal("drive") : undefined}
                onOpenFilterLocal={onOpenFilterModal ? () => onOpenFilterModal("local") : undefined}
                onOpenList={onOpenListModal}
                disableFilter={!(isGocGallery && selectedCount > 0)}
              />
            </div>
          </div>

          <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-3">
            <StatsBar items={statsItems} className="min-w-0 flex-1" />

            <div className="shrink-0 flex items-center justify-end gap-2 overflow-visible lg:flex">
              <GallerySortDropdown value={sortBy} onChange={onSort} />
              <ViewModeToggle viewMode={viewMode} onChange={onViewMode} />
              <ActionButton onClick={onWatermarkToggle} title={watermarkOn ? "Tắt watermark" : "Bật watermark"}>
                {watermarkOn ? <EyeOff size={15} /> : <Eye size={15} />}
                <span>WM</span>
              </ActionButton>
              <GalleryMoreMenu
                downloadFiles={selectedDownloadFiles.length > 0 ? selectedDownloadFiles : allDownloadFiles}
                downloadLabel={selectedDownloadFiles.length > 0 ? `Tải ${selectedDownloadFiles.length} đã chọn` : "Tải tất cả"}
                onOpenShare={onOpenShare}
                onOpenSettings={onOpenSettings}
                onOpenFilterDrive={onOpenFilterModal ? () => onOpenFilterModal("drive") : undefined}
                onOpenFilterLocal={onOpenFilterModal ? () => onOpenFilterModal("local") : undefined}
                onOpenList={onOpenListModal}
                disableFilter={!(isGocGallery && selectedCount > 0)}
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
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
