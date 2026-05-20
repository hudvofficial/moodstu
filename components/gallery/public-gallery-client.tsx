"use client";
/* eslint-disable */

import { useState, useCallback, useMemo, useEffect } from "react";
import { Star, Camera, ThumbsUp, Sparkles, ChevronRight, Image as ImageIcon } from "lucide-react";
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
  const [showLanding, setShowLanding] = useState(true);
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

  // Like reaction toggle (separate from selection)
  const handleToggleLike = useCallback(
    async (imageId: string) => {
      if (isViewOnly) return;
      const clientId = getClientId();
      const result = await toggleReaction(imageId, gallery.id, "heart", clientId);
      if (result.success) {
        setReactionCounts((prev) => {
          const updated = { ...prev };
          if (!updated[imageId]) updated[imageId] = { hearts: 0, stars: 0 };
          updated[imageId] = {
            ...updated[imageId],
            hearts: result.action === "added" ? updated[imageId].hearts + 1 : Math.max(0, updated[imageId].hearts - 1),
          };
          return updated;
        });
      }
    },
    [gallery.id, getClientId, isViewOnly],
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
  // LANDING SCREEN
  // ═════════════════════════════════════════
  if (showLanding) {
    const coverImage = images[0];
    return (
      <div className="min-h-screen flex flex-col justify-end relative overflow-hidden bg-black text-white">
        {coverImage && (
          <>
            <div 
              className="absolute inset-0" 
              style={{
                backgroundImage: `url(${coverImage.thumbnail_url?.replace(/sz=s\d+/, "sz=s1600") || coverImage.image_url})`,
                backgroundSize: "cover", 
                backgroundPosition: "center 30%",
                animation: "kenburns 20s infinite alternate ease-in-out"
              }} 
            />
            {/* Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </>
        )}
        
        <div className="relative z-10 px-6 pb-16 w-full max-w-5xl mx-auto flex flex-col items-center text-center">
          <Sparkles size={24} className="mb-6 opacity-80" />
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight text-balance" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
            {gallery.title || "Album ảnh"}
          </h1>
          
          <p className="text-white/80 text-sm md:text-base font-medium mb-10 tracking-widest uppercase">
            {totalImageCount} Ảnh • Mood Studio
          </p>
          
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowLanding(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setShowLanding(false); }}
            className="group relative px-8 py-4 rounded-full font-semibold text-sm transition-all duration-300 cursor-pointer inline-flex items-center justify-center overflow-hidden bg-white hover:scale-105 active:scale-95"
            style={{ color: '#000000' }}
          >
            <span className="relative z-10 flex items-center gap-2" style={{ color: '#000000' }}>
              Xem Album
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
        
        <style>{`
          @keyframes kenburns {
            0% { transform: scale(1); }
            100% { transform: scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  // ═════════════════════════════════════════
  // GALLERY VIEW
  // ═════════════════════════════════════════
  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--color-bg-base)" }}>
      {/* ── Sticky Header + Stats ── */}
      <div className="sticky top-0 z-30 backdrop-blur-xl px-4 py-4 bg-bg-base/80 border-b border-black/5 transition-all duration-300">
        <div className="w-full max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={20} style={{ color: "var(--color-primary)" }} />
            <h1 className="text-base font-semibold tracking-tight truncate" style={{ color: "var(--color-text-primary)", maxWidth: "300px" }}>
              {gallery.title || "Album ảnh"}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            <span className="flex items-center gap-1.5 opacity-80"><ImageIcon size={14} /> {totalImageCount} ảnh</span>
            {!isViewOnly && selectedCount > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveGroup((prev) => prev === "selected" ? "all" : "selected")}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveGroup((prev) => prev === "selected" ? "all" : "selected") }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer hover:bg-black/5"
                style={{
                  color: activeGroup === "selected" ? "var(--color-primary)" : "inherit",
                  fontWeight: activeGroup === "selected" ? 600 : 500,
                  background: activeGroup === "selected" ? "var(--color-primary-light, rgba(0,0,0,0.05))" : "transparent"
                }}
              >
                <Star size={14} fill={activeGroup === "selected" ? "currentColor" : "none"} /> {selectedCount} đã chọn
              </div>
            )}
            {totalLikes > 0 && <span className="flex items-center gap-1.5 opacity-80"><ThumbsUp size={14} /> {totalLikes}</span>}
          </div>
        </div>
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
