"use client";
/* eslint-disable */

import { useState, useCallback, useMemo, useEffect } from "react";
import { Camera, Image as ImageIcon, Heart } from "lucide-react";
import type { GalleryImage } from "@/types/gallery";
import {
  getPublicGalleryImagesPaginated,
  toggleImageSelection,
  updateClientNote,
} from "@/app/actions/gallery-actions";
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
  const [images, setImages] = useState<GalleryImage[]>(
    gallery.gallery_images || [],
  );
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<"all" | "selected">("all");
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [currentPage, setCurrentPage] = useState(gallery.currentPage || 0);
  const [hasMoreImages, setHasMoreImages] = useState(Boolean(gallery.hasMoreImages));
  const [totalImageCount, setTotalImageCount] = useState(gallery.imageCount || (gallery.gallery_images?.length || 0));
  const [loadingMoreImages, setLoadingMoreImages] = useState(false);
  const isViewOnly = mode === "view";
  const accessUrl = gallery.access_url || "";
  const accessToken = gallery.accessToken || "";

  // Client identifier for anonymous reactions
  const getClientId = useCallback(() => {
    if (typeof window === "undefined") return "guest";
    let id = localStorage.getItem("mood_client_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("mood_client_id", id); }
    return id;
  }, []);

  // Load reaction counts
  useEffect(() => {
    void getReactionCounts(gallery.id).then(setReactionCounts);
  }, [gallery.id]);

  const selectedCount = images.filter((img) => img.is_selected).length;
  const totalLikes = Object.values(reactionCounts).reduce((sum, c) => sum + c.hearts, 0);

  // ─── Filtered + visible images ──────────────
  const filteredImages = useMemo(
    () => activeGroup === "selected" ? images.filter((i) => i.is_selected) : images,
    [images, activeGroup],
  );

  const groups = useMemo(() => groupByFileGroup(filteredImages), [filteredImages]);
  const displayImages = useMemo(() => groups.map((g) => g.displayImage), [groups]);

  const loadMoreServerImages = useCallback(async () => {
    if (!hasMoreImages || loadingMoreImages || !accessToken) return;

    setLoadingMoreImages(true);
    const nextPage = currentPage + 1;
    const res = await getPublicGalleryImagesPaginated(
      gallery.id,
      accessToken,
      nextPage,
      undefined,
      accessUrl,
    );

    if (res.success && res.data) {
      setImages((prev) => {
        const seen = new Set(prev.map((img) => img.id));
        const nextImages = (res.data.images as GalleryImage[])
          .filter((img) => !seen.has(img.id));
        return [...prev, ...nextImages];
      });
      setCurrentPage(res.data.page);
      setHasMoreImages(res.data.hasMore);
      setTotalImageCount(res.data.totalCount);
    }

    setLoadingMoreImages(false);
  }, [accessToken, accessUrl, currentPage, gallery.id, hasMoreImages, loadingMoreImages]);

  // ─── Toggle star (selection) ──────────────────
  const handleToggleStar = useCallback(
    async (imageId: string, _currentSelected?: boolean) => {
      if (isViewOnly) return;
      const img = images.find((i) => i.id === imageId);
      if (!img) return;

      const newSelected = !img.is_selected;
      setImages((prev) =>
        prev.map((i) =>
          i.id === imageId ? { ...i, is_selected: newSelected, selected_at: newSelected ? new Date().toISOString() : null } : i,
        ),
      );
      setTogglingIds((prev) => new Set(prev).add(imageId));
      const res = await toggleImageSelection(
        imageId,
        newSelected,
        accessUrl,
        accessToken,
      );
      if (!res.success) {
        setImages((prev) =>
          prev.map((i) =>
            i.id === imageId ? { ...i, is_selected: !newSelected, selected_at: !newSelected ? new Date().toISOString() : null } : i,
          ),
        );
      }
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(imageId); return next; });
    },
    [accessToken, accessUrl, images, isViewOnly],
  );



  // ─── Save note ─────────────────────────────
  const handleSaveNote = useCallback(
    async (imageId: string, note: string) => {
      const previousNote = images.find((i) => i.id === imageId)?.client_note || null;
      setImages((prev) => prev.map((i) => i.id === imageId ? { ...i, client_note: note || null } : i));
      const res = await updateClientNote(imageId, note, accessUrl, accessToken);
      if (!res.success) {
        setImages((prev) => prev.map((i) => i.id === imageId ? { ...i, client_note: previousNote } : i));
      }
    },
    [accessToken, accessUrl, images],
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
        <ImageViewer images={displayImages} currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)} onIndexChange={setViewerIndex}
          onToggleStar={(id: string) => handleToggleStar(id)} onSaveNote={handleSaveNote} mode={mode} />
      )}

      {/* ── Bottom bar ── */}
      {!isViewOnly && (
        <SelectionSummary selectedCount={selectedCount} totalCount={totalImageCount}
          selectedImages={images.filter((i) => i.is_selected)} />
      )}
    </div>
  );
}
