"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { getGallerySummariesByContract } from "@/app/actions/gallery-admin-actions";
import { toggleImageStar } from "@/app/actions/gallery-selection-actions";
import { getGalleryImagesPaginated } from "@/app/actions/gallery-image-helpers";
import { type ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import { createAlbum, getAlbumsByGallery, type GalleryAlbum } from "@/app/actions/gallery-album-actions";
import { getGalleryDataV2, getGalleryMetadataAll, type GalleryDataV2Result } from "@/app/actions/gallery-composite-actions";
import type { GalleryImage, GalleryShareDetails, GallerySummary } from "@/types/gallery";
import { type FileFilter, type StatsFilter, groupByFileGroup } from "./gallery-helpers";
import { type SortOption } from "./gallery-sort-dropdown";
import { useNetworkQuality } from "@/hooks/use-network-quality";
import { usePrefetchGallery } from "@/hooks/use-gallery-prefetch";

// ═══════════════════════════════════════════
// useGalleryData — All state + data logic for GalleryFullPage
// Extracted to keep component under 255 lines
// ═══════════════════════════════════════════

export interface UseGalleryDataInitial {
  galleries?: GallerySummary[];
  galleryData?: GalleryDataV2Result;
  galleryDataFor?: string | null; // galleryId của initialGalleryData (chỉ seed khi match)
}

export function useGalleryData(
  contractId: string,
  galleryId: string | null,
  folderType: string | null,
  initial?: UseGalleryDataInitial,
) {
  // SSR seed: chỉ áp dụng nếu galleryDataFor khớp galleryId hiện tại (tránh hiển thị nhầm)
  const seedData = (initial?.galleryData && initial.galleryDataFor === galleryId)
    ? initial.galleryData
    : null;
  // Network-aware pagination
  const { isSlowNetwork, effectiveType, saveData } = useNetworkQuality();
  const pageSize = useMemo(() => {
    if (isSlowNetwork || saveData) return 30;   // Aggressive limit on slow connections
    if (effectiveType === "3g") return 50;
    return 60;  // First batch nhỏ hơn → render nhanh; load-more khi scroll (infinite scroll có sẵn)
  }, [isSlowNetwork, effectiveType, saveData]);

  const [galleries, setGalleries] = useState<GallerySummary[]>(initial?.galleries ?? []);
  const [loading, setLoading] = useState(!(initial?.galleries && initial.galleries.length > 0));
  const [activeGalleryId, setActiveGalleryId] = useState<string | null>(() => {
    if (galleryId) return galleryId;
    // Khi page.tsx không có galleryId trong URL nhưng SSR đã trả về summaries, chọn ngay album đầu/match folderType
    const seedGalleries = initial?.galleries;
    if (seedGalleries && seedGalleries.length > 0) {
      if (folderType) {
        const match = seedGalleries.find((g) => g.folder_type === folderType);
        return match?.id || seedGalleries[0].id;
      }
      return seedGalleries[0].id;
    }
    return null;
  });
  const [fileFilter, setFileFilter] = useState<FileFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("gallery_sort_mode") as SortOption) || "manual";
    return "manual";
  });
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>(seedData?.reactionCounts ?? {});
  const [commentCount, setCommentCount] = useState(seedData?.totalCommentCount ?? 0);
  const [commentCountsPerImage, setCommentCountsPerImage] = useState<Record<string, number>>(seedData?.commentCountsPerImage ?? {});
  const [activeFilter, setActiveFilter] = useState<StatsFilter>("all");
  const [albums, setAlbums] = useState<GalleryAlbum[]>(seedData?.albums ?? []);
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
  const [paginatedImages, setPaginatedImages] = useState<GalleryImage[]>(seedData?.images ?? []);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreImages, setHasMoreImages] = useState(seedData?.hasMore ?? false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalImageCount, setTotalImageCount] = useState(seedData?.totalCount ?? 0);

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

  // Skip lần đầu nếu SSR đã trả về summaries — dùng one-shot ref để chỉ skip mount đầu,
  // các lần contractId đổi sau (không xảy ra trong route hiện tại nhưng phòng) vẫn fetch.
  const skipFirstGalleriesLoadRef = useRef(!!(initial?.galleries && initial.galleries.length > 0));
  useEffect(() => {
    if (skipFirstGalleriesLoadRef.current) {
      skipFirstGalleriesLoadRef.current = false;
      return;
    }
    void loadData();
  }, [contractId]);

  // ─── Active gallery ───────────────────────
  const activeGallery = galleries.find((g) => g.id === activeGalleryId);

  // ─── Load ALL gallery data when gallery changes (V2: single RPC) ───
  // Skip lần đầu nếu SSR đã seed data khớp activeGalleryId — tiết kiệm waterfall ~300-500ms.
  const skipFirstGalleryDataLoadRef = useRef(!!seedData);
  useEffect(() => {
    if (!activeGalleryId) return;

    // One-shot: nếu lần đầu mount và seed khớp galleryId → bỏ qua fetch (đã có data).
    if (skipFirstGalleryDataLoadRef.current) {
      skipFirstGalleryDataLoadRef.current = false;
      return;
    }

    let cancelled = false;

    // Reset state
    setPaginatedImages([]);
    setCurrentPage(0);
    setHasMoreImages(false);
    setTotalImageCount(0);
    setLoadingMore(true);
    setActiveAlbumId(null);
    setActiveFilter("all");

    const loadGalleryData = async () => {
      // Try V2 RPC first (single call for everything) with network-aware pageSize
      console.log(`[useGalleryData] 🚀 INITIAL LOAD: pageSize=${pageSize}`);
      const v2Result = await getGalleryDataV2(activeGalleryId, 0, pageSize);

      if (cancelled) return;

      console.log('[useGalleryData] V2 Result:', v2Result);

      if (v2Result.success && v2Result.data) {
        // V2 RPC succeeded - use combined data
        const data = v2Result.data;
        console.log(`[useGalleryData] ✅ V2 RPC SUCCESS: ${data.images.length}/${data.totalCount} images, hasMore=${data.hasMore}, pageSize=${data.pageSize}`);
        setPaginatedImages(data.images);
        setTotalImageCount(data.totalCount);
        setHasMoreImages(data.hasMore);
        setReactionCounts(data.reactionCounts);
        setCommentCount(data.totalCommentCount);
        setCommentCountsPerImage(data.commentCountsPerImage);
        setAlbums(data.albums);
        setCurrentPage(0);
        setLoadingMore(false);
        return;
      }

      // V2 RPC failed - fallback to legacy parallel calls
      console.warn("[useGalleryData] V2 RPC unavailable, using legacy fallback");

      const [imagesRes, metadataRes] = await Promise.all([
        getGalleryImagesPaginated(activeGalleryId, 0, pageSize),
        getGalleryMetadataAll(activeGalleryId),
      ]);

      if (cancelled) return;

      if (imagesRes.success && imagesRes.data) {
        setPaginatedImages(imagesRes.data.images);
        setTotalImageCount(imagesRes.data.totalCount);
        setHasMoreImages(imagesRes.data.hasMore);
        setCurrentPage(0);
      }

      if (metadataRes.success && metadataRes.data) {
        setReactionCounts(metadataRes.data.reactionCounts);
        setCommentCount(metadataRes.data.totalCommentCount);
        setCommentCountsPerImage(metadataRes.data.commentCountsPerImage);
        setAlbums(metadataRes.data.albums);
      }

      setLoadingMore(false);
    };

    void loadGalleryData();
    return () => { cancelled = true; };
  }, [activeGalleryId]);

  const loadMoreImages = useCallback(async () => {
    if (!activeGalleryId || loadingMore || !hasMoreImages) {
      console.log('[useGalleryData] 🚫 LOAD MORE BLOCKED:', {
        activeGalleryId,
        loadingMore,
        hasMoreImages,
        currentImages: paginatedImages.length,
        totalCount: totalImageCount,
        reason: !activeGalleryId ? 'NO_GALLERY' : loadingMore ? 'ALREADY_LOADING' : 'NO_MORE_DATA'
      });
      return;
    }
    console.log('[useGalleryData] 🔄 LOAD MORE STARTING...');
    setLoadingMore(true);

    // Calculate exact page based on loaded images to avoid overlapping offsets when pageSize changes
    const nextPage = Math.floor(paginatedImages.length / pageSize);
    console.log('[useGalleryData] Loading more:', { nextPage, pageSize, currentLoaded: paginatedImages.length });

    const res = await getGalleryImagesPaginated(activeGalleryId, nextPage, pageSize);

    if (res.success && res.data) {
      // Filter duplicates in case the math still caused an overlap
      const newImages = res.data.images.filter(
        (newImg) => !paginatedImages.some((existingImg) => existingImg.id === newImg.id)
      );

      console.log('[useGalleryData] Loaded more:', {
        fetched: res.data.images.length,
        afterDedup: newImages.length,
        newTotal: paginatedImages.length + newImages.length,
        hasMore: res.data.hasMore,
      });

      setPaginatedImages((prev) => [...prev, ...newImages]);
      setTotalImageCount(res.data.totalCount);
      setHasMoreImages(res.data.hasMore);
      setCurrentPage(nextPage);
    }
    setLoadingMore(false);
  }, [activeGalleryId, loadingMore, hasMoreImages, paginatedImages, pageSize]);

  const images = useMemo(() => paginatedImages, [paginatedImages]);
  const groupedImages = groupByFileGroup(images);

  // Diagnostic: Check Drive file completeness
  useEffect(() => {
    const missingDriveId = images.filter(i => !i.drive_file_id);
    const missingDimensions = images.filter(i => !i.width || !i.height);
    if (missingDriveId.length > 0 || missingDimensions.length > 0) {
      console.warn('[useGalleryData] ⚠️ INCOMPLETE DATA:', {
        totalImages: images.length,
        missingDriveId: missingDriveId.length,
        missingDimensions: missingDimensions.length,
        groups: groupedImages.length,
      });
    }
  }, [images, groupedImages.length]);

  // ─── Debug logs ─────────────────────────────
  useEffect(() => {
    const debugData = {
      activeGalleryId,
      paginatedImagesLength: paginatedImages.length,
      groupedImagesLength: groupedImages.length,
      totalImageCount,
      hasMoreImages,
      loadingMore,
      fileFilter,
      activeFilter,
      activeAlbumId,
    };
    console.log('[useGalleryData] 📊 STATE:',
      `Images: ${debugData.paginatedImagesLength} → Groups: ${debugData.groupedImagesLength}`,
      `Total: ${debugData.totalImageCount}`,
      `HasMore: ${debugData.hasMoreImages}`,
      `Loading: ${debugData.loadingMore}`
    );
  }, [activeGalleryId, paginatedImages.length, groupedImages.length, totalImageCount, hasMoreImages, loadingMore, fileFilter, activeFilter, activeAlbumId]);

  // ─── Smart Prefetch (Phase 2) ──────────────
  const { prefetchedPages } = usePrefetchGallery(
    activeGalleryId,
    paginatedImages.length,
    totalImageCount,
    hasMoreImages,
    pageSize,
    {
      enabled: true,
      prefetchThreshold: 0.6, // Prefetch when user viewed 60% of loaded images
      debounceMs: 1000, // Wait 1s before prefetch (avoid rapid-fire during fast scroll)
    }
  );

  // ─── Filter + Sort ────────────────────────
  const filteredGroups = useMemo(() => {
    console.log(`[useGalleryData] 🔍 FILTER START: ${groupedImages.length} groups, filter="${fileFilter}", activeFilter="${activeFilter}"`);

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
      filtered = filtered.filter((g) => g.displayImage.is_starred);
    } else if (activeFilter === "selected") {
      filtered = filtered.filter((g) => g.displayImage.is_selected);
    } else if (activeFilter === "hearted") {
      filtered = filtered.filter((g) => (reactionCounts[g.displayImage.id]?.hearts || 0) > 0);
    } else if (activeFilter === "commented") {
      filtered = filtered.filter((g) => (commentCountsPerImage[g.displayImage.id] || 0) > 0);
    }

    console.log(`[useGalleryData] ✅ FILTER DONE: ${groupedImages.length} → ${filtered.length} (dropped ${groupedImages.length - filtered.length})`);

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
  const starredCount = images.filter((i) => i.is_starred).length;
  const hasPassword = activeGallery?.hasPassword ?? !!(activeGallery?.password_hash || activeGallery?.password);
  const effectiveTotalImageCount = totalImageCount || activeGallery?.imageCount || images.length;
  const totalHearts = Object.values(reactionCounts).reduce((sum, c) => sum + c.hearts, 0);

  // ─── Star toggle (Admin đề xuất ảnh) ──────
  const handleToggleStar = useCallback(async (imageId: string, currentStarred: boolean) => {
    const nextStarred = !currentStarred;

    setPaginatedImages((prev) => prev.map((img) =>
      img.id === imageId
        ? {
          ...img,
          is_starred: nextStarred,
          starred_at: nextStarred ? new Date().toISOString() : null,
        }
        : img,
    ));

    const res = await toggleImageStar(imageId, nextStarred);
    if (!res.success) {
      setPaginatedImages((prev) => prev.map((img) =>
        img.id === imageId
          ? {
            ...img,
            is_starred: currentStarred,
            starred_at: currentStarred ? new Date().toISOString() : null,
          }
          : img,
      ));
    }
  }, []);

  const patchGalleryShareDetails = useCallback((details: GalleryShareDetails) => {
    setGalleries((prev) => prev.map((gallery) =>
      gallery.id === details.galleryId
        ? {
          ...gallery,
          access_url: details.accessUrl,
          status: details.status,
          hasPassword: details.hasPassword,
          shareLinks: details.shareLinks, // ✅ Update share links!
          shared_at: gallery.shared_at || new Date().toISOString(),
        }
        : gallery,
    ));
  }, []);

  // ─── Display/download helpers ─────────────
  const displayImages = filteredGroups.map((g) => g.displayImage);
  const allDownloadFiles = useMemo(() =>
    images.filter((i) => i.drive_file_id).map((i) => ({ imageId: i.id, fileName: i.file_name || "photo" })),
  [images]);
  const selectedDownloadFiles = useMemo(() =>
    images.filter((i) => i.is_selected && i.drive_file_id).map((i) => ({ imageId: i.id, fileName: i.file_name || "photo" })),
  [images]);

  const fetchAllSelectedDownloadFiles = useCallback(async () => {
    if (!activeGalleryId) return [];
    const { getAllSelectedImagesForAction } = await import("@/app/actions/gallery-image-helpers");
    const res = await getAllSelectedImagesForAction(activeGalleryId);
    if (!res.success || !res.data) return [];
    return res.data.filter((i: any) => i.drive_file_id).map((i: any) => ({ imageId: i.id, fileName: i.file_name || "photo" }));
  }, [activeGalleryId]);

  const fetchAllDownloadFiles = useCallback(async () => {
    if (!activeGalleryId) return [];
    const { getAllImagesForAction } = await import("@/app/actions/gallery-image-helpers");
    const res = await getAllImagesForAction(activeGalleryId);
    if (!res.success || !res.data) return [];
    return res.data.filter((i: any) => i.drive_file_id).map((i: any) => ({ imageId: i.id, fileName: i.file_name || "photo" }));
  }, [activeGalleryId]);

  return {
    // State
    galleries, loading, activeGalleryId, fileFilter, sortBy, reactionCounts, commentCount,
    commentCountsPerImage, activeFilter, albums, activeAlbumId, viewMode, newAlbumName,
    showAlbumInput, watermarkOn,
    // Derived
    activeGallery, images, groupedImages, filteredGroups, displayImages,
    rawCount, jpgCount, selectedCount, starredCount, hasPassword, totalHearts,
    allDownloadFiles, selectedDownloadFiles, totalImageCount: effectiveTotalImageCount,
    // Pagination
    hasMoreImages, loadingMore, loadMoreImages,
    // Fetchers
    fetchAllSelectedDownloadFiles, fetchAllDownloadFiles,
    // Setters
    setActiveGalleryId, setFileFilter, setActiveFilter, setActiveAlbumId,
    setNewAlbumName, setShowAlbumInput,
    // Handlers
    handleSort, handleViewMode, handleWatermarkToggle, handleCreateAlbum, handleToggleStar,
    patchGalleryShareDetails,
  };
}
