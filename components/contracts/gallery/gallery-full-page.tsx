"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { updateGallerySettings } from "@/app/actions/gallery-admin-actions";
import { reorderImages } from "@/app/actions/gallery-selection-actions";
import type { GallerySettingsPayload } from "@/app/actions/gallery-core";
import { toast } from "sonner";
import GalleryImageGrid from "./gallery-image-grid"; // Using CSS Grid version (works better)
import GalleryImageList from "./gallery-image-list";
import GalleryLightbox from "./gallery-lightbox";
import GalleryToolbar from "./gallery-toolbar";
import GalleryFilterModal from "./gallery-filter-modal";
import { GalleryListModal } from "./gallery-list-modal";
import { GallerySettingsModal } from "./gallery-settings-modal";
import { useModal } from "@/lib/context/modal-context";
import { useGalleryData } from "./use-gallery-data";
import { useSetHeaderSlots } from "@/contexts/header-slots-context";
import { FOLDER_LABELS } from "./gallery-helpers";
import { useNetworkQuality } from "@/hooks/use-network-quality";
import type { GallerySummary } from "@/types/gallery";
import type { GalleryDataV2Result } from "@/app/actions/gallery-composite-actions";

// ------------------------------------------------------------
// GalleryFullPage - Grid view of all images in a gallery
// Responsive: 3 cols desktop, 2 cols mobile
// ------------------------------------------------------------

interface GalleryFullPageProps {
  contractId: string;
  galleryId: string | null;
  folderType: string | null;
  initialGalleries?: GallerySummary[];
  initialGalleryData?: GalleryDataV2Result;
}

export default function GalleryFullPage({
  contractId,
  galleryId,
  folderType,
  initialGalleries,
  initialGalleryData,
}: GalleryFullPageProps) {
  const {
    galleries, loading, activeGalleryId, fileFilter, sortBy, reactionCounts, commentCount,
    commentCountsPerImage, commentsPerImage, activeFilter, albums, activeAlbumId, viewMode, newAlbumName, showAlbumInput, watermarkOn,
    activeGallery, images, groupedImages, filteredGroups, displayImages,
    rawCount, jpgCount, selectedCount, starredCount, hasPassword, totalHearts,
    allDownloadFiles, selectedDownloadFiles, totalImageCount,
    hasMoreImages, loadingMore, loadMoreImages,
    fetchAllSelectedDownloadFiles, fetchAllHeartedDownloadFiles, fetchAllDownloadFiles,
    setActiveGalleryId, setFileFilter, setActiveFilter, setActiveAlbumId,
    setNewAlbumName, setShowAlbumInput,
    handleSort, handleViewMode, handleWatermarkToggle, handleCreateAlbum, handleToggleStar,
    patchGalleryShareDetails,
  } = useGalleryData(contractId, galleryId, folderType, {
    galleries: initialGalleries,
    galleryData: initialGalleryData,
    galleryDataFor: galleryId,
  });

    // Set header slots for gallery
  const setHeaderSlots = useSetHeaderSlots();
  const galleryTitle = activeGallery
    ? (FOLDER_LABELS[activeGallery.folder_type || ""] || activeGallery.title || "Gallery")
    : "Gallery";

  useEffect(() => {
    setHeaderSlots({
      hideSearch: true,
      hideHeader: true, // Completely hide global header on gallery page
    });
    return () => setHeaderSlots({});
  }, [setHeaderSlots, contractId]);

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"drive" | "local" | "export">("local");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { openModal } = useModal();
  const [fullSelectedJpgNames, setFullSelectedJpgNames] = useState<string[]>([]);

  // Share modal handler
  const handleOpenShare = () => {
    if (!activeGallery?.id) return; // Only require galleryId, modal will generate access_url if missing
    openModal("SHARE_GALLERY", {
      accessUrl: activeGallery.access_url,
      customSlug: activeGallery.custom_slug,
      galleryId: activeGallery.id,
      galleryTitle: activeGallery.title || "Album",
      hasPassword,
      shareLinks: activeGallery.shareLinks,
      status: activeGallery.status,
      onSharePrepared: patchGalleryShareDetails,
    });
  };

  // Drive copy is now handled entirely inside GalleryFilterModal to support chunking

  const handleOpenFilterModal = async (tab?: "drive" | "local" | "export") => {
    if (tab) setFilterTab(tab);
    setIsFilterModalOpen(true);
    
    // Fetch full list of hearted JPGs directly from DB to bypass pagination limits
    try {
      const files = await fetchAllHeartedDownloadFiles();
      const jpgNames = files
        .filter((f: { fileName: string }) => f.fileName && /\.(jpe?g)$/i.test(f.fileName))
        .map((f: { fileName: string }) => f.fileName);
      setFullSelectedJpgNames(jpgNames);
    } catch (e) {
      console.error("Lỗi lấy danh sách JPG tim", e);
    }
  };

  // Reorder handler for drag & drop
  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    const newGroups = [...filteredGroups];
    const [moved] = newGroups.splice(fromIdx, 1);
    newGroups.splice(toIdx, 0, moved);
    const orderedIds = newGroups.map((g) => g.displayImage.id);
    void reorderImages(orderedIds);
  }, [filteredGroups]);
  const reorderEnabled = viewMode === "list"
    && sortBy === "manual"
    && fileFilter === "all"
    && activeFilter === "all"
    && activeAlbumId === null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Sticky header block */}
      <GalleryToolbar
        contractId={contractId}
        galleryTitle={galleryTitle}
        breadcrumbItems={[
          { label: "Hợp đồng", href: "/contracts" },
          { label: "Chi tiết", href: `/contracts/${contractId}` },
          { label: galleryTitle },
        ]}
        galleries={galleries}
        images={images}
        groupedImages={groupedImages}
        fileFilter={fileFilter}
        activeFilter={activeFilter}
        activeGalleryId={activeGalleryId}
        galleryStatus={activeGallery?.status || "draft"}
        galleryAccessUrl={activeGallery?.access_url}
        rawCount={rawCount}
        jpgCount={jpgCount}
        selectedCount={selectedCount}
        starredCount={starredCount}
        totalImageCount={totalImageCount}
        totalHearts={totalHearts}
        commentCount={commentCount}
        viewMode={viewMode}
        sortBy={sortBy}
        watermarkOn={watermarkOn}
        albums={albums}
        activeAlbumId={activeAlbumId}
        showAlbumInput={showAlbumInput}
        newAlbumName={newAlbumName}
        selectedDownloadFiles={selectedDownloadFiles}
        allDownloadFiles={allDownloadFiles}
        fetchAllSelectedDownloadFiles={fetchAllSelectedDownloadFiles}
        fetchAllDownloadFiles={fetchAllDownloadFiles}
        onSetActiveGalleryId={(id) => { setActiveGalleryId(id); setFileFilter("all"); }}
        onSetFileFilter={setFileFilter}
        onSetActiveFilter={setActiveFilter}
        onSetActiveAlbumId={setActiveAlbumId}
        onSort={handleSort}
        onViewMode={handleViewMode}
        onWatermarkToggle={handleWatermarkToggle}
        onOpenShare={handleOpenShare}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSetShowAlbumInput={setShowAlbumInput}
        onSetNewAlbumName={setNewAlbumName}
        onCreateAlbum={handleCreateAlbum}
        onOpenFilterModal={handleOpenFilterModal}
        onOpenListModal={() => setIsListModalOpen(true)}
      />

      <GalleryFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        selectedJpgNames={fullSelectedJpgNames}
        contractId={contractId}
        galleryId={activeGalleryId}
        defaultTab={filterTab}
      />

      <GalleryListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        images={images}
        contractCode={contractId}
        reactionCounts={reactionCounts}
        commentCountsPerImage={commentCountsPerImage}
      />

      {/* Settings modal */}
      {activeGallery && (
        <GallerySettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          gallery={activeGallery}
          onSave={async (settings) => {
            const result = await updateGallerySettings(activeGallery.id, settings as GallerySettingsPayload);
            if (!result.success) {
              throw new Error(result.error || "Lỗi cập nhật cài đặt");
            }
            toast.success("Đã lưu cài đặt album");
          }}
        />
      )}


      {/* Image grid or list */}
      {viewMode === "list" ? (
        <GalleryImageList
          groups={filteredGroups}
          onImageClick={(idx: number) => setLightboxIdx(idx)}
          reactionCounts={reactionCounts}
          onToggleStar={handleToggleStar}
          watermarkEnabled={watermarkOn}
          draggable={reorderEnabled}
          onReorder={reorderEnabled ? handleReorder : undefined}
        />
      ) : (
        <GalleryImageGrid
          groups={filteredGroups}
          onImageClick={(idx: number) => setLightboxIdx(idx)}
          reactionCounts={reactionCounts}
          commentsPerImage={commentsPerImage}
          showClientNote
          onToggleStar={handleToggleStar}
          watermarkEnabled={watermarkOn}
          onLoadMore={loadMoreImages}
          loadingMore={loadingMore}
          hasMore={hasMoreImages}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && displayImages[lightboxIdx] && (
        <GalleryLightbox
          images={displayImages}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          galleryId={activeGallery?.id}
          coverImageId={activeGallery?.cover_image_id}
          commentsPerImage={commentsPerImage}
        />
      )}
    </div>
  );
}
