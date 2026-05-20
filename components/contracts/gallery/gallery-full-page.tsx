"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { reorderImages } from "@/app/actions/gallery-actions";
import { copySelectedJpgToDrive } from "@/app/actions/gallery-drive-actions";
import { toast } from "sonner";
import GalleryImageGrid from "./gallery-image-grid";
import GalleryImageList from "./gallery-image-list";
import GalleryLightbox from "./gallery-lightbox";
import GalleryToolbar from "./gallery-toolbar";
import GalleryFilterModal from "./gallery-filter-modal";
import { GalleryListModal } from "./gallery-list-modal";
import { useModal } from "@/lib/context/modal-context";
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
    commentCountsPerImage, activeFilter, albums, activeAlbumId, viewMode, newAlbumName, showAlbumInput, watermarkOn,
    activeGallery, images, groupedImages, filteredGroups, displayImages,
    rawCount, jpgCount, selectedCount, hasPassword, totalHearts,
    allDownloadFiles, selectedDownloadFiles, totalImageCount,
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
      hideSearch: true,
    });
    return () => setHeaderSlots({});
  }, [setHeaderSlots, contractId]);

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"drive" | "local" | "export">("local");
  const { openModal } = useModal();

  // Share modal handler
  const handleOpenShare = () => {
    if (!activeGallery?.access_url) return;
    openModal("SHARE_GALLERY", {
      accessUrl: activeGallery.access_url,
      galleryId: activeGallery.id,
      galleryTitle: activeGallery.title || "Album",
      hasPassword,
    });
  };

  const handleCopySelectedJpg = async () => {
    if (!activeGalleryId) return;
    const toastId = toast.loading("Đang tạo thư mục và copy ảnh...");
    try {
      // Temporary solution: Use contractId if contractCode is not immediately available.
      // Wait, copySelectedJpgToDrive requires contractCode. Let's just pass contractId for now,
      // and we can fetch contract_code inside copySelectedJpgToDrive using contractId!
      const res = await copySelectedJpgToDrive(activeGalleryId, contractId);
      if ("error" in res) {
        toast.error(res.error, { id: toastId });
      } else if (!res.data.success || "error" in res.data) {
        toast.error((res.data as any).error || "Lỗi không xác định", { id: toastId });
      } else {
        const successCount = res.data.successCount ?? 0;
        const failedCount = res.data.failedCount ?? 0;
        toast.success(`Đã copy ${successCount} ảnh thành công! ${failedCount > 0 ? `(Lỗi ${failedCount} ảnh)` : ""}`, { id: toastId });
      }
    } catch (e: any) {
      toast.error(e.message || "Đã xảy ra lỗi", { id: toastId });
    }
  };

  const selectedJpgNames = useMemo(() => {
    return images
      .filter((img) => img.is_selected && img.file_name && /\.(jpe?g)$/i.test(img.file_name))
      .map((img) => img.file_name as string);
  }, [images]);

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
      {/* ── Sticky Header Block ── */}
      <GalleryToolbar
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
        onOpenFilterModal={(tab) => {
          if (tab) setFilterTab(tab);
          setIsFilterModalOpen(true);
        }}
        onOpenListModal={() => setIsListModalOpen(true)}
      />

      <GalleryFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        selectedJpgNames={selectedJpgNames}
        onCopyDrive={handleCopySelectedJpg}
        contractCode={contractId} // fallback to ID
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

      {/* ── Image Grid or List ── */}
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
          onToggleStar={handleToggleStar}
          watermarkEnabled={watermarkOn}
          onLoadMore={loadMoreImages}
          loadingMore={loadingMore}
          hasMore={hasMoreImages}
        />
      )}

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && displayImages[lightboxIdx] && (
        <GalleryLightbox
          images={displayImages}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  );
}
