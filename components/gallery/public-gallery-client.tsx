"use client";
/* eslint-disable */

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { Camera, Image as ImageIcon, Heart, Download } from "lucide-react";
import type { GalleryImage } from "@/types/gallery";
import { getPublicGalleryImagesPaginated, getPublicGalleryStats } from "@/app/actions/gallery-public-actions";
import { toggleImageSelection, updateClientNote } from "@/app/actions/gallery-selection-actions";
import { getReactionCounts, toggleReaction, type ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import { groupByFileGroup } from "@/components/contracts/gallery/gallery-helpers";
import GalleryImageGrid from "@/components/contracts/gallery/gallery-image-grid";
import ImageViewer from "./image-viewer";
import SelectionSummary from "./selection-summary";

// ═══════════════════════════════════════════
// PublicGalleryClient — Khách xem + chọn ảnh
// Landing → Stats + Tabs → Grid → Viewer
// ═══════════════════════════════════════════


interface Gallery {
  id: string;
  title: string | null;
  access_url?: string | null;
  accessToken?: string;
  capability?: "select" | "view" | "download";
  status: string | null;
  selection_deadline: string | null;
  imageCount?: number;
  selectedCount?: number;
  hasMoreImages?: boolean;
  currentPage?: number;
  gallery_images?: GalleryImage[];
}

interface PublicGalleryClientProps {
  gallery: Gallery;
  mode?: "select" | "view";
}



export default function PublicGalleryClient({
  gallery,
  mode = "select",
}: PublicGalleryClientProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<"all" | "selected">("all");
  const isViewOnly = mode === "view";
  const accessUrl = gallery.access_url || "";
  const accessToken = gallery.accessToken || "";

  // Decode capability from token
  let clientCapability = gallery.capability || "select";
  if (accessToken && accessToken !== "admin") {
    try {
      const [bodyPart] = accessToken.split(".");
      const payload = JSON.parse(atob(bodyPart.replace(/-/g, "+").replace(/_/g, "/")));
      clientCapability = payload.capability || "select";
    } catch {}
  }

  const showAlbumDownload = accessToken && clientCapability !== "view";

  // Client identifier for anonymous reactions
  const getClientId = useCallback(() => {
    if (typeof window === "undefined") return "guest";
    let id = localStorage.getItem("mood_client_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("mood_client_id", id); }
    return id;
  }, []);

  // SWR: Reaction Counts
  const { data: reactionCounts = {} } = useSWR<ReactionCounts>(
    gallery.id ? `gallery-reactions-${gallery.id}` : null,
    () => getReactionCounts(gallery.id),
    { fallbackData: {} }
  );

  // SWR: Gallery Stats (selectedCount, imageCount)
  const { data: stats, mutate: mutateStats } = useSWR(
    gallery.id ? `gallery-stats-${gallery.id}` : null,
    () => getPublicGalleryStats(gallery.id),
    { fallbackData: { selectedCount: gallery.selectedCount || 0, imageCount: gallery.imageCount || (gallery.gallery_images?.length || 0) } }
  );

  const selectedCount = stats?.selectedCount || 0;
  const totalImageCount = stats?.imageCount || 0;
  const totalLikes = Object.values(reactionCounts).reduce((sum, c) => sum + c.hearts, 0);

  // ─── SWR Infinite: Gallery Images ─────────
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null; // reached the end
    return `gallery-${gallery.id}-images-page-${pageIndex}`; // SWR key
  };

  const fetchImagesPage = async (key: string) => {
    const pageStr = key.split('page-')[1];
    const pageIndex = parseInt(pageStr, 10);
    const res = await getPublicGalleryImagesPaginated(
      gallery.id,
      accessToken,
      pageIndex,
      undefined,
      accessUrl
    );
    if (!res.success || !res.data) throw new Error("Failed to load");
    return res.data;
  };

  const { data: pagesData, size, setSize, isValidating, mutate: mutatePages } = useSWRInfinite(
    getKey,
    fetchImagesPage,
    {
      fallbackData: [{
        images: gallery.gallery_images || [],
        page: gallery.currentPage || 0,
        hasMore: gallery.hasMoreImages || false,
        totalCount: gallery.imageCount || 0
      }],
      revalidateFirstPage: false,
    }
  );

  const images = useMemo(() => {
    if (!pagesData) return gallery.gallery_images || [];
    return pagesData.flatMap(page => page.images) as GalleryImage[];
  }, [pagesData, gallery.gallery_images]);

  const hasMoreImages = pagesData ? pagesData[pagesData.length - 1].hasMore : false;
  // isValidating is true during any request, but we only want to show 'loading more' if we are fetching the next page
  const loadingMoreImages = isValidating && pagesData && pagesData.length === size;

  const loadMoreServerImages = useCallback(() => {
    if (hasMoreImages && !isValidating) {
      setSize(size + 1);
    }
  }, [hasMoreImages, isValidating, size, setSize]);

  // ─── Filtered + visible images ──────────────
  const filteredImages = useMemo(
    () => activeGroup === "selected" ? images.filter((i) => i.is_selected) : images,
    [images, activeGroup],
  );

  const groups = useMemo(() => groupByFileGroup(filteredImages), [filteredImages]);
  const displayImages = useMemo(() => groups.map((g) => g.displayImage), [groups]);

  // ─── Toggle star (selection) ──────────────────
  const handleToggleStar = useCallback(
    async (imageId: string, _currentSelected?: boolean) => {
      if (isViewOnly) return;
      const img = images.find((i) => i.id === imageId);
      if (!img) return;

      const newSelected = !img.is_selected;
      
      // Update array optimistically
      mutatePages((currentPages) => {
        if (!currentPages) return currentPages;
        return currentPages.map(page => ({
          ...page,
          images: page.images.map((img: GalleryImage) =>
            img.id === imageId ? { ...img, is_selected: newSelected, selected_at: newSelected ? new Date().toISOString() : null } : img
          )
        }));
      }, false);

      setTogglingIds((prev) => new Set(prev).add(imageId));
      
      // SWR Optimistic UI Update for selectedCount
      const optimisticSelectedCount = newSelected ? selectedCount + 1 : Math.max(0, selectedCount - 1);
      mutateStats((prev) => ({ imageCount: totalImageCount, ...prev, selectedCount: optimisticSelectedCount }), false);

      const res = await toggleImageSelection(
        imageId,
        newSelected,
        accessUrl,
        accessToken,
      );
      
      if (!res.success) {
        // Rollback on error
        mutatePages((currentPages) => {
          if (!currentPages) return currentPages;
          return currentPages.map(page => ({
            ...page,
            images: page.images.map((img: GalleryImage) =>
              img.id === imageId ? { ...img, is_selected: !newSelected, selected_at: !newSelected ? new Date().toISOString() : null } : img
            )
          }));
        }, false);
        mutateStats((prev) => ({ imageCount: totalImageCount, ...prev, selectedCount: selectedCount }), false);
      } else if (res.newSelectedCount !== undefined) {
        // Sync with exact server count
        mutateStats((prev) => ({ imageCount: totalImageCount, ...prev, selectedCount: res.newSelectedCount }), false);
      }
      
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(imageId); return next; });
    },
    [accessToken, accessUrl, images, isViewOnly, selectedCount, totalImageCount, mutateStats],
  );



  // ─── Save note ─────────────────────────────
  const handleSaveNote = useCallback(
    async (imageId: string, note: string) => {
      const previousNote = images.find((i) => i.id === imageId)?.client_note || null;
      
      mutatePages((currentPages) => {
        if (!currentPages) return currentPages;
        return currentPages.map(page => ({
          ...page,
          images: page.images.map((img: GalleryImage) =>
            img.id === imageId ? { ...img, client_note: note || null } : img
          )
        }));
      }, false);

      const res = await updateClientNote(imageId, note, accessUrl, accessToken);
      
      if (!res.success) {
        mutatePages((currentPages) => {
          if (!currentPages) return currentPages;
          return currentPages.map(page => ({
            ...page,
            images: page.images.map((img: GalleryImage) =>
              img.id === imageId ? { ...img, client_note: previousNote } : img
            )
          }));
        }, false);
      }
    },
    [accessToken, accessUrl, images, mutatePages],
  );

  // ═════════════════════════════════════════
  // GALLERY VIEW
  // ═════════════════════════════════════════
  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--color-bg-base)" }}>
      {/* ── Sticky Header + Stats + Tabs ── */}
      <div className="sticky top-0 z-30 bg-bg-base/95 backdrop-blur-md">
        {/* Top Row: Title & Stats */}
        <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-primary opacity-70" />
            <h1 className="text-base font-semibold tracking-tight truncate max-w-[200px] md:max-w-[400px] text-text-primary">
              {gallery.title || "Album ảnh"}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-text-secondary">
            <span className="flex items-center gap-1.5"><ImageIcon size={14} className="opacity-60" /> {totalImageCount}</span>
            <span className="flex items-center gap-1.5 text-[#ff3b30]"><Heart size={14} className="fill-[#ff3b30]" /> {selectedCount}</span>
            {showAlbumDownload && (
              <a
                href={`/api/gallery-download-batch/${accessToken}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-text-inverse hover:opacity-90 transition-opacity"
              >
                <Download size={12} />
                <span>Tải album (ZIP)</span>
              </a>
            )}
          </div>
        </div>
        
        {/* Bottom Row: Tabs */}
        {!isViewOnly && (
          <div className="w-full max-w-[1600px] mx-auto px-4 flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setActiveGroup("all")}
              className={`py-3 relative transition-colors ${activeGroup === "all" ? "text-primary" : "text-text-muted hover:text-text-primary"}`}
            >
              TẤT CẢ
              {activeGroup === "all" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveGroup("selected")}
              className={`py-3 relative transition-colors flex items-center gap-1.5 ${activeGroup === "selected" ? "text-[#ff3b30]" : "text-text-muted hover:text-text-primary"}`}
            >
              ĐÃ CHỌN
              {activeGroup === "selected" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff3b30] rounded-t-full" />}
            </button>
          </div>
        )}
      </div>



      {/* ── Photo Grid ── */}
      <div className="w-full max-w-[1600px] mx-auto pb-10">
        <GalleryImageGrid
          groups={groups}
          onImageClick={(idx: number) => setViewerIndex(idx)}
          reactionCounts={reactionCounts}
          onToggleStar={isViewOnly ? undefined : (id: string, sel: boolean) => handleToggleStar(id, sel)}
          onLoadMore={loadMoreServerImages}
          loadingMore={loadingMoreImages}
          hasMore={hasMoreImages}
          publicMode={true}
        />
      </div>

      {/* ── Lightbox viewer ── */}
      {viewerIndex !== null && (
        <ImageViewer
          images={displayImages}
          currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
          onToggleStar={(id: string) => handleToggleStar(id)}
          onSaveNote={handleSaveNote}
          mode={mode}
          accessToken={accessToken}
          totalImagesCount={activeGroup === "all" ? totalImageCount : selectedCount}
        />
      )}

      {/* ── Bottom bar ── */}
      {!isViewOnly && (
        <SelectionSummary
          selectedCount={selectedCount}
          totalCount={totalImageCount}
          selectedImages={images.filter((i) => i.is_selected)}
          accessToken={accessToken}
        />
      )}
    </div>
  );
}
