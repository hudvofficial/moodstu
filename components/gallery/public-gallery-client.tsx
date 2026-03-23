"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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

const GROUP_LABELS: Record<string, string> = {
  goc: "Ảnh gốc",
  da_sua: "Đã sửa",
  chon_in: "Chọn in",
};

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
  const [activeGroup, setActiveGroup] = useState<string>("all");
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

  // ─── Category groups ──────────────────────
  const groups = useMemo(() => {
    const set = new Set(images.map((i) => i.file_group).filter(Boolean));
    return Array.from(set) as string[];
  }, [images]);

  const filteredImages = useMemo(
    () => activeGroup === "all" ? images : images.filter((i) => i.file_group === activeGroup),
    [images, activeGroup],
  );

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
        style={{ background: "var(--color-gallery-bg, #1a1a1a)" }}>
        {coverImage && (
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${coverImage.thumbnail_url || coverImage.image_url})`,
            backgroundSize: "cover", backgroundPosition: "center",
            filter: "blur(40px) brightness(0.3)", transform: "scale(1.2)",
          }} />
        )}
        <div className="relative z-10 text-center px-6 mx-auto gallery-entrance" style={{ width: "100%", maxWidth: "512px" }}>
          <Camera size={48} className="mx-auto mb-4"
            style={{ color: "var(--color-gallery-icon, #C9A96E)" }} />
          <h1 className="text-2xl md:text-3xl font-bold mb-2"
            style={{ color: "var(--color-gallery-text, #F5E6D3)" }}>
            {gallery.title || "Album ảnh"}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-gallery-text-muted, rgba(201,169,110,0.6))" }}>
            {images.length} ảnh{!isViewOnly && " • Chọn ảnh yêu thích của bạn"}
          </p>
          <button onClick={() => setShowLanding(false)}
            className="mt-6 px-8 py-3 rounded-full font-semibold text-sm transition-all duration-200"
            style={{ background: "var(--color-accent, #C9A96E)", color: "#1a1a1a" }}>
            Xem Album
          </button>
          <p className="mt-8 text-xs" style={{ color: "var(--color-gallery-text-dim, rgba(201,169,110,0.3))" }}>Mood Studio</p>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════
  // GALLERY VIEW
  // ═════════════════════════════════════════
  return (
    <div className="min-h-screen pb-20" style={{ background: "var(--color-bg-main, #faf8f5)" }}>
      {/* ── Sticky Header + Stats ── */}
      <div className="sticky top-0 z-30 backdrop-blur-md px-4 py-3"
        style={{ background: "rgba(250, 248, 245, 0.85)", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} style={{ color: "var(--color-primary, #8B5E3C)" }} />
            <h1 className="text-sm font-bold truncate" style={{ color: "var(--color-text-primary, #2c2c2c)", maxWidth: "200px" }}>
              {gallery.title || "Album ảnh"}
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-text-secondary, #666)" }}>
            <span>📷 {images.length} ảnh</span>
            {!isViewOnly && <span>❤️ {selectedCount} đã chọn</span>}
            {totalLikes > 0 && <span>👍 {totalLikes} thích</span>}
            {groups.length > 1 && <span>📁 {groups.length} nhóm</span>}
          </div>
        </div>
      </div>

      {/* ── Category Tabs ── */}
      {groups.length > 1 && (
        <div className="sticky top-[52px] z-20 px-4 py-2 overflow-x-auto"
          style={{ background: "var(--color-bg-main, #faf8f5)", WebkitOverflowScrolling: "touch" }}>
          <div className="max-w-5xl mx-auto flex gap-2">
            <TabButton label="Tất cả" active={activeGroup === "all"} count={images.length} onClick={() => setActiveGroup("all")} />
            {groups.map((g) => (
              <TabButton key={g} label={GROUP_LABELS[g] || g} active={activeGroup === g}
                count={images.filter((i) => i.file_group === g).length} onClick={() => setActiveGroup(g)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Photo Grid ── */}
      <div className="max-w-5xl mx-auto px-3 py-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {filteredImages.map((img) => (
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
                  className="absolute bottom-2 left-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(8px)" }}>
                  <Download size={14} style={{ color: "white" }} />
                </a>
              )}

              {/* Heart button — bottom right */}
              {!isViewOnly && (
                <button onClick={(e) => { e.stopPropagation(); handleToggleHeart(img.id); }}
                  disabled={togglingIds.has(img.id)}
                  className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{
                    background: img.is_selected ? "rgba(239, 68, 68, 0.9)" : "rgba(0, 0, 0, 0.4)",
                    backdropFilter: "blur(8px)",
                  }}>
                  <Heart size={14} fill={img.is_selected ? "white" : "none"} style={{ color: "white" }} />
                </button>
              )}

              {/* Selected glow */}
              {img.is_selected && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ boxShadow: "inset 0 0 0 2px rgba(239, 68, 68, 0.6)", borderRadius: "var(--radius-lg, 8px)" }} />
              )}

              {/* Like count badge — top-left, separate from selection */}
              {(reactionCounts[img.id]?.hearts || 0) > 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: "10px", fontWeight: 600 }}>
                  <ThumbsUp size={10} />
                  <span>{reactionCounts[img.id].hearts}</span>
                </div>
              )}

              {/* Like button — top-right */}
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleLike(img.id); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", border: "none", cursor: "pointer" }}
                title="Thích ảnh này"
              >
                <ThumbsUp size={12} style={{ color: "#fff" }} />
              </button>
            </div>
          ))}
        </div>
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

// ─── Tab Button sub-component ───────────────
function TabButton({ label, active, count, onClick }: {
  label: string; active: boolean; count: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap"
      style={{
        background: active ? "var(--color-primary, #8B5E3C)" : "var(--color-bg-hover, #f0ece6)",
        color: active ? "white" : "var(--color-text-secondary, #666)",
      }}>
      {label} ({count})
    </button>
  );
}
