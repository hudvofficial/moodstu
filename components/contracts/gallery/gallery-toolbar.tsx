"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Eye,
  EyeOff,
  Heart,
  LayoutGrid,
  List,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Share2,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { StatsBar, type StatItem } from "@/components/ui/stats-bar";
import { TabsFilter } from "@/components/ui/tabs-filter";
import DownloadManager from "@/components/gallery/download-manager";
import GallerySortDropdown, { type SortOption } from "./gallery-sort-dropdown";
import type { GalleryAlbum } from "@/app/actions/gallery-album-actions";
import { type FileFilter, type StatsFilter, FOLDER_LABELS, type ImageGroup } from "./gallery-helpers";
import type { Gallery, GalleryImage } from "@/types/gallery";
import { cn } from "@/lib/utils";

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

const desktopActionClassName = "btn-ghost h-9 px-3 text-caption font-semibold whitespace-nowrap";
const mobileIconActionClassName = "btn-icon h-9 w-9 min-w-9 shrink-0";
const compactDownloadClassName = "h-9 min-w-[7.5rem] flex-1 justify-center px-3 text-caption font-semibold whitespace-nowrap sm:flex-none";
const ALL_ALBUMS_TAB = "__all_albums__";

type MobileStatTone = NonNullable<StatItem["tone"]>;

const MOBILE_STAT_STYLES: Record<MobileStatTone, { iconBg: string; iconColor: string; activeBg: string; activeText: string }> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    activeBg: "border-primary/25 bg-primary/5 shadow-primary/10",
    activeText: "text-primary",
  },
  success: {
    iconBg: "bg-success/10",
    iconColor: "text-success",
    activeBg: "border-success/25 bg-success/5 shadow-success/10",
    activeText: "text-success",
  },
  error: {
    iconBg: "bg-error/10",
    iconColor: "text-error",
    activeBg: "border-error/25 bg-error/5 shadow-error/10",
    activeText: "text-error",
  },
  info: {
    iconBg: "bg-info/10",
    iconColor: "text-info",
    activeBg: "border-info/25 bg-info/5 shadow-info/10",
    activeText: "text-info",
  },
  neutral: {
    iconBg: "bg-bg-hover",
    iconColor: "text-text-secondary",
    activeBg: "border-border bg-bg-hover shadow-none",
    activeText: "text-text-main",
  },
  accent: {
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    activeBg: "border-accent/25 bg-accent/5 shadow-accent/10",
    activeText: "text-accent",
  },
};

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

function MobilePrimaryStatCard({ item }: { item: StatItem }) {
  const tone = MOBILE_STAT_STYLES[item.tone || "primary"];

  return (
    <Button
      unstyled
      type="button"
      onClick={item.onClick}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        item.active ? cn("shadow-sm", tone.activeBg) : "border-border/70 bg-elevated/80 hover:bg-bg-hover"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.iconBg || tone.iconBg)}>
        <item.icon className={cn("h-4 w-4", item.iconColor || tone.iconColor)} />
      </div>
      <div className="min-w-0">
        <div className={cn("text-body font-bold leading-none", item.active ? tone.activeText : "text-text-main")}>
          {item.value}
        </div>
        <div className={cn("mt-1 text-caption leading-none", item.active ? tone.activeText : "text-text-muted")}>
          {item.label}
        </div>
      </div>
    </Button>
  );
}

function MobileSecondaryStatChip({ item }: { item: StatItem }) {
  const tone = MOBILE_STAT_STYLES[item.tone || "primary"];

  return (
    <Button
      unstyled
      type="button"
      onClick={item.onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-semibold transition-colors",
        item.active
          ? tone.activeBg
          : "border-border/70 bg-elevated/70 text-text-secondary hover:bg-bg-hover hover:text-text-main"
      )}
    >
      <item.icon className={cn("h-3.5 w-3.5", item.iconColor || tone.iconColor)} />
      <span className={item.active ? tone.activeText : "text-text-main"}>{item.value}</span>
      <span className={item.active ? tone.activeText : "text-text-muted"}>{item.label}</span>
    </Button>
  );
}

function ActionButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button unstyled onClick={onClick} className={desktopActionClassName} title={title}>
      {children}
    </Button>
  );
}

function GalleryFilterTabs({
  tabs,
  activeTab,
  onChange,
  trailing,
}: {
  tabs: Array<{ label: string; value: string; count?: number }>;
  activeTab: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide lg:hidden">
        <TabsFilter tabs={tabs} activeTab={activeTab} onChange={onChange} variant="pills" size="compact" />
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>

      <div className="hidden lg:flex lg:items-center lg:gap-3">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          <TabsFilter tabs={tabs} activeTab={activeTab} onChange={onChange} className="min-w-max" />
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </>
  );
}

function GalleryDesktopFilterGroup({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ label: string; value: string; count?: number }>;
  activeTab: string;
  onChange: (value: string) => void;
}) {
  return (
    <TabsFilter
      tabs={tabs}
      activeTab={activeTab}
      onChange={onChange}
      className="min-w-max rounded-none bg-transparent p-0 shadow-none"
    />
  );
}

function DesktopFilterDivider() {
  return <div className="h-6 w-px shrink-0 bg-border/70" />;
}

function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: "grid" | "list";
  onChange: (mode: "grid" | "list") => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-bg-card p-1">
      <Button
        unstyled
        onClick={() => onChange("grid")}
        className={`flex h-7 items-center gap-1 rounded-md px-2 transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "text-text-muted hover:bg-bg-hover"}`}
        title="Dạng lưới"
      >
        <LayoutGrid size={14} />
      </Button>
      <Button
        unstyled
        onClick={() => onChange("list")}
        className={`flex h-7 items-center gap-1 rounded-md px-2 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "text-text-muted hover:bg-bg-hover"}`}
        title="Dạng danh sách"
      >
        <List size={14} />
      </Button>
    </div>
  );
}

function GalleryMoreMenu({
  allDownloadFiles,
  viewMode,
  onViewMode,
  watermarkOn,
  onWatermarkToggle,
}: {
  allDownloadFiles: { driveFileId: string; fileName: string }[];
  viewMode: "grid" | "list";
  onViewMode: (mode: "grid" | "list") => void;
  watermarkOn: boolean;
  onWatermarkToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <Button unstyled onClick={() => setOpen((prev) => !prev)} className={mobileIconActionClassName} title="Tác vụ khác">
        <MoreHorizontal size={16} />
      </Button>

      {open && (
        <div className="card-base absolute right-0 top-full z-30 mt-2 w-52 space-y-2 p-2">
          <ViewModeToggle viewMode={viewMode} onChange={onViewMode} />
          <Button
            unstyled
            onClick={() => {
              onWatermarkToggle();
              setOpen(false);
            }}
            className="btn-ghost flex h-9 w-full items-center justify-start px-3 text-caption font-semibold"
          >
            {watermarkOn ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{watermarkOn ? "Tắt watermark" : "Bật watermark"}</span>
          </Button>
          <DownloadManager
            files={allDownloadFiles}
            label="Tải tất cả"
            variant="button"
            className="h-9 w-full justify-start px-3 text-caption font-semibold"
          />
        </div>
      )}
    </div>
  );
}

function AlbumCreateInput({
  show,
  name,
  onSetShow,
  onSetName,
  onCreate,
  placeholder,
}: {
  show: boolean;
  name: string;
  onSetShow: (show: boolean) => void;
  onSetName: (name: string) => void;
  onCreate: () => void;
  placeholder?: string;
}) {
  if (show) {
    return (
      <div className="ml-1 flex items-center gap-1">
        <Input
          value={name}
          onChange={(event) => onSetName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onCreate()}
          placeholder={placeholder || "Tên album..."}
          autoFocus
          className="h-7 w-40 text-caption"
        />
        <Button unstyled onClick={onCreate} className="btn-ghost h-7 px-2" title="Tạo album">
          <Plus size={14} />
        </Button>
        <Button
          unstyled
          onClick={() => {
            onSetShow(false);
            onSetName("");
          }}
          className="btn-ghost h-7 px-2"
          title="Đóng tạo album"
        >
          <X size={14} />
        </Button>
      </div>
    );
  }

  return (
    <Button
      unstyled
      onClick={() => onSetShow(true)}
      className="btn-icon h-7 w-7 min-w-7 shrink-0 rounded-md border border-border bg-elevated text-text-muted hover:bg-hover hover:text-text-main lg:h-8 lg:w-8 lg:min-w-8 lg:border-0 lg:bg-bg-card lg:shadow-xs"
      title="Tạo album mới"
      aria-label="Tạo album mới"
    >
      <Plus size={12} />
    </Button>
  );
}
