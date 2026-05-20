"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { getGallerySummariesByContract, toggleImageSelection } from "@/app/actions/gallery-actions";
import { getGalleryImagesPaginated } from "@/app/actions/gallery-image-helpers";
import { getReactionCounts, getGalleryCommentCount, getCommentCountsPerImage, type ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import { getAlbumsByGallery, createAlbum, type GalleryAlbum } from "@/app/actions/gallery-album-actions";
import type { GalleryImage, GallerySummary } from "@/types/gallery";
import { type FileFilter, type StatsFilter, groupByFileGroup } from "./gallery-helpers";
import { type SortOption } from "./gallery-sort-dropdown";

// ═══════════════════════════════════════════
// useGalleryData — All state + data logic for GalleryFullPage
// Extracted to keep component under 255 lines
// ═══════════════════════════════════════════

export function useGalleryData(contractId: string, galleryId: string | null, folderType: string | null) {
  const [galleries, setGalleries] = useState<GallerySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGalleryId, setActiveGalleryId] = useState<string | null>(galleryId);
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("gallery_sort_mode") as SortOption) || "manual";
    return "manual";
  });
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [commentCount, setCommentCount] = useState(0);
  const [commentCountsPerImage, setCommentCountsPerImage] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState<StatsFilter>("all");
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("gallery_view_mode") as "grid" | "list") || "grid";
    return "grid";
  });
  const [newAlbumName, setNewAlbumName] = useState("");
  const [showAlbumInput, setShowAlbumInput] = useState(false);
  const [watermarkOn, setWatermarkOn] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("gallery_watermark") === "true";
    return false;
  });

  // ─── Lazy-load pagination state ────────────
  const [paginatedImages, setPaginatedImages] = useState<GalleryImage[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreImages, setHasMoreImages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalImageCount, setTotalImageCount] = useState(0);

  // ─── Handlers ───────────────────────────

  const handleWatermarkToggle = () => {
    setWatermarkOn((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") localStorage.setItem("gallery_watermark", String(next));
      return next;
    });
  };

  const handleSort = (newSort: SortOption) => {
    setSortBy(newSort);
    if (typeof window !== "undefined") localStorage.setItem("gallery_sort_mode", newSort);
  };

  const handleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") localStorage.setItem("gallery_view_mode", mode);
  };

  // ─── Load galleries ───────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getGallerySummariesByContract(contractId);
    if (res.success && res.data) {
      setGalleries(res.data);
      if (!activeGalleryId && res.data.length > 0) {
        if (folderType) {
          const match = res.data.find((g) => g.folder_type === folderType);
          setActiveGalleryId(match?.id || res.data[0].id);
        } else {
          setActiveGalleryId(res.data[0].id);
        }
      }
    }
    setLoading(false);
  }, [contractId, folderType, activeGalleryId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadData(); }, [contractId]);

  // ─── Load reactions when gallery changes ──
  useEffect(() => {
    if (!activeGalleryId) return;
    void getReactionCounts(activeGalleryId).then(setReactionCounts);
    void getGalleryCommentCount(activeGalleryId).then(setCommentCount);
    void getCommentCountsPerImage(activeGalleryId).then(setCommentCountsPerImage);
    void getAlbumsByGallery(activeGalleryId).then(setAlbums);
    setActiveAlbumId(null);
    setActiveFilter("all");
  }, [activeGalleryId]);

  // ─── Active gallery ───────────────────────
  const activeGallery = galleries.find((g) => g.id === activeGalleryId);

  // ─── Lazy-load images when gallery changes ───
  useEffect(() => {
    if (!activeGalleryId) return;
    let cancelled = false;
    setPaginatedImages([]);
    setCurrentPage(0);
    setHasMoreImages(false);
    setTotalImageCount(0);
    setLoadingMore(true);
    void getGalleryImagesPaginated(activeGalleryId, 0).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setPaginatedImages(res.data.images);
        setTotalImageCount(res.data.totalCount);
        setHasMoreImages(res.data.hasMore);
        setCurrentPage(0);
      }
      setLoadingMore(false);
    });
    return () => { cancelled = true; };
  }, [activeGalleryId]);

  const loadMoreImages = useCallback(async () => {
    if (!activeGalleryId || loadingMore || !hasMoreImages) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    const res = await getGalleryImagesPaginated(activeGalleryId, nextPage);
    if (res.success && res.data) {
      setPaginatedImages((prev) => [...prev, ...res.data.images]);
      setTotalImageCount(res.data.totalCount);
      setHasMoreImages(res.data.hasMore);
      setCurrentPage(nextPage);
    }
    setLoadingMore(false);
  }, [activeGalleryId, loadingMore, hasMoreImages, currentPage]);

  const images = useMemo(() => paginatedImages, [paginatedImages]);
  const groupedImages = groupByFileGroup(images);

  // ─── Filter + Sort ────────────────────────
  const filteredGroups = useMemo(() => {
    let filtered = groupedImages.filter((group) => {
      if (fileFilter === "all") return true;
      if (fileFilter === "raw") return group.hasRaw;
      if (fileFilter === "jpg") return group.hasJpg;
      return true;
    });

    if (activeAlbumId) {
      filtered = filtered.filter((g) => g.images.some((img: GalleryImage) => (img as GalleryImage & { album_id?: string }).album_id === activeAlbumId));
    }

    if (activeFilter === "starred") {
      filtered = filtered.filter((g) => g.displayImage.is_selected);
    } else if (activeFilter === "hearted") {
      filtered = filtered.filter((g) => (reactionCounts[g.displayImage.id]?.hearts || 0) > 0);
    } else if (activeFilter === "commented") {
      filtered = filtered.filter((g) => (commentCountsPerImage[g.displayImage.id] || 0) > 0);
    }

    return [...filtered].sort((a, b) => {
      const nameA = a.displayImage.file_name || "";
      const nameB = b.displayImage.file_name || "";
      const dateA = new Date(a.displayImage.created_at).getTime();
      const dateB = new Date(b.displayImage.created_at).getTime();
      switch (sortBy) {
        case "manual": return 0;
        case "name-asc": return nameA.localeCompare(nameB);
        case "name-desc": return nameB.localeCompare(nameA);
        case "date-desc": return dateB - dateA;
        case "date-asc": return dateA - dateB;
        default: return 0;
      }
    });
  }, [groupedImages, fileFilter, sortBy, activeAlbumId, activeFilter, reactionCounts, commentCountsPerImage]);

  // ─── Album ────────────────────────────────
  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim() || !activeGalleryId) return;
    try {
      await createAlbum(activeGalleryId, newAlbumName.trim());
      const updated = await getAlbumsByGallery(activeGalleryId);
      setAlbums(updated);
      setNewAlbumName("");
      setShowAlbumInput(false);
    } catch { /* silent */ }
  };

  // ─── Counts ───────────────────────────────
  const rawCount = groupedImages.filter((g) => g.hasRaw).length;
  const jpgCount = groupedImages.filter((g) => g.hasJpg).length;
  const selectedCount = activeGallery?.selectedCount ?? images.filter((i) => i.is_selected).length;
  const hasPassword = activeGallery?.hasPassword ?? !!(activeGallery?.password_hash || activeGallery?.password);
  const effectiveTotalImageCount = totalImageCount || activeGallery?.imageCount || images.length;
  const totalHearts = Object.values(reactionCounts).reduce((sum, c) => sum + c.hearts, 0);

  // ─── Star toggle (Admin đề xuất ảnh) ──────
  const handleToggleStar = useCallback(async (imageId: string, currentSelected: boolean) => {
    const nextSelected = !currentSelected;
    const countDelta = nextSelected ? 1 : -1;

    setPaginatedImages((prev) => prev.map((img) =>
      img.id === imageId
        ? {
          ...img,
          is_selected: nextSelected,
          selected_at: nextSelected ? new Date().toISOString() : null,
        }
        : img,
    ));
    setGalleries((prev) => prev.map((g) => g.id === activeGalleryId
      ? { ...g, selectedCount: Math.max(0, g.selectedCount + countDelta) }
      : g));

    const res = await toggleImageSelection(imageId, nextSelected);
    if (!res.success) {
      setPaginatedImages((prev) => prev.map((img) =>
        img.id === imageId
          ? {
            ...img,
            is_selected: currentSelected,
            selected_at: currentSelected ? new Date().toISOString() : null,
          }
          : img,
      ));
      setGalleries((prev) => prev.map((g) => g.id === activeGalleryId
        ? { ...g, selectedCount: Math.max(0, g.selectedCount - countDelta) }
        : g));
    }
  }, [activeGalleryId]);

  // ─── Display/download helpers ─────────────
  const displayImages = filteredGroups.map((g) => g.displayImage);
  const allDownloadFiles = useMemo(() =>
    images.filter((i) => i.drive_file_id).map((i) => ({ driveFileId: i.drive_file_id!, fileName: i.file_name || "photo" })),
  [images]);
  const selectedDownloadFiles = useMemo(() =>
    images.filter((i) => i.is_selected && i.drive_file_id).map((i) => ({ driveFileId: i.drive_file_id!, fileName: i.file_name || "photo" })),
  [images]);

  return {
    // State
    galleries, loading, activeGalleryId, fileFilter, sortBy, reactionCounts, commentCount,
    commentCountsPerImage, activeFilter, albums, activeAlbumId, viewMode, newAlbumName,
    showAlbumInput, watermarkOn,
    // Derived
    activeGallery, images, groupedImages, filteredGroups, displayImages,
    rawCount, jpgCount, selectedCount, hasPassword, totalHearts,
    allDownloadFiles, selectedDownloadFiles, totalImageCount: effectiveTotalImageCount,
    // Pagination
    hasMoreImages, loadingMore, loadMoreImages,
    // Setters
    setActiveGalleryId, setFileFilter, setActiveFilter, setActiveAlbumId,
    setNewAlbumName, setShowAlbumInput,
    // Handlers
    handleSort, handleViewMode, handleWatermarkToggle, handleCreateAlbum, handleToggleStar,
  };
}
