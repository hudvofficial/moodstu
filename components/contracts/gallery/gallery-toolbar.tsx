"use client";

import { Filter, Share2, Lock, Unlock, Camera, Heart, Star, MessageCircle, LayoutGrid, List, Plus, X, Eye, EyeOff } from "lucide-react";
import DownloadManager from "@/components/gallery/download-manager";
import GallerySortDropdown, { type SortOption } from "./gallery-sort-dropdown";
import type { GalleryAlbum } from "@/app/actions/gallery-album-actions";
import { type FileFilter, type StatsFilter, FOLDER_LABELS, type ImageGroup } from "./gallery-helpers";
import type { Gallery, GalleryImage } from "@/types/gallery";

// ═══════════════════════════════════════════
// GalleryToolbar — Sticky header with all controls
// ═══════════════════════════════════════════

interface GalleryToolbarProps {
  galleries: Gallery[];
  images: GalleryImage[];
  groupedImages: ImageGroup[];
  // Filter state
  fileFilter: FileFilter;
  activeFilter: StatsFilter;
  activeGalleryId: string | null;
  // Counts
  rawCount: number;
  jpgCount: number;
  selectedCount: number;
  totalHearts: number;
  commentCount: number;
  hasPassword: boolean;
  // View state
  viewMode: "grid" | "list";
  sortBy: SortOption;
  watermarkOn: boolean;
  // Albums
  albums: GalleryAlbum[];
  activeAlbumId: string | null;
  showAlbumInput: boolean;
  newAlbumName: string;
  // Download
  selectedDownloadFiles: { driveFileId: string; fileName: string }[];
  allDownloadFiles: { driveFileId: string; fileName: string }[];
  // Callbacks
  onSetActiveGalleryId: (id: string) => void;
  onSetFileFilter: (f: FileFilter) => void;
  onSetActiveFilter: (f: StatsFilter) => void;
  onSetActiveAlbumId: (id: string | null) => void;
  onSort: (s: SortOption) => void;
  onViewMode: (m: "grid" | "list") => void;
  onWatermarkToggle: () => void;
  onOpenShare: () => void;
  onSetShowAlbumInput: (show: boolean) => void;
  onSetNewAlbumName: (name: string) => void;
  onCreateAlbum: () => void;
}

export default function GalleryToolbar({
  galleries, images, groupedImages,
  fileFilter, activeFilter, activeGalleryId,
  rawCount, jpgCount, selectedCount, totalHearts, commentCount, hasPassword,
  viewMode, sortBy, watermarkOn,
  albums, activeAlbumId, showAlbumInput, newAlbumName,
  selectedDownloadFiles, allDownloadFiles,
  onSetActiveGalleryId, onSetFileFilter, onSetActiveFilter, onSetActiveAlbumId,
  onSort, onViewMode, onWatermarkToggle, onOpenShare,
  onSetShowAlbumInput, onSetNewAlbumName, onCreateAlbum,
}: GalleryToolbarProps) {

  return (
    <div className="sticky top-0 z-20 px-3 md:px-6 bg-bg-base shadow-sm">
      {/* Row 1: Action buttons (Back + Title now handled by header.tsx via HeaderSlotsContext) */}
      <div className="flex items-center justify-end gap-2 py-3">
        <GallerySortDropdown value={sortBy} onChange={onSort} />
        {/* Grid/List toggle */}
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--color-border-light, #e5e0d8)" }}>
          <button
            onClick={() => onViewMode("grid")}
            className="p-1.5 transition-colors"
            style={{ background: viewMode === "grid" ? "var(--color-primary)" : "transparent", color: viewMode === "grid" ? "#fff" : "var(--color-text-muted)" }}
            title="Dạng lưới"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => onViewMode("list")}
            className="p-1.5 transition-colors"
            style={{ background: viewMode === "list" ? "var(--color-primary)" : "transparent", color: viewMode === "list" ? "#fff" : "var(--color-text-muted)" }}
            title="Dạng danh sách"
          >
            <List size={14} />
          </button>
        </div>
        {/* Watermark toggle */}
        <button
          onClick={onWatermarkToggle}
          className="btn-ghost flex items-center gap-1"
          style={{ padding: "4px 8px", fontSize: "var(--font-size-caption)" }}
          title={watermarkOn ? "Tắt watermark" : "Bật watermark"}
        >
          {watermarkOn ? <EyeOff size={14} className="text-primary" /> : <Eye size={14} />}
          <span className="hidden sm:inline text-caption">WM</span>
        </button>
        <button onClick={onOpenShare} className="btn-ghost flex items-center gap-1.5" style={{ padding: "4px 10px", fontSize: "var(--font-size-caption)" }} title="Chia sẻ">
          <Share2 size={14} />
          <span className="hidden sm:inline">Chia sẻ</span>
        </button>
        <button onClick={onOpenShare} className="btn-ghost" style={{ padding: "4px 8px" }} title={hasPassword ? "Album đã khóa" : "Album không khóa"}>
          {hasPassword ? <Lock size={14} className="text-primary" /> : <Unlock size={14} className="text-text-muted" />}
        </button>
        {selectedDownloadFiles.length > 0 && (
          <DownloadManager files={selectedDownloadFiles} label={`Tải ${selectedDownloadFiles.length} đã chọn`} variant="button" />
        )}
        <DownloadManager files={allDownloadFiles} label="Tải tất cả" variant="button" />
      </div>

      {/* Row 2: Filter bar (clickable stats) */}
      <div className="flex items-center gap-2 pb-2" style={{ fontSize: "var(--font-size-caption)" }}>
        <FilterButton active={activeFilter === "all"} color="var(--color-primary)" bg="rgba(139,94,60,0.1)" onClick={() => onSetActiveFilter("all")}>
          <Camera size={13} /> {images.length} ảnh
        </FilterButton>
        <FilterButton active={activeFilter === "starred"} color="#4CAF50" bg="rgba(76,175,80,0.1)" onClick={() => onSetActiveFilter(activeFilter === "starred" ? "all" : "starred")}>
          <Star size={13} /> {selectedCount} đề xuất
        </FilterButton>
        <FilterButton active={activeFilter === "hearted"} color="#F44336" bg="rgba(244,67,54,0.1)" onClick={() => onSetActiveFilter(activeFilter === "hearted" ? "all" : "hearted")}>
          <Heart size={13} /> {totalHearts} thích
        </FilterButton>
        <FilterButton active={activeFilter === "commented"} color="#2196F3" bg="rgba(33,150,243,0.1)" onClick={() => onSetActiveFilter(activeFilter === "commented" ? "all" : "commented")}>
          <MessageCircle size={13} /> {commentCount} bình luận
        </FilterButton>
        {rawCount > 0 && <span className="ml-2" style={{ color: "var(--color-text-muted)" }}>{rawCount} RAW</span>}
        {jpgCount > 0 && <span style={{ color: "var(--color-text-muted)" }}>{jpgCount} JPG</span>}
      </div>

      {/* Gallery tabs (if multiple galleries) */}
      {galleries.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-2">
          {galleries.map((g) => (
            <button
              key={g.id}
              onClick={() => { onSetActiveGalleryId(g.id); onSetFileFilter("all"); }}
              className={`tab-pill tab-pill-compact ${activeGalleryId === g.id ? "tab-pill-active" : "tab-pill-inactive"}`}
            >
              {FOLDER_LABELS[g.folder_type || ""] || g.title || "Album"}
              <span className="text-caption opacity-60 ml-1">({g.gallery_images?.length || 0})</span>
            </button>
          ))}
        </div>
      )}

      {/* File type filter (JPG/RAW) */}
      {rawCount > 0 && (
        <div className="flex items-center gap-2 pb-2">
          <Filter size={14} className="text-text-muted" />
          {([
            { key: "all" as FileFilter, label: "Tất cả", count: groupedImages.length },
            { key: "jpg" as FileFilter, label: "JPG", count: jpgCount },
            { key: "raw" as FileFilter, label: "RAW", count: rawCount },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSetFileFilter(tab.key)}
              className={`tab-pill tab-pill-compact ${fileFilter === tab.key ? "tab-pill-active" : "tab-pill-inactive"}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {/* Album tabs */}
      {albums.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          <button onClick={() => onSetActiveAlbumId(null)} className={`tab-pill tab-pill-compact ${!activeAlbumId ? "tab-pill-active" : "tab-pill-inactive"}`}>
            Tất cả
          </button>
          {albums.map((a) => (
            <button key={a.id} onClick={() => onSetActiveAlbumId(a.id)} className={`tab-pill tab-pill-compact ${activeAlbumId === a.id ? "tab-pill-active" : "tab-pill-inactive"}`}>
              {a.title}
              <span className="text-caption opacity-60 ml-1">({a.image_count || 0})</span>
            </button>
          ))}
          <AlbumCreateInput show={showAlbumInput} name={newAlbumName} onSetShow={onSetShowAlbumInput} onSetName={onSetNewAlbumName} onCreate={onCreateAlbum} />
        </div>
      )}

      {/* Create first album */}
      {albums.length === 0 && activeGalleryId && (
        <div className="pb-2">
          <AlbumCreateInput show={showAlbumInput} name={newAlbumName} onSetShow={onSetShowAlbumInput} onSetName={onSetNewAlbumName} onCreate={onCreateAlbum} placeholder="Tên album đầu tiên..." />
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────

function FilterButton({ active, color, bg, onClick, children }: {
  active: boolean; color: string; bg: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 transition-all"
      style={{
        borderRadius: "var(--radius-md)", border: "none", cursor: "pointer",
        fontWeight: active ? 600 : 400,
        background: active ? bg : "transparent",
        color: active ? color : "var(--color-text-muted)",
      }}
    >
      {children}
    </button>
  );
}

function AlbumCreateInput({ show, name, onSetShow, onSetName, onCreate, placeholder }: {
  show: boolean; name: string; onSetShow: (s: boolean) => void; onSetName: (n: string) => void; onCreate: () => void; placeholder?: string;
}) {
  if (show) {
    return (
      <div className="flex items-center gap-1 ml-1">
        <input
          value={name}
          onChange={(e) => onSetName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
          placeholder={placeholder || "Tên album..."}
          autoFocus
          className="input-base"
          style={{ padding: "2px 8px", fontSize: "var(--font-size-caption)", width: 140, height: 28 }}
        />
        <button onClick={onCreate} className="btn-ghost" style={{ padding: "2px 6px" }} title="Tạo"><Plus size={14} /></button>
        <button onClick={() => { onSetShow(false); onSetName(""); }} className="btn-ghost" style={{ padding: "2px 6px" }}><X size={14} /></button>
      </div>
    );
  }
  return (
    <button onClick={() => onSetShow(true)} className="tab-pill tab-pill-compact tab-pill-inactive" title="Tạo album mới">
      <Plus size={12} />
    </button>
  );
}
