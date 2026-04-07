"use client";
/* eslint-disable */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Heart, Camera, Download, ThumbsUp } from "lucide-react";
import {
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
  status: string;
  selection_deadline: string | null;
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
  const isViewOnly = mode === "view";

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
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredImages.length));
        }
      },
      { rootMargin: "200px" },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [filteredImages.length]);

  // ─── Toggle heart ──────────────────────────
  const handleToggleHeart = useCallback(
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
      const res = await toggleImageSelection(imageId, newSelected);
      if (!res.success) {
        setImages((prev) =>
          prev.map((i) =>
            i.id === imageId ? { ...i, is_selected: !newSelected, selected_at: !newSelected ? new Date().toISOString() : null } : i,
          ),
        );
      }
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(imageId); return next; });
    },
    [images, isViewOnly],
  );

  // Like reaction toggle (separate from selection)
  const handleToggleLike = useCallback(
    async (imageId: string) => {
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
    [gallery.id, getClientId],
  );

  // ─── Save note ─────────────────────────────
  const handleSaveNote = useCallback(
    async (imageId: string, note: string) => {
      setImages((prev) => prev.map((i) => i.id === imageId ? { ...i, client_note: note || null } : i));
      await updateClientNote(imageId, note);
    },
    [],
  );

  // ═════════════════════════════════════════
  // LANDING SCREEN
  // ═════════════════════════════════════════
  if (showLanding) {
    const coverImage = images[0];
    return (
      <div className="min-h-screen flex flex-col justify-center relative overflow-hidden"
        style={{ background: "var(--color-gallery-bg)" }}>
        {coverImage && (
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${coverImage.thumbnail_url || coverImage.image_url})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(40px) brightness(0.3)", transform: "scale(1.2)",
          }} />
        )}
        <div className="relative z-10 text-center px-6 mx-auto gallery-entrance" style={{ width: "100%", maxWidth: "512px" }}>
          <Camera size={48} className="mx-auto mb-4"
            style={{ color: "var(--color-gallery-icon)" }} />
          <h1 className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: "var(--color-gallery-text)" }}>
            {gallery.title || "Album ảnh"}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-gallery-text-muted)" }}>
            {images.length} ảnh{!isViewOnly && " • Chọn ảnh yêu thích của bạn"}
          </p>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowLanding(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setShowLanding(false); }}
            className="mt-6 px-8 py-3 rounded-full font-semibold text-sm transition-all duration-200 cursor-pointer inline-flex items-center justify-center"
            style={{ background: "var(--color-accent)", color: "var(--color-gallery-bg)" }}>
            Xem Album
          </div>
          <p className="mt-8 text-xs" style={{ color: "var(--color-gallery-text-dim)" }}>Mood Studio</p>
        </div>
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
            <span>📷 {images.length} ảnh</span>
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
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {visibleImages.map((img) => (
            <div key={img.id} className="relative group overflow-hidden cursor-pointer"
              style={{ borderRadius: "var(--radius-lg, 8px)", aspectRatio: "1 / 1" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.thumbnail_url || img.image_url} alt={img.file_name || "ảnh"} loading="lazy"
                onClick={() => setViewerIndex(images.indexOf(img))}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />

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
                  onClick={(e) => { e.stopPropagation(); handleToggleHeart(img.id); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleToggleHeart(img.id) }}
                  className={`absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${img.is_selected ? "bg-red-500/90" : "bg-black/40"}`}>
                  <Heart size={14} fill={img.is_selected ? "white" : "none"} style={{ color: "white" }} />
                </div>
              )}

              {/* Selected glow */}
              {img.is_selected && (
                <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-red-500/60 rounded-lg" />
              )}

              {/* Like count badge — top-left, separate from selection */}
              {(reactionCounts[img.id]?.hearts || 0) > 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 text-white text-tiny font-semibold">
                  <ThumbsUp size={10} />
                  <span>{reactionCounts[img.id].hearts}</span>
                </div>
              )}

              {/* Like button — top-right */}
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
            </div>
          ))}
        </div>

        {/* ── Infinite scroll sentinel ── */}
        {visibleCount < filteredImages.length ? (
          <div ref={sentinelRef} className="flex justify-center py-6">
            <span className="text-xs animate-pulse" style={{ color: "var(--color-text-muted)" }}>
              Đang tải thêm...
            </span>
          </div>
        ) : filteredImages.length > BATCH_SIZE ? (
          <div className="text-center py-4">
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Đã hiện tất cả {filteredImages.length} ảnh
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Lightbox viewer ── */}
      {viewerIndex !== null && (
        <ImageViewer images={images} currentIndex={viewerIndex}
          onClose={() => setViewerIndex(null)} onIndexChange={setViewerIndex}
          onToggleHeart={handleToggleHeart} onSaveNote={handleSaveNote} mode={mode} />
      )}

      {/* ── Bottom bar ── */}
      {!isViewOnly && (
        <SelectionSummary selectedCount={selectedCount} totalCount={images.length}
          selectedImages={images.filter((i) => i.is_selected)} />
      )}
    </div>
  );
}

