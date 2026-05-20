"use client";
/* eslint-disable */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Star, Camera, Download, ThumbsUp, Sparkles, ChevronRight } from "lucide-react";
import {
  getPublicGalleryImagesPaginated,
  toggleImageSelection,
  updateClientNote,
} from "@/app/actions/gallery-actions";
import { getReactionCounts, toggleReaction, type ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import ImageViewer from "./image-viewer";
import SelectionSummary from "./selection-summary";

// ═══════════════════════════════════════════
// PublicGalleryClient — Khách xem + chọn ảnh
// Landing → Stats + Tabs → Grid → Viewer
// ═══════════════════════════════════════════

interface GalleryImage {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_selected: boolean;
  client_note: string | null;
  file_name: string | null;
  selected_at: string | null;
  drive_file_id: string | null;
  file_group: string | null;
}

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

const BATCH_SIZE = 50;

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
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
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

  const visibleImages = useMemo(
    () => filteredImages.slice(0, visibleCount),
    [filteredImages, visibleCount],
  );

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
  }, [accessToken, currentPage, gallery.id, hasMoreImages, loadingMoreImages]);

  // Reset visible count khi toggle filter
  /* eslint-disable */
  useEffect(() => { setVisibleCount(BATCH_SIZE); }, [activeGroup]);
  /* eslint-enable */

  // IntersectionObserver — load thêm khi cuộn
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (visibleCount < filteredImages.length) {
            setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredImages.length));
          } else if (hasMoreImages && !loadingMoreImages) {
            void loadMoreServerImages();
          }
        }
      },
      { rootMargin: "200px" },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [filteredImages.length, hasMoreImages, loadMoreServerImages, loadingMoreImages, visibleCount]);

  // ─── Toggle heart ──────────────────────────
  const handleToggleStar = useCallback(
    async (imageId: string) => {
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
            className="group relative px-8 py-4 rounded-full font-semibold text-sm transition-all duration-300 cursor-pointer inline-flex items-center justify-center overflow-hidden bg-white text-black hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
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
      <div className="sticky top-0 z-30 backdrop-blur-md px-4 py-3 bg-bg-base/85 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} style={{ color: "var(--color-primary)" }} />
            <h1 className="text-sm font-bold truncate" style={{ color: "var(--color-text-primary)", maxWidth: "200px" }}>
              {gallery.title || "Album ảnh"}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            <span>📷 {totalImageCount} ảnh</span>
            {!isViewOnly && selectedCount > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveGroup((prev) => prev === "selected" ? "all" : "selected")}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveGroup((prev) => prev === "selected" ? "all" : "selected") }}
                className="transition-all duration-200 cursor-pointer"
                style={{
                  color: activeGroup === "selected" ? "var(--color-primary)" : "inherit",
                  fontWeight: activeGroup === "selected" ? 600 : 400,
                }}
              >
                ❤️ {selectedCount} đã chọn
              </div>
            )}
            {totalLikes > 0 && <span>👍 {totalLikes} thích</span>}
          </div>
        </div>
      </div>



      {/* ── Photo Grid ── */}
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="columns-2 md:columns-4 gap-2 space-y-2">
          {visibleImages.map((img) => (
            <div key={img.id} className="relative group overflow-hidden cursor-pointer inline-block w-full break-inside-avoid mb-2"
              style={{ borderRadius: "var(--radius-lg, 8px)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbnail_url || img.image_url} alt={img.file_name || "ảnh"} loading="lazy"
                onClick={() => setViewerIndex(images.indexOf(img))}
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105" />

              {/* Download button — bottom left */}
              {!isViewOnly && img.drive_file_id && (
                <a href={`/api/drive-download/${img.drive_file_id}`} download
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-sm">
                  <Download size={14} style={{ color: "white" }} />
                </a>
              )}

              {/* Heart button — bottom right */}
              {!isViewOnly && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleToggleStar(img.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleToggleStar(img.id) }}
                  className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${img.is_selected ? "bg-warning/90" : "bg-black/40"}`}>
                  <Star size={14} fill={img.is_selected ? "white" : "none"} style={{ color: "white" }} />
                </div>
              )}

              {/* Selected glow */}
              {img.is_selected && (
                <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-warning/60 rounded-lg" />
              )}

              {/* Like count badge — top-left, separate from selection */}
              {(reactionCounts[img.id]?.hearts || 0) > 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-tiny font-semibold">
                  <ThumbsUp size={10} />
                  <span>{reactionCounts[img.id].hearts}</span>
                </div>
              )}

              {/* Like button — top-right */}
              {!isViewOnly && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); handleToggleLike(img.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleToggleLike(img.id) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-sm cursor-pointer"
                  title="Thích ảnh này"
                >
                  <ThumbsUp size={12} className="text-white" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Infinite scroll sentinel ── */}
        {visibleCount < filteredImages.length || hasMoreImages ? (
          <div ref={sentinelRef} className="flex justify-center py-6">
            <span className="text-xs animate-pulse" style={{ color: "var(--color-text-muted)" }}>
              Đang tải thêm...
            </span>
          </div>
        ) : filteredImages.length > BATCH_SIZE ? (
          <div className="text-center py-4">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Đã hiện tất cả {activeGroup === "all" ? totalImageCount : filteredImages.length} ảnh
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Lightbox viewer ── */}
      {viewerIndex !== null && (
        <ImageViewer images={images} currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)} onIndexChange={setViewerIndex}
          onToggleStar={handleToggleStar} onSaveNote={handleSaveNote} mode={mode} />
      )}

      {/* ── Bottom bar ── */}
      {!isViewOnly && (
        <SelectionSummary selectedCount={selectedCount} totalCount={totalImageCount}
          selectedImages={images.filter((i) => i.is_selected)} />
      )}
    </div>
  );
}
