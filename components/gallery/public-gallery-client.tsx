"use client";
/* eslint-disable */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import useSWRInfinite from "swr/infinite";
import { Camera, CircleCheck, Image as ImageIcon, Heart, Download, MessageSquare } from "lucide-react";
import type { GalleryImage } from "@/types/gallery";
import { getPublicGalleryImagesPaginated, getPublicGalleryStats, getPublicGalleryWithAccess } from "@/app/actions/gallery-public-actions";
import { getPublicSelectedImages, getPublicSelectedImagesFull, toggleImageSelection } from "@/app/actions/gallery-selection-actions";
import { getClientReactions, getGalleryComments, getPublicNotedImages, getReactionCounts, toggleReaction, upsertComment, type ReactionCounts } from "@/app/actions/gallery-reaction-actions";
import { groupByFileGroup } from "@/components/contracts/gallery/gallery-helpers";
import GalleryImageGrid from "@/components/contracts/gallery/gallery-image-grid-index";
import ImageViewer from "./image-viewer";
import SelectionSummary from "./selection-summary";
import HeartPasswordModal from "./heart-password-modal";
import { useNetworkQuality } from "@/hooks/use-network-quality";

// ═══════════════════════════════════════════
// PublicGalleryClient — Khách xem + chọn ảnh
// Landing → Stats + Tabs → Grid → Viewer
// ═══════════════════════════════════════════


interface Gallery {
  id: string;
  title: string | null;
  access_url?: string | null;
  accessToken?: string;
  needsPassword?: boolean;
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
  const STORAGE_KEY_PREFIX = "gallery_access_";
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [activeGroup, setActiveGroup] = useState<"all" | "selected" | "noted">("all");
  // T-20260825-noted-tab: chỉ fetch danh sách ảnh có ghi chú khi khách vào tab GHI CHÚ lần đầu (lazy)
  const [notedTabTouched, setNotedTabTouched] = useState(false);
  // T-20260825-selected-tab: cùng cơ chế lazy cho tab ĐÃ CHỌN
  const [selectedTabTouched, setSelectedTabTouched] = useState(false);
  const [heartAccessToken, setHeartAccessToken] = useState(gallery.accessToken || "");
  const [showSelectPasswordModal, setShowSelectPasswordModal] = useState(false);
  const [pendingSelectImageId, setPendingSelectImageId] = useState<string | null>(null);
  const isViewOnly = mode === "view";
  const accessUrl = gallery.access_url || "";
  const accessToken = heartAccessToken;

  // ⚡ Network-aware loading: adjust page size and quality based on connection
  const { isSlowNetwork, effectiveType, saveData } = useNetworkQuality();
  const pageSize = useMemo(() => {
    if (isSlowNetwork || saveData) return 20;       // 20 images on 2G/3G or data saver
    if (effectiveType === "3g") return 50;          // 50 images on 3G
    return 100;                                     // 100 images on 4G+
  }, [isSlowNetwork, effectiveType, saveData]);

  // Decode capability from token
  let clientCapability = gallery.capability || "select";
  if (accessToken && accessToken !== "admin") {
    try {
      const [bodyPart] = accessToken.split(".");
      const payload = JSON.parse(atob(bodyPart.replace(/-/g, "+").replace(/_/g, "/")));
      clientCapability = payload.capability || "select";
    } catch {}
  }

  // Client identifier for anonymous reactions
  const getClientId = useCallback(() => {
    if (typeof window === "undefined") return "guest";
    let id = localStorage.getItem("mood_client_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("mood_client_id", id); }
    return id;
  }, []);

  // SWR: Reaction Counts
  const { data: reactionCounts = {}, mutate: mutateReactionCounts } = useSWR<ReactionCounts>(
    gallery.id ? `gallery-reactions-${gallery.id}` : null,
    () => getReactionCounts(gallery.id),
    { fallbackData: {} }
  );

  const { data: commentsPerImage = {} } = useSWR(
    gallery.id && accessUrl && accessToken ? `gallery-comments-${gallery.id}` : null,
    () => getGalleryComments(gallery.id, accessUrl, accessToken),
    { fallbackData: {} },
  );

  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    setClientId(getClientId());
  }, [getClientId]);

  useEffect(() => {
    if (!gallery.id || !accessUrl) return;
    // Album có pass: server chỉ cấp view-token — khôi phục SELECT-token đã lưu (dâu rể từng nhập pass)
    // để không phải nhập lại. Album không pass: token đầy đủ có sẵn, khỏi khôi phục.
    if (gallery.accessToken && !gallery.needsPassword) return;
    const saved = sessionStorage.getItem(STORAGE_KEY_PREFIX + gallery.id);
    if (!saved) return;

    getPublicGalleryWithAccess(gallery.id, saved, accessUrl).then((res) => {
      if (!res.success || !res.data.accessToken) {
        sessionStorage.removeItem(STORAGE_KEY_PREFIX + gallery.id);
        return;
      }

      sessionStorage.setItem(STORAGE_KEY_PREFIX + gallery.id, res.data.accessToken);
      setHeartAccessToken(res.data.accessToken);
    });
  }, [accessUrl, gallery.accessToken, gallery.id, gallery.needsPassword]);

  const { data: clientReactions = {}, mutate: mutateClientReactions } = useSWR<Record<string, { heart: boolean; star: boolean }>>(
    gallery.id && clientId ? `gallery-client-reactions-${gallery.id}-${clientId}` : null,
    () => getClientReactions(gallery.id, clientId || "guest"),
    { fallbackData: {} }
  );

  // SWR: Gallery Stats (selectedCount, imageCount)
  const { data: stats, mutate: mutateStats } = useSWR(
    gallery.id ? `gallery-stats-${gallery.id}` : null,
    () => getPublicGalleryStats(gallery.id),
    { fallbackData: { selectedCount: gallery.selectedCount || 0, imageCount: gallery.imageCount || (gallery.gallery_images?.length || 0) } }
  );

  // SWR: ẢNH ĐÃ CHỌN của CẢ gallery (server) — KHÔNG lọc từ ảnh đã load,
  // vì khách chưa cuộn hết thì thiếu ảnh → nút "Tải N" báo sai và tải sót.
  const { data: selectedImages = [], mutate: mutateSelectedImages } = useSWR(
    gallery.id && accessUrl && accessToken ? `gallery-selected-${gallery.id}` : null,
    () => getPublicSelectedImages(gallery.id, accessUrl, accessToken),
    { fallbackData: [] },
  );

  // Số ảnh đã chọn CÓ ghi chú — đếm từ gallery_comments (commentsPerImage đã fetch sẵn ở trên),
  // KHÔNG từ cột client_note cũ: d45ea00 đã ngừng ghi cột đó nên ghi chú MỚI không bao giờ được đếm.
  const notedCount = useMemo(
    () => selectedImages.filter((i) => (commentsPerImage[i.id]?.length ?? 0) > 0).length,
    [selectedImages, commentsPerImage],
  );

  // T-20260825: số ẢNH có ≥1 ghi chú trên CẢ gallery — khác notedCount ở trên (đã chọn ∩ có ghi chú,
  // dành cho chip thanh đáy). Ghi chú KHÔNG bắt buộc ảnh phải được chọn (nút ghi chú trong viewer
  // không gate is_selected) nên header phải đếm toàn bộ. commentsPerImage là map cả gallery từ server
  // (không phụ thuộc trang đã cuộn) → đếm key có ≥1 comment là đủ, không cần query thêm.
  const notedImageCount = useMemo(
    () => Object.values(commentsPerImage).filter((list) => list.length > 0).length,
    [commentsPerImage],
  );

  // T-20260825-noted-tab: TOÀN BỘ ảnh có ghi chú của gallery, lấy từ server — KHÔNG lọc từ `images`
  // (ảnh đã tải theo trang) vì ảnh khách note rải khắp album và chuỗi auto-load của grid có lúc kẹt
  // (đo prod: tab ĐÃ CHỌN hiện 40/70). Key null tới khi khách vào tab → không tốn request nếu không dùng.
  // isLoading (SWR 2.4): true trong lần fetch đầu kể cả khi có fallbackData → dùng để không chớp "Chưa có ảnh nào".
  const { data: notedImages = [], isLoading: notedLoading, mutate: mutateNotedImages } = useSWR<GalleryImage[]>(
    gallery.id && accessUrl && accessToken && notedTabTouched ? `gallery-noted-${gallery.id}` : null,
    () => getPublicNotedImages(gallery.id, accessUrl, accessToken),
    { fallbackData: [] },
  );
  const showNotedTab = useCallback(() => {
    setNotedTabTouched(true);
    setActiveGroup("noted");
  }, []);

  // T-20260825-selected-tab: TOÀN BỘ ảnh ĐÃ CHỌN kèm đủ cột render tile — tách khỏi `selectedImages` (3 cột, eager,
  // cho nút Tải) để khách không bấm tab không phải tải thêm ~100KB; lazy như tab GHI CHÚ. KHÔNG lọc từ `images`
  // (ảnh đã tải theo trang): chuỗi auto-load của grid bắn đôi → request trang bị hủy → tab lọc client-side kẹt
  // (đo prod: 40/70, spec §0). Sau khi chọn/bỏ chọn thành công → revalidate để ảnh vào/ra tab.
  const { data: selectedImagesFull = [], isLoading: selectedLoading, mutate: mutateSelectedImagesFull } = useSWR<GalleryImage[]>(
    gallery.id && accessUrl && accessToken && selectedTabTouched ? `gallery-selected-full-${gallery.id}` : null,
    () => getPublicSelectedImagesFull(gallery.id, accessUrl, accessToken),
    { fallbackData: [] },
  );
  const showSelectedTab = useCallback(() => {
    setSelectedTabTouched(true);
    setActiveGroup("selected");
  }, []);

  const selectedCount = stats?.selectedCount || 0;
  const totalImageCount = stats?.imageCount || 0;
  const totalLikes = Object.values(reactionCounts).reduce((sum, c) => sum + c.hearts, 0);

  // ─── SWR Infinite: Gallery Images (network-aware) ─────────
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null; // reached the end
    return `gallery-${gallery.id}-images-page-${pageIndex}-size-${pageSize}`; // Include pageSize in key
  };

  const fetchImagesPage = async (key: string) => {
    const pageStr = key.split('page-')[1].split('-size-')[0];
    const pageIndex = parseInt(pageStr, 10);
    const res = await getPublicGalleryImagesPaginated(
      gallery.id,
      accessToken,
      pageIndex,
      pageSize, // Use adaptive page size
      accessUrl
    );
    if (!res.success || !res.data) throw new Error("Failed to load");
    return res.data;
  };

  const { data: pagesData, size, setSize, isValidating, error: pagesError, mutate: mutatePages } = useSWRInfinite(
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
  // T-20260825-pagination-chain: đang tải trang MỚI = size đã tăng mà pagesData chưa bắt kịp. Bản cũ viết ngược
  // (pagesData.length === size) → false đúng lúc đang tải → spinner không hiện và phanh AUTO-TRIGGER của grid không ăn.
  const loadingMoreImages = isValidating && !!pagesData && size > pagesData.length;

  // Chốt chặn bằng REF như admin đã làm ở use-gallery-data.ts:90-96 (cùng lỗi, đã đo trên prod): sentinel + AUTO-TRIGGER
  // của grid gọi onLoadMore trong CÙNG một tick, `isValidating` (state) chưa kịp đổi → setSize 2 lần → 2 request trang
  // song song → 1 bị net::ERR_ABORTED → trang đó mất (đo prod: 5 request hủy/lượt mở album 517 ảnh; 2G page 20 → ~26).
  // requestedSizeRef = trang cao nhất đã yêu cầu; reset về số trang ĐÃ VỀ mỗi khi pagesData đổi (hoặc lỗi) để trigger
  // kế được nhận và lỗi không kẹt vĩnh viễn.
  const requestedSizeRef = useRef(0);
  useEffect(() => {
    requestedSizeRef.current = pagesData?.length ?? 0;
  }, [pagesData?.length, pagesError]);

  const loadMoreServerImages = useCallback(() => {
    if (!hasMoreImages || !pagesData) return;
    const next = pagesData.length + 1;
    if (requestedSizeRef.current >= next) return; // trang này đã được yêu cầu và đang bay → bỏ qua trigger trùng
    requestedSizeRef.current = next;
    setSize(next);
  }, [hasMoreImages, pagesData, setSize]);

  // ─── Filtered + visible images ──────────────
  // Tab ĐÃ CHỌN: danh sách server, lọc lại theo is_selected để bỏ chọn (vá lạc quan) → tile biến mất ngay như hành vi cũ
  const filteredImages = useMemo(
    () => activeGroup === "selected" ? selectedImagesFull.filter((i) => i.is_selected)
      : activeGroup === "noted" ? notedImages
      : images,
    [images, selectedImagesFull, notedImages, activeGroup],
  );

  const groups = useMemo(() => groupByFileGroup(filteredImages), [filteredImages]);
  const displayImages = useMemo(() => groups.map((g) => g.displayImage), [groups]);

  // T-20260825-noted-tab: xoá ghi chú trong tab GHI CHÚ → ảnh rời tập → viewerIndex có thể vượt tập.
  // Kẹp lúc render (không setState trong effect): lùi về ảnh cuối; tập rỗng thì coi như đã đóng.
  // Tiện thể đúng luôn cho tab ĐÃ CHỌN khi bỏ chọn trong viewer (trước đây viewer render null mà state vẫn "mở").
  const clampedViewerIndex =
    viewerIndex !== null && displayImages.length > 0 ? Math.min(viewerIndex, displayImages.length - 1) : null;

  // ─── Toggle star (selection) ──────────────────
  const handleToggleStar = useCallback(
    async (imageId: string, _currentSelected?: boolean, tokenOverride?: string) => {
      if (isViewOnly) return;
      // Chọn ảnh = input hậu kỳ/in ấn — album có mật khẩu thì CHỈ dâu rể (có pass admin cấp) mới chọn được.
      // tokenOverride: dùng ngay select-token vừa nhận sau khi nhập pass (state chưa kịp flush).
      if (!tokenOverride && gallery.needsPassword && clientCapability === "view") {
        setPendingSelectImageId(imageId);
        setShowSelectPasswordModal(true);
        return;
      }
      // T-20260825-noted-tab: ảnh trong tab GHI CHÚ có thể nằm NGOÀI trang đã tải → tra thêm danh sách noted
      const img = images.find((i) => i.id === imageId) ?? notedImages.find((i) => i.id === imageId) ?? selectedImagesFull.find((i) => i.id === imageId);
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
      // Vá lạc quan cả danh sách noted (nếu đã fetch) — tile trong tab GHI CHÚ phải đổi ✓ ngay như tab TẤT CẢ
      mutateNotedImages((current) => current?.map((i) =>
        i.id === imageId ? { ...i, is_selected: newSelected, selected_at: newSelected ? new Date().toISOString() : null } : i
      ), false);
      mutateSelectedImagesFull((current) => current?.map((i) =>
        i.id === imageId ? { ...i, is_selected: newSelected, selected_at: newSelected ? new Date().toISOString() : null } : i
      ), false);

      setTogglingIds((prev) => new Set(prev).add(imageId));
      
      // SWR Optimistic UI Update for selectedCount
      const optimisticSelectedCount = newSelected ? selectedCount + 1 : Math.max(0, selectedCount - 1);
      mutateStats((prev) => ({ imageCount: totalImageCount, ...prev, selectedCount: optimisticSelectedCount }), false);

      const res = await toggleImageSelection(
        imageId,
        newSelected,
        accessUrl,
        tokenOverride || accessToken,
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
        mutateNotedImages((current) => current?.map((i) =>
          i.id === imageId ? { ...i, is_selected: !newSelected, selected_at: !newSelected ? new Date().toISOString() : null } : i
        ), false);
        mutateSelectedImagesFull((current) => current?.map((i) =>
          i.id === imageId ? { ...i, is_selected: !newSelected, selected_at: !newSelected ? new Date().toISOString() : null } : i
        ), false);
        mutateStats((prev) => ({ imageCount: totalImageCount, ...prev, selectedCount: selectedCount }), false);
      } else if (res.newSelectedCount !== undefined) {
        // Sync with exact server count
        mutateStats((prev) => ({ imageCount: totalImageCount, ...prev, selectedCount: res.newSelectedCount }), false);
        void mutateSelectedImages();
        void mutateSelectedImagesFull(); // ảnh vừa chọn ở tab khác sẽ có mặt khi quay lại tab ĐÃ CHỌN; key null → no-op
      }
      
      setTogglingIds((prev) => { const next = new Set(prev); next.delete(imageId); return next; });
    },
    [accessToken, accessUrl, images, notedImages, selectedImagesFull, isViewOnly, selectedCount, totalImageCount, mutateStats, mutateSelectedImages, mutateNotedImages, mutateSelectedImagesFull, gallery.needsPassword, clientCapability],
  );



  // ─── Toggle reaction (Heart) — persisted + optimistic SWR state ────
  const reactedImageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [imageId, reaction] of Object.entries(clientReactions)) {
      if (reaction?.heart) ids.add(imageId);
    }
    return ids;
  }, [clientReactions]);

  const performToggleReaction = useCallback(
    async (imageId: string, token: string) => {
      const hadHeart = Boolean(clientReactions[imageId]?.heart);
      const optimisticClientReactions = {
        ...clientReactions,
        [imageId]: {
          heart: !hadHeart,
          star: clientReactions[imageId]?.star || false,
        },
      };
      const optimisticReactionCounts = {
        ...reactionCounts,
        [imageId]: {
          hearts: Math.max(0, (reactionCounts[imageId]?.hearts || 0) + (hadHeart ? -1 : 1)),
          stars: reactionCounts[imageId]?.stars || 0,
        },
      };

      mutateClientReactions(optimisticClientReactions, false);
      mutateReactionCounts(optimisticReactionCounts, false);

      const res = await toggleReaction(imageId, gallery.id, "heart", clientId || "guest", accessUrl, token);
      if (!res.success) {
        mutateClientReactions(clientReactions, false);
        mutateReactionCounts(reactionCounts, false);
        return;
      }

      mutateClientReactions();
      mutateReactionCounts();
    },
    [accessUrl, clientId, clientReactions, gallery.id, mutateClientReactions, mutateReactionCounts, reactionCounts],
  );

  const handleToggleReaction = useCallback(
    async (imageId: string) => {
      // Tim = xã giao — người thân/bạn bè thả tự do, KHÔNG hỏi mật khẩu (nghiệp vụ chốt 15/07).
      // Album có pass: server đã cấp view-token nên tim vẫn hoạt động.
      if (!accessToken) return;
      await performToggleReaction(imageId, accessToken);
    },
    [accessToken, performToggleReaction],
  );

  const handleSaveNote = useCallback(
    async (imageId: string, note: string, authorName: string) => {
      // Ghi chú ảnh = chỉ dẫn hậu kỳ — cùng gate mật khẩu với chọn ảnh.
      if (gallery.needsPassword && clientCapability === "view") {
        setShowSelectPasswordModal(true);
        return false;
      }
      if (!clientId) return false;
      const result = await upsertComment(imageId, gallery.id, note, authorName, clientId, accessUrl, accessToken);
      if (result.success) {
        await mutate(`gallery-comments-${gallery.id}`);
        void mutateNotedImages(); // ảnh vào/ra tab GHI CHÚ; key null (chưa vào tab) → no-op
      }
      return result.success;
    },
    [accessToken, accessUrl, clientId, gallery.id, gallery.needsPassword, clientCapability, mutateNotedImages],
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
          <div className="flex min-w-0 items-center gap-2">
            <Camera size={18} className="shrink-0 text-primary opacity-70" />
            <h1 className="text-base font-semibold tracking-tight truncate max-w-[200px] md:max-w-[400px] text-text-primary">
              {gallery.title || "Album ảnh"}
            </h1>
          </div>
          {/* T-20260825: thêm chip 💬 số ảnh có ghi chú (khách hay quên đã note bao nhiêu tấm).
              4 chip @375 ≈ 164px → gap-3 trên mobile + shrink-0 ở đây + min-w-0 ở khối tiêu đề
              để tiêu đề dài bị cắt "…" đúng chỗ thay vì đẩy chip tràn ngang. */}
          <div className="flex shrink-0 items-center gap-3 md:gap-4 text-sm font-medium text-text-secondary">
            <span className="flex items-center gap-1.5"><ImageIcon size={14} className="opacity-60" /> {totalImageCount}</span>
            {/* Số ĐÃ CHỌN — cùng ngôn ngữ nút ✓ trên tile (✓ xanh = chọn, ❤️ đỏ = tim); link view-only vẫn xem được tiến độ chọn */}
            <span className="flex items-center gap-1.5 text-[#34c759]"><CircleCheck size={14} className="fill-[#34c759] text-white" /> {selectedCount}</span>
            <span className="flex items-center gap-1.5 text-[#ff3b30]"><Heart size={14} className="fill-[#ff3b30]" /> {totalLikes}</span>
            {/* 💬 = cùng icon + màu primary với chip trên tile và chip thanh đáy.
                T-20260825-noted-tab: chế độ chọn → nút lọc (bấm = tab GHI CHÚ, bấm lại = TẤT CẢ);
                px-2 -mx-2 để bề rộng không đổi so với M1 (đã đo @375). View-only giữ span tĩnh. */}
            {isViewOnly ? (
              <span className="flex items-center gap-1.5 text-primary" title="Ảnh có ghi chú" aria-label="Ảnh có ghi chú"><MessageSquare size={14} /> {notedImageCount}</span>
            ) : (
              <button
                type="button"
                onClick={() => (activeGroup === "noted" ? setActiveGroup("all") : showNotedTab())}
                className={`flex items-center gap-1.5 rounded-full px-2 -mx-2 py-0.5 text-primary transition-colors ${activeGroup === "noted" ? "bg-primary/10" : "hover:bg-primary/5"}`}
                title={activeGroup === "noted" ? "Bỏ lọc ghi chú" : "Xem ảnh có ghi chú"}
                aria-label="Ảnh có ghi chú"
                aria-pressed={activeGroup === "noted"}
              ><MessageSquare size={14} /> {notedImageCount}</button>
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
              onClick={showSelectedTab}
              className={`py-3 relative transition-colors flex items-center gap-1.5 ${activeGroup === "selected" ? "text-[#ff3b30]" : "text-text-muted hover:text-text-primary"}`}
            >
              ĐÃ CHỌN
              {activeGroup === "selected" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff3b30] rounded-t-full" />}
            </button>
            <button
              onClick={showNotedTab}
              className={`py-3 relative transition-colors flex items-center gap-1.5 ${activeGroup === "noted" ? "text-primary" : "text-text-muted hover:text-text-primary"}`}
            >
              GHI CHÚ
              {activeGroup === "noted" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
            </button>
          </div>
        )}
      </div>



      {/* ── Photo Grid ── */}
      <div className="w-full max-w-[1600px] mx-auto pb-10">
        {/* T-20260825-noted-tab: lần đầu vào tab GHI CHÚ, SWR đang fetch mà groups=[] → grid sẽ hiện
            "Chưa có ảnh nào" rồi mới đổ ảnh (chớp). Hiện spinner (cùng markup "Đang tải thêm ảnh" của grid) tới khi có dữ liệu. */}
        {(activeGroup === "noted" && notedLoading && notedImages.length === 0) ||
         (activeGroup === "selected" && selectedLoading && selectedImagesFull.length === 0) ? (
          <div className="py-16 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-caption text-text-muted">{activeGroup === "selected" ? "Đang tải ảnh đã chọn..." : "Đang tải ảnh có ghi chú..."}</p>
            </div>
          </div>
        ) : (
        <GalleryImageGrid
          groups={groups}
          onImageClick={(idx: number) => setViewerIndex(idx)}
          reactionCounts={reactionCounts}
          onToggleStar={isViewOnly ? undefined : (id: string, sel: boolean) => handleToggleStar(id, sel)}
          onToggleReaction={isViewOnly ? undefined : handleToggleReaction}
          reactedImageIds={reactedImageIds}
          onLoadMore={activeGroup !== "all" ? undefined : loadMoreServerImages}
          loadingMore={activeGroup !== "all" ? false : loadingMoreImages}
          hasMore={activeGroup !== "all" ? false : hasMoreImages}
          publicMode={true}
          showClientNote={!isViewOnly}
          commentsPerImage={commentsPerImage}
        />
        )}
      </div>

      {/* ── Lightbox viewer ── */}
      {clampedViewerIndex !== null && (
        <ImageViewer
          images={displayImages}
          currentIndex={clampedViewerIndex}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
          onToggleStar={(id: string) => handleToggleStar(id)}
          onToggleReaction={handleToggleReaction}
          isReacted={Boolean(reactedImageIds.has(displayImages[clampedViewerIndex]?.id))}
          onSaveNote={handleSaveNote}
          accessUrl={accessUrl}
          clientIdentifier={clientId || ""}
          mode={mode}
          accessToken={accessToken}
          totalImagesCount={activeGroup === "all" ? totalImageCount : activeGroup === "selected" ? selectedCount : notedImageCount}
        />
      )}

      {/* ── Bottom bar ── */}
      {!isViewOnly && (
        <SelectionSummary
          selectedCount={selectedCount}
          totalCount={totalImageCount}
          selectedImages={selectedImages}
          accessToken={accessToken}
          notedCount={notedCount}
        />
      )}

      <HeartPasswordModal
        isOpen={showSelectPasswordModal}
        galleryId={gallery.id}
        accessUrl={accessUrl}
        galleryTitle={gallery.title}
        onClose={() => {
          setShowSelectPasswordModal(false);
          setPendingSelectImageId(null);
        }}
        onUnlocked={async (unlockedGallery) => {
          const nextToken = unlockedGallery.accessToken || "";
          setHeartAccessToken(nextToken);
          if (pendingSelectImageId && nextToken) {
            // Retry lượt CHỌN đang chờ bằng select-token vừa nhận (state chưa kịp flush → truyền thẳng)
            const targetImageId = pendingSelectImageId;
            setPendingSelectImageId(null);
            await handleToggleStar(targetImageId, undefined, nextToken);
          }
        }}
      />
    </div>
  );
}
