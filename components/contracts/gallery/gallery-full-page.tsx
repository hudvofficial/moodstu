"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { reorderImages } from "@/app/actions/gallery-actions";
import GalleryImageGrid from "./gallery-image-grid";
import GalleryImageList from "./gallery-image-list";
import GalleryLightbox from "./gallery-lightbox";
import GalleryToolbar from "./gallery-toolbar";
import { useModal } from "@/lib/context/modal-context";
import { ShareGalleryModalContent } from "./share-gallery-modal";
import { useGalleryData } from "./use-gallery-data";
import { useSetHeaderSlots } from "@/contexts/header-slots-context";
import { FOLDER_LABELS } from "./gallery-helpers";

// ═══════════════════════════════════════════
// GalleryFullPage — Grid view of all images in a gallery
// Responsive: 3 cols desktop, 2 cols mobile
// ═══════════════════════════════════════════

interface GalleryFullPageProps {
  contractId: string;
  galleryId: string | null;
  folderType: string | null;
}

export default function GalleryFullPage({ contractId, galleryId, folderType }: GalleryFullPageProps) {
  const {
    galleries, loading, activeGalleryId, fileFilter, sortBy, reactionCounts, commentCount,
    activeFilter, albums, activeAlbumId, viewMode, newAlbumName, showAlbumInput, watermarkOn,
    activeGallery, images, groupedImages, filteredGroups, displayImages,
    rawCount, jpgCount, selectedCount, hasPassword, totalHearts,
    allDownloadFiles, selectedDownloadFiles,
    hasMoreImages, loadingMore, loadMoreImages,
    setActiveGalleryId, setFileFilter, setActiveFilter, setActiveAlbumId,
    setNewAlbumName, setShowAlbumInput,
    handleSort, handleViewMode, handleWatermarkToggle, handleCreateAlbum, handleToggleStar,
  } = useGalleryData(contractId, galleryId, folderType);

  // ── Set header slots for gallery ──
  const setHeaderSlots = useSetHeaderSlots();
  const galleryTitle = activeGallery
    ? (FOLDER_LABELS[activeGallery.folder_type || ""] || activeGallery.title || "Gallery")
    : "Gallery";

  useEffect(() => {
    setHeaderSlots({
      leftSlot: (
        <Link href={`/contracts/${contractId}`} className="lg:hidden btn-icon shrink-0">
          <ArrowLeft size={20} />
        </Link>
      ),
      titleOverride: galleryTitle,
      hideSearch: true,
    });
    return () => setHeaderSlots({});
  }, [setHeaderSlots, contractId, galleryTitle]);

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const { openModal } = useModal();

  // Share modal handler
  const handleOpenShare = () => {
    if (!activeGallery?.access_url) return;
    openModal("SHARE_GALLERY", {
      title: "Chia sẻ album",
      content: (
        <ShareGalleryModalContent
          accessUrl={activeGallery.access_url}
          galleryId={activeGallery.id}
          galleryTitle={activeGallery.title || "Album"}
          hasPassword={hasPassword}
        />
      ),
    });
  };

  // Reorder handler for drag & drop
  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    const newGroups = [...filteredGroups];
    const [moved] = newGroups.splice(fromIdx, 1);
    newGroups.splice(toIdx, 0, moved);
    const orderedIds = newGroups.map((g) => g.displayImage.id);
    void reorderImages(orderedIds);
  }, [filteredGroups]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* ── Sticky Header Block ── */}
      <GalleryToolbar
        galleries={galleries}
        images={images}
        groupedImages={groupedImages}
        fileFilter={fileFilter}
        activeFilter={activeFilter}
        activeGalleryId={activeGalleryId}
        rawCount={rawCount}
        jpgCount={jpgCount}
        selectedCount={selectedCount}
        totalHearts={totalHearts}
        commentCount={commentCount}
        hasPassword={hasPassword}
        viewMode={viewMode}
        sortBy={sortBy}
        watermarkOn={watermarkOn}
        albums={albums}
        activeAlbumId={activeAlbumId}
        showAlbumInput={showAlbumInput}
        newAlbumName={newAlbumName}
        selectedDownloadFiles={selectedDownloadFiles}
        allDownloadFiles={allDownloadFiles}
        onSetActiveGalleryId={(id) => { setActiveGalleryId(id); setFileFilter("all"); }}
        onSetFileFilter={setFileFilter}
        onSetActiveFilter={setActiveFilter}
        onSetActiveAlbumId={setActiveAlbumId}
        onSort={handleSort}
        onViewMode={handleViewMode}
        onWatermarkToggle={handleWatermarkToggle}
        onOpenShare={handleOpenShare}
        onSetShowAlbumInput={setShowAlbumInput}
        onSetNewAlbumName={setNewAlbumName}
        onCreateAlbum={handleCreateAlbum}
      />

      {/* ── Image Grid or List ── */}
      {viewMode === "list" ? (
        <GalleryImageList
          groups={filteredGroups}
          onImageClick={(idx: number) => setLightboxIdx(idx)}
          reactionCounts={reactionCounts}
          onToggleStar={handleToggleStar}
          watermarkEnabled={watermarkOn}
        />
      ) : (
        <GalleryImageGrid
          groups={filteredGroups}
          onImageClick={(idx: number) => setLightboxIdx(idx)}
          reactionCounts={reactionCounts}
          onToggleStar={handleToggleStar}
          watermarkEnabled={watermarkOn}
          draggable
          onReorder={handleReorder}
          onLoadMore={loadMoreImages}
          loadingMore={loadingMore}
          hasMore={hasMoreImages}
        />
      )}

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && displayImages[lightboxIdx] && (
        <GalleryLightbox
          images={displayImages}
          currentIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx(lightboxIdx - 1)}
          onNext={() => setLightboxIdx(lightboxIdx + 1)}
        />
      )}
    </div>
  );
}
