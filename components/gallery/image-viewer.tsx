"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, Download, Heart, X, CircleCheck, Printer, MessageSquare } from "lucide-react";
import type { GalleryImage } from "@/types/gallery";
import { MAX_NOTE_LENGTH } from "@/types/gallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { detectPlatform } from "@/lib/detect-platform";
import { downloadSingleImage } from "@/lib/gallery-download";
import { getComments, type GalleryComment } from "@/app/actions/gallery-reaction-actions";
import { getResponsiveThumbnailUrl } from "@/components/contracts/gallery/gallery-helpers";

// ═══════════════════════════════════════════
// ImageViewer — Full-screen gallery slider (Public)
// Cloned UI from Admin Gallery Lightbox
// ═══════════════════════════════════════════

interface ImageViewerProps {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onToggleStar: (imageId: string) => void;
  onToggleReaction?: (imageId: string) => void;
  isReacted?: boolean;
  onSaveNote?: (imageId: string, note: string, authorName: string) => Promise<boolean>;
  accessUrl?: string;
  clientIdentifier?: string;
  mode?: "select" | "view";
  accessToken?: string;
  totalImagesCount?: number;
}

// Loader nền PHẢI dùng đúng chuỗi sizes của thẻ <img> thật, nếu không trình duyệt
// chọn candidate khác trong srcSet → tải 2 lần, gắn vào thẻ vẫn trắng.
const PREVIEW_SIZES = "(max-width: 768px) 100vw, 95vw";

function withThumbSize(url: string, size: number): string {
  if (/sz=s\d+/.test(url)) return url.replace(/sz=s\d+/, `sz=s${size}`);
  if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${size}`);
  // Nếu là url lh3 mà chưa có tham số size thì tự thêm
  if (url.includes('lh3.googleusercontent.com') && !url.includes('=s')) {
    return url + `=s${size}`;
  }
  return url;
}

// `full` = bản GỐC (=s0). Menu "Lưu ảnh" native của iOS lưu đúng số byte mà thẻ <img>
// đã tải, nên muốn nhấn-giữ ra ảnh gốc thì chính thẻ <img> phải đang giữ bản gốc.
// Xem useEffect nạp nền bên dưới: mở ảnh hiện bản nhẹ trước, gốc thay vào khi tải xong.
function getPreviewUrls(image: GalleryImage | undefined): { src: string; srcSet?: string; full: string } {
  if (!image) return { src: "", full: "" };
  // Ưu tiên dùng image_url (lh3) để tránh lỗi redirect chéo tên miền trên mobile Safari
  const base = image.image_url || image.thumbnail_url;
  if (!base) return { src: "", full: "" };

  const canResize = /sz=s\d+/.test(base) || /=s\d+/.test(base) || base.includes("lh3.googleusercontent.com");
  if (!canResize) return { src: base, full: base };

  const mobile = withThumbSize(base, 1200);
  const desktop = withThumbSize(base, 2048);
  return { src: desktop, srcSet: `${mobile} 1200w, ${desktop} 2048w`, full: withThumbSize(base, 0) };
}

// iOS device detection (iPad/iPhone/iPod + iPad Pro desktop mode)
// Local copy từ lib/gallery-download.ts pattern — chỉ check tại runtime
// trong handleLongPress, không lưu vào state để tránh hydration mismatch.
function getStoredClientName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("mood_client_name")?.trim() || "";
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export default function ImageViewer({
  images,
  currentIndex,
  onClose,
  onIndexChange,
  onToggleStar,
  onToggleReaction,
  isReacted = false,
  onSaveNote,
  accessUrl = "",
  clientIdentifier = "",
  mode = "select",
  accessToken = "admin",
  totalImagesCount,
}: ImageViewerProps) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [longPressActive, setLongPressActive] = useState(false);

  // ── Note panel state ──────────────────────────────────────────────────────
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [clientName, setClientName] = useState(getStoredClientName);
  const [nameInput, setNameInput] = useState(getStoredClientName);
  const [editingName, setEditingName] = useState(() => !getStoredClientName());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingImageIdRef = useRef<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const downloadingRef = useRef(false); // khoá chống bấm Tải xuống chồng lượt

  const currentIdx = currentIndex;
  const setCurrentIdx = onIndexChange;
  const img = images[currentIdx];
  const commentsKey = img?.id ? `gallery-comments-${img.id}` : null;
  const { data: comments = [], mutate: mutateComments } = useSWR<GalleryComment[]>(
    commentsKey,
    () => img ? getComments(img.id, accessUrl, accessToken, clientIdentifier) : Promise.resolve([]),
    { fallbackData: [] },
  );
  const ownComment = comments.find((comment) => comment.is_mine);
  const otherComments = comments.filter((comment) => !comment.is_mine);

  const { src, srcSet, full } = useMemo(() => getPreviewUrls(img), [img]);

  // Ảnh chờ = ĐÚNG url ô lưới đang dùng (=s600) → đã nằm trong cache trình duyệt nên vẽ
  // ngay (đo prod: load 0ms, transferSize 0). Trước đây thẻ <img> trống 0,3–2,3s vì bản
  // =s2048 phải tải mới hoàn toàn — khách thấy màn đen rồi ảnh mới bung ra.
  const placeholder = useMemo(
    () => (img ? getResponsiveThumbnailUrl(img.thumbnail_url, img.image_url, 600) : ""),
    [img],
  );

  // Nạp nền bản xem rồi mới gắn vào thẻ — đổi src trực tiếp sẽ có khoảnh khắc thẻ rỗng.
  const [previewState, setPreviewState] = useState<{ key: string; ok: boolean } | null>(null);
  const previewReady = Boolean(src) && previewState?.key === src && previewState.ok;

  useEffect(() => {
    if (!src || src === placeholder) return;
    let cancelled = false;
    const loader = new window.Image();
    if (srcSet) {
      loader.sizes = PREVIEW_SIZES;
      loader.srcset = srcSet;
    }
    loader.onload = () => {
      if (!cancelled) setPreviewState({ key: src, ok: true });
    };
    loader.onerror = () => {
      if (!cancelled) setPreviewState({ key: src, ok: false });
    };
    loader.src = src;
    return () => {
      cancelled = true;
      loader.onload = null;
      loader.onerror = null;
      loader.src = ""; // huỷ request khi đổi ảnh nhanh
      loader.srcset = "";
    };
  }, [src, srcSet, placeholder]);

  // Nạp nền bản gốc (=s0) rồi thay vào thẻ <img>, để nhấn-giữ lưu được ảnh gốc.
  // HOÃN tới khi bản xem đã hiện: đo prod cho thấy bản gốc 19,4 MB chạy SONG SONG với bản
  // 450 KB ngay từ đầu và giành băng thông của nó — khách 4G lãnh đủ.
  // State gắn KHÓA theo url gốc (mỗi ảnh 1 url riêng) thay vì reset trong effect —
  // tránh setState đồng bộ trong effect (react-hooks/set-state-in-effect).
  const [fullState, setFullState] = useState<{ key: string; ok: boolean } | null>(null);
  const needsUpgrade = Boolean(full && full !== src);
  const fullSrc = needsUpgrade && fullState?.key === full && fullState.ok ? full : null;
  const loadingFull = needsUpgrade && fullState?.key !== full;

  useEffect(() => {
    if (!full || full === src) return;
    if (!previewReady) return;
    let cancelled = false;
    const loader = new window.Image();
    loader.src = full;
    // decode() thay onload: onload = bytes về + parse xong nhưng CHƯA decode bitmap —
    // swap lúc đó browser phải decode bản gốc ~19MB ngay trên đường paint → chính là
    // cú "chớp" user thấy. decode() xong bitmap nằm sẵn trong decoded-image cache,
    // mount layer là paint liền (pattern PhotoSwipe/Immich/Google Photos).
    loader
      .decode()
      .then(() => {
        if (!cancelled) setFullState({ key: full, ok: true });
      })
      .catch(() => {
        if (cancelled) return;
        // Safari có thể reject decode() dù ảnh đã tải xong — complete+naturalWidth là nguồn chân lý
        if (loader.complete && loader.naturalWidth > 0) setFullState({ key: full, ok: true });
        else setFullState({ key: full, ok: false });
      });
    return () => {
      cancelled = true;
      // Huỷ hẳn request khi lướt nhanh — bản gốc của ảnh CŨ từng tải tiếp ngầm,
      // giành băng thông làm ảnh đang xem lâu ready hơn.
      loader.src = "";
    };
  }, [full, src, previewReady]);

  // Decode capability from token if not admin
  let clientCapability = "select";
  if (accessToken && accessToken !== "admin") {
    try {
      const [bodyPart] = accessToken.split(".");
      const payload = JSON.parse(atob(bodyPart.replace(/-/g, "+").replace(/_/g, "/")));
      clientCapability = payload.capability || "select";
    } catch {}
  }

  const showDownloadButton = Boolean(img?.drive_file_id && (accessToken === "admin" || clientCapability !== "view"));

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Preload prev/next images — Image() + srcset mirror y hệt thẻ thật để browser tự chọn
  // ĐÚNG candidate (mobile =s1200). Bản cũ dùng <link prefetch href==s2048> → mobile thẻ
  // thật xin =s1200: trượt cache, tải thừa, bấm next vẫn chờ (albumse prefetch kiểu này).
  useEffect(() => {
    const preload = (idx: number) => {
      const neighbor = images[idx];
      if (!neighbor) return null;
      const { src: nSrc, srcSet: nSrcSet } = getPreviewUrls(neighbor);
      if (!nSrc) return null;
      const loader = new window.Image();
      if (nSrcSet) {
        loader.sizes = PREVIEW_SIZES;
        loader.srcset = nSrcSet;
      }
      loader.src = nSrc;
      return loader;
    };

    const loaders = [preload(currentIdx - 1), preload(currentIdx + 1)].filter(Boolean) as HTMLImageElement[];
    return () => loaders.forEach((l) => { l.src = ""; l.srcset = ""; });
  }, [currentIdx, images]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (noteOpen) {
          setNoteOpen(false);
        } else {
          onClose();
        }
      }
      if (e.key === "ArrowLeft") setCurrentIdx(Math.max(0, currentIdx - 1));
      if (e.key === "ArrowRight") setCurrentIdx(Math.min(images.length - 1, currentIdx + 1));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIdx, images.length, onClose, setCurrentIdx, noteOpen]);


  // ── Sync noteText khi user chuyển ảnh ─────────────────────────────────────
  useEffect(() => {
    if (!img) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNoteText("");
      setCurrentNote(null);
      editingImageIdRef.current = null;
      return;
    }
    if (img.id !== editingImageIdRef.current) {
      const initialNote = ownComment?.content || "";
      setNoteText(initialNote);
      setCurrentNote(initialNote || null);
      editingImageIdRef.current = img.id;
    }
  }, [img, ownComment?.content]);

  useEffect(() => {
    if (!ownComment?.content || noteText || currentNote) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNoteText(ownComment.content);
    setCurrentNote(ownComment.content);
  }, [currentNote, noteText, ownComment?.content]);

  const saveNote = useCallback(async (editingId: string, nextNote: string) => {
    const authorName = (editingName ? nameInput : clientName).trim();
    if (!authorName) {
      toast.error("Nhập tên để Mood biết ai dặn nhé");
      return false;
    }

    localStorage.setItem("mood_client_name", authorName);
    setClientName(authorName);
    setNameInput(authorName);
    setEditingName(false);

    const previousComments = comments;
    const trimmedNote = nextNote.trim();
    const optimisticComment: GalleryComment = {
      id: ownComment?.id || "optimistic-" + editingId,
      image_id: editingId,
      gallery_id: ownComment?.gallery_id || "",
      content: trimmedNote,
      author_name: authorName,
      is_mine: true,
      created_at: ownComment?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const optimisticComments = trimmedNote
      ? [...comments.filter((comment) => !comment.is_mine), optimisticComment]
      : comments.filter((comment) => !comment.is_mine);
    await mutateComments(optimisticComments, false);

    const saved = await onSaveNote?.(editingId, nextNote, authorName);
    if (!saved) {
      await mutateComments(previousComments, false);
      return false;
    }
    await mutateComments();
    return true;
  }, [clientName, comments, editingName, mutateComments, nameInput, onSaveNote, ownComment]);

  // ── Auto-save note với debounce 800ms ─────────────────────────────────────
  useEffect(() => {
    if (!onSaveNote) return;
    const editingId = editingImageIdRef.current;
    if (!editingId) return;
    const initialNote = ownComment?.content || "";
    if (noteText === initialNote) return;

    const timer = setTimeout(() => {
      if (!editingImageIdRef.current) return;
      setSavingNote(true);
      void saveNote(editingId, noteText)
        .then((saved) => {
          if (saved && editingImageIdRef.current === editingId) {
            setCurrentNote(noteText.trim() ? noteText : null);
            toast.success("Đã lưu ghi chú");
          }
        })
        .catch((error: unknown) => {
          console.error("[image-viewer] save note error:", error);
          toast.error("Không thể lưu ghi chú");
        })
        .finally(() => setSavingNote(false));
    }, 800);

    debounceTimerRef.current = timer;
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [noteText, onSaveNote, ownComment?.content, saveNote]);

  // Cleanup final khi unmount: clear timer & reset editing ref
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      editingImageIdRef.current = null;
    };
  }, []);

  // Long-press ≥500ms không di chuyển → trigger download.
  // iOS Safari TỰ hiện contextmenu "Lưu ảnh" sau ~500ms giữ tay, nên ở đây ta
  // skip hoàn toàn (return early) để không override native UX. Non-iOS giữ nguyên.
  const handleLongPress = useCallback(() => {
    // Guard TRƯỚC: nếu không được phép download (vd capability="view") thì return luôn,
    // kể cả trên iOS — không cho native "Lưu ảnh" lộ ra khi user không có quyền.
    if (!showDownloadButton || !img) return;
    // iOS (Safari lẫn in-app WebView): nhường menu nhấn-giữ native của trình duyệt —
    // callout đã LUÔN bật (xem style img). Root cause lịch sử: không phải WebView thiếu
    // menu, mà là WebkitTouchCallout:"none" theo showDownloadButton tắt nó với view-token.
    // KHÔNG chen share-sheet/toast vào gesture native (bài học 21/07).
    const platform = detectPlatform();
    if (platform === "ios-safari" || platform === "ios-webview") return;
    // Visual feedback: scale 0.98 ngay, reset sau 300ms
    setLongPressActive(true);
    setTimeout(() => setLongPressActive(false), 300);
    // Haptic feedback (best-effort)
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(50);
      } catch {
        // ignore: vibration API có thể throw trên một số trình duyệt
      }
    }
    // Fire download (không await để không block UI)
    void downloadSingleImage(accessToken, img.id, img.file_name || "photo.jpg");
  }, [showDownloadButton, img, accessToken]);

  if (!img) return null;

  const downloadFileName = img.file_name || "photo.jpg";

  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!showDownloadButton) return;
    // Khoá chống bấm chồng lượt: ảnh gốc ~8-20MB tải lâu, user bấm thêm sẽ spawn
    // nhiều lượt download song song (vụ 3 toast chồng nhau 09/08 — DSC_0067).
    if (downloadingRef.current) {
      toast.info("Đang tải ảnh, chờ chút nhé…", { duration: 2500 });
      return;
    }
    downloadingRef.current = true;
    try {

    if (detectIOS()) {
      // In-app browser (Messenger/Zalo/FB...) chặn window.open → nút tải chết câm.
      // Không có cách tải trực tiếp trong WebView đó — hướng dẫn thoát ra Safari.
      if (detectPlatform() === "ios-webview") {
        toast.info("Trình duyệt trong ứng dụng không lưu được ảnh. Bấm nút ⋯ (góc màn hình) → 'Mở bằng trình duyệt' rồi tải nhé.", { duration: 6000 });
        return;
      }
      const tab = window.open("", "_blank");
      if (!tab) {
        // Popup bị chặn (kể cả Safari thật khi user bật chặn popup)
        toast.info("Trình duyệt chặn mở tab ảnh. Cho phép popup cho trang này rồi thử lại nhé.", { duration: 6000 });
        return;
      }
      try {
        const response = await fetch(`/api/gallery-download/${accessToken}/${img.id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (data.url) {
          tab.location.href = data.url;
        } else {
          tab.close();
        }
      } catch (error) {
        console.error("[image-viewer][ios-download] Error:", error);
        tab?.close();
      }
      return;
    }

    // Dùng downloadSingleImage lib: blob + retry + iOS Safari support (xem lib/gallery-download.ts).
    await downloadSingleImage(accessToken, img.id, downloadFileName);
    } finally {
      downloadingRef.current = false;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    const x = e.touches[0]?.clientX;
    const y = e.touches[0]?.clientY;
    if (typeof x === "number") setTouchStartX(x);
    if (typeof y === "number") setTouchStartY(y);
    touchStartTimeRef.current = Date.now();

    // Clear any pending long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    // Set long-press timer (500ms) — nếu user giữ tay ≥500ms không di chuyển → trigger download
    longPressTimerRef.current = setTimeout(() => {
      handleLongPress();
      longPressTimerRef.current = null;
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLImageElement>) => {
    // Clear long-press timer (đã trigger hoặc user nhả tay sớm)
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (touchStartX === null) return;
    const x = e.changedTouches[0]?.clientX;
    const elapsed = Date.now() - touchStartTimeRef.current;
    setTouchStartX(null);
    setTouchStartY(null);
    if (typeof x !== "number") return;

    const diff = touchStartX - x;
    // Long-press đã trigger ở timer → return để KHÔNG xử lý swipe
    if (elapsed >= 500 && Math.abs(diff) < 10) return;
    // Swipe ngang ngắn → bỏ qua
    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      setCurrentIdx(Math.min(images.length - 1, currentIdx + 1));
    } else {
      setCurrentIdx(Math.max(0, currentIdx - 1));
    }
  };

  // Cancel long-press nếu touch bị hủy (VD: alert xuất hiện)
  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const isViewOnly = mode === "view";
  const noteIsActive = Boolean(currentNote?.trim());
  // Chip trắng nhỏ nổi trên ảnh (mẫu albumse) — nền trắng mờ + icon sẫm + bóng nhẹ,
  // thay kiểu chấm đen cũ vốn chỉ đọc được trên nền tối.
  const actionButtonStyle: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.92)",
    color: "rgba(45,45,45,0.72)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    cursor: "pointer",
    border: "none",
  };

  const handleSaveNoteNow = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onSaveNote) { setNoteOpen(false); return; }
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
    const editingId = editingImageIdRef.current ?? img.id;
    setSavingNote(true);
    void saveNote(editingId, noteText)
      .then((saved) => {
        if (!saved) return;
        if (editingImageIdRef.current === editingId) { setCurrentNote(noteText.trim() ? noteText : null); toast.success("Đã lưu ghi chú"); }
        setNoteOpen(false);
      })
      .catch((error: unknown) => { console.error("[image-viewer] save note error:", error); toast.error("Không thể lưu ghi chú"); })
      .finally(() => setSavingNote(false));
  };

  return (
    <div
      className="fixed inset-0 z-(--z-modal) flex items-center justify-center"
      // Đen đặc (không phải 0.9) — có lớp ambient blur rồi thì để trang sau xuyên 10%
      // chỉ làm nền đục + lộ chữ grid phía sau.
      style={{ background: "#000" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Nền ambient kiểu albumse: chính tấm ảnh (bản thumbnail) blur phủ toàn màn
          thay nền đen trần — dùng placeholder (=s600 đã có sẵn từ grid, không tốn request). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={`bg-${img.id}`}
        src={placeholder}
        alt=""
        aria-hidden
        draggable={false}
        // -z-10: absolute mặc định vẽ ĐÈ lên ảnh nét in-flow (paint order) → phải đẩy
        // xuống dưới ảnh, trên nền đen của root (root có stacking context riêng).
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-110 object-cover opacity-50 blur-2xl"
      />

      {/* Top bar */}
      <div
        className="absolute inset-x-0 top-0 z-20 bg-linear-to-b from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="grid grid-cols-3 items-center px-4 py-3"
          style={{
            paddingTop: "calc(var(--space-base) + env(safe-area-inset-top))",
            paddingLeft: "calc(var(--space-base) + env(safe-area-inset-left))",
            paddingRight: "calc(var(--space-base) + env(safe-area-inset-right))",
          }}
        >
          {/* Left: đếm vị trí ảnh — dời từ bar đáy lên đây để bar đáy gọn (mẫu albumse) */}
          <div className="flex justify-start">
            <span className="text-caption font-medium text-white/90 bg-black/30 px-3 py-1 rounded-full whitespace-nowrap">
              {currentIdx + 1} / {totalImagesCount || images.length}
            </span>
          </div>

          {/* Center: File name */}
          <div className="flex justify-center min-w-0">
            <span className="text-sm font-medium text-white/90 truncate px-3 py-1 bg-black/30 rounded-full max-w-[200px] md:max-w-[400px]">
              {img.file_name || "Photo"}
            </span>
          </div>

          {/* Right: Close */}
          <div className="flex justify-end items-center">
            <Button
              unstyled
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="inline-flex items-center justify-center"
              style={{
                width: "var(--icon-container-sm)",
                height: "var(--icon-container-sm)",
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.85)",
              }}
              aria-label="Đóng"
              title="Đóng"
            >
              <X size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {currentIdx > 0 && (
        <Button
          unstyled
          type="button"
          className="absolute z-20 inline-flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setCurrentIdx(Math.max(0, currentIdx - 1)); }}
          aria-label="Ảnh trước"
          title="Ảnh trước"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            left: "calc(var(--space-base) + env(safe-area-inset-left))",
            width: "var(--icon-container-sm)",
            height: "var(--icon-container-sm)",
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <ChevronLeft size={22} />
        </Button>
      )}
      {currentIdx < images.length - 1 && (
        <Button
          unstyled
          type="button"
          className="absolute z-20 inline-flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); setCurrentIdx(Math.min(images.length - 1, currentIdx + 1)); }}
          aria-label="Ảnh tiếp theo"
          title="Ảnh tiếp theo"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            right: "calc(var(--space-base) + env(safe-area-inset-right))",
            width: "var(--icon-container-sm)",
            height: "var(--icon-container-sm)",
            borderRadius: "var(--radius-md)",
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <ChevronRight size={22} />
        </Button>
      )}

      {/* Wrapper relative shrink-wrap ảnh — mẫu albumse: ảnh phóng TỐI ĐA, hàng chip
          neo vào MÉP DƯỚI TRONG LÒNG ảnh (không neo viewport, không chừa dải đáy —
          bản chừa dải trước đó làm ảnh dọc trên phone kẹp giữa 2 dải đen, chip rơi
          ra ngoài ảnh: ngược mẫu, user bắt lỗi 09/08). */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Layer PREVIEW — không bao giờ nhận fullSrc nữa. Bản cũ swap src+gỡ srcSet/sizes
          trên cùng thẻ khi bản gốc về → browser re-select ảnh 2-3 lần, WebKit vẽ frame
          rỗng = cú "chớp". Giờ preview nằm yên, bản gốc mount thành layer riêng đè lên. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={img.id}
        src={previewReady ? src : placeholder}
        srcSet={previewReady ? srcSet : undefined}
        sizes={previewReady ? PREVIEW_SIZES : undefined}
        alt={img.file_name || "Photo"}
        // md:h-[...]: desktop lấy chiều cao theo khung chứ không theo kích thước nội tại.
        // Không có nó, ảnh chờ (=s600) hiện nhỏ rồi NỞ ra khi bản xem vào. Mobile giữ nguyên:
        // đã khoá w-[100vw] nên hai bản cùng bề ngang, không nhảy.
        // Full-bleed theo mẫu albumse: mobile hết cỡ theo màn, desktop 98vh sát mép.
        className={`max-h-[100dvh] w-[100vw] max-w-[100vw] object-contain md:h-[98vh] md:max-h-[98vh] md:w-auto md:max-w-[95vw] transition-transform duration-200 ${longPressActive ? "scale-[0.98]" : ""}`}
        style={{
          borderRadius: "var(--radius-lg)",
          // LUÔN bật menu nhấn-giữ native (Safari + WebView Messenger/Zalo đều tôn trọng
          // thuộc tính này). Điều kiện cũ theo showDownloadButton (17120c6) đã TẮT nhấn giữ
          // cho khách view-token từ khi album có mật khẩu (dc9b1d9) — sai nghiệp vụ ADR-008:
          // "xem thì vẫn được, chỉ cần pass khi bấm CHỌN"; lưu bản hiển thị là hành vi XEM.
          WebkitTouchCallout: "default",
        }}
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      />

      {/* Layer BẢN GỐC — chỉ mount SAU khi loader decode() xong (bitmap sẵn trong cache
          decode → paint tức thì, decoding="sync" an toàn). Cùng geometry với preview
          (absolute inset-0 + object-contain) nên thay thế không dịch chuyển pixel.
          Phải nhận đủ touch handler + WebkitTouchCallout: nhấn-giữ iOS lưu bytes của
          THẺ TRÊN CÙNG — đây chính là đường "lưu ảnh gốc" (ADR-008). */}
      {fullSrc && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={`full-${img.id}`}
          src={fullSrc}
          alt={img.file_name || "Photo"}
          decoding="sync"
          className={`absolute inset-0 h-full w-full object-contain transition-transform duration-200 ${longPressActive ? "scale-[0.98]" : ""}`}
          style={{ borderRadius: "var(--radius-lg)", WebkitTouchCallout: "default" }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        />
      )}

      {/* Nhấn giữ chỉ lưu được ảnh gốc SAU khi bản gốc nạp xong — báo cho khách biết
          để không lưu nhầm bản nhẹ rồi tưởng ảnh mờ. */}
      {loadingFull && showDownloadButton && (
        <div
          className="pointer-events-none absolute bottom-20 left-1/2 z-30 -translate-x-1/2 px-3 py-1.5 text-xs font-medium"
          style={{
            background: "rgba(0,0,0,0.55)",
            color: "rgba(255,255,255,0.92)",
            borderRadius: "9999px",
          }}
        >
          Đang tải ảnh gốc…
        </div>
      )}

      {noteOpen && onSaveNote && !isViewOnly && (
        <div
          className="absolute bottom-24 left-1/2 z-30 w-[min(320px,90vw)] -translate-x-1/2 p-4 shadow-2xl"
          style={{
            background: "rgba(255,248,220,0.97)",
            borderRadius: "var(--radius-xl, 16px)",
            color: "rgba(30, 25, 15, 0.92)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Ghi chú cho ảnh</h2>
            <Button unstyled
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNoteOpen(false);
              }}
              className="inline-flex items-center justify-center"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.06)",
                color: "rgba(30,25,15,0.75)",
                border: "none",
                cursor: "pointer",
              }}
              aria-label="Đóng ghi chú"
              title="Đóng"
            >
              <X size={16} />
            </Button>
          </div>
          {editingName || !clientName ? (
            <Input
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value.slice(0, 50))}
              onClick={(event) => event.stopPropagation()}
              label="Tên của bạn"
              placeholder="Vd: Dịu Êm"
              maxLength={50}
              autoFocus
              className="mb-3"
            />
          ) : (
            <p className="mb-3 text-tiny text-text-muted">Ghi chú của {clientName} · <Button unstyled type="button" className="underline" onClick={() => setEditingName(true)}>Đổi tên</Button></p>
          )}
          <Textarea
            unstyled
            value={noteText}
            onChange={(e) => setNoteText(e.target.value.slice(0, MAX_NOTE_LENGTH))}
            onClick={(e) => e.stopPropagation()}
            placeholder="Nhập ghi chú..."
            maxLength={MAX_NOTE_LENGTH}
            rows={4}
            className="w-full resize-none rounded-md text-base outline-none"
            style={{
              fontSize: "16px",
              lineHeight: 1.5,
              background: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(120, 90, 30, 0.18)",
              color: "rgba(30,25,15,0.92)",
              padding: "10px 12px",
            }}
            aria-label="Nội dung ghi chú"
          />
          {otherComments.length > 0 && (
            <div className="mt-3 space-y-1 rounded-md bg-bg-subtle p-2 text-body-sm text-text-secondary">
              {otherComments.map((comment) => (
                <p key={comment.id}><span className="font-medium">{comment.author_name || "Khách"}</span> — {comment.content}</p>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`text-caption font-medium ${
                noteText.length >= MAX_NOTE_LENGTH ? "text-error" : "text-text-muted"
              }`}
            >
              {noteText.length}/{MAX_NOTE_LENGTH}
              {savingNote ? " · đang lưu..." : ""}
            </span>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button unstyled
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNoteOpen(false);
              }}
              className="px-3 py-2 text-sm font-semibold"
              style={{
                borderRadius: "var(--radius-md)",
                background: "transparent",
                color: "rgba(30,25,15,0.68)",
                border: "1px solid rgba(30,25,15,0.14)",
                cursor: "pointer",
              }}
            >
              Huỷ
            </Button>
            <Button unstyled
              type="button"
              onClick={handleSaveNoteNow}
              className="px-3 py-2 text-sm font-semibold"
              style={{
                borderRadius: "var(--radius-md)",
                background: "#fbbf24",
                color: "rgba(30,25,15,0.95)",
                border: "1px solid rgba(180, 83, 9, 0.18)",
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(251,191,36,0.28)",
              }}
            >
              Lưu ghi chú
            </Button>
          </div>
        </div>
      )}

      {/* Hàng chip hành động — neo MÉP DƯỚI TRONG LÒNG ảnh (wrapper relative),
          chip trắng nhỏ nổi trên ảnh đúng mẫu albumse; không gradient, không text. */}
      <div
        className="absolute inset-x-0 z-20"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2.5">
            {!isViewOnly && (
              <>
                {/* CircleCheck — chọn ảnh (is_selected) */}
                <Button unstyled
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleStar(img.id); }}
                  style={{
                    ...actionButtonStyle,
                    background: img.is_selected ? "rgba(34,197,94,0.28)" : actionButtonStyle.background,
                    color: img.is_selected ? "#22c55e" : actionButtonStyle.color,
                    boxShadow: img.is_selected ? "0 0 14px rgba(34,197,94,0.35)" : undefined,
                  }}
                  aria-label={img.is_selected ? "Bỏ chọn ảnh" : "Chọn ảnh"}
                  title={img.is_selected ? "Bỏ chọn ảnh" : "Chọn ảnh"}
                >
                  {/* fill xanh + stroke trắng: tick ✓ trắng nổi trong chấm xanh (stroke mặc định ăn theo color xanh → tick tàng hình) */}
                  <CircleCheck size={20} fill={img.is_selected ? "#22c55e" : "none"} stroke={img.is_selected ? "#ffffff" : "currentColor"} />
                </Button>

                {/* Heart — reaction độc lập (isReacted) */}
                <Button unstyled
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleReaction?.(img.id);
                  }}
                  style={{
                    ...actionButtonStyle,
                    background: isReacted ? "rgba(255,59,48,0.22)" : actionButtonStyle.background,
                    color: isReacted ? "#ff3b30" : actionButtonStyle.color,
                    boxShadow: isReacted ? "0 0 14px rgba(255,59,48,0.35)" : undefined,
                    opacity: onToggleReaction ? 1 : 0.4,
                    cursor: onToggleReaction ? "pointer" : "default",
                  }}
                  aria-label={isReacted ? "Bỏ yêu thích" : "Yêu thích"}
                  title={isReacted ? "Bỏ yêu thích" : "Yêu thích"}
                  aria-disabled={!onToggleReaction}
                >
                  <Heart size={20} className={isReacted ? "fill-error text-error" : ""} />
                </Button>
              </>
            )}
            <Button unstyled
              type="button"
              onClick={(e) => e.stopPropagation()}
              style={{
                ...actionButtonStyle,
                opacity: 0.5,
              }}
              aria-label="In ảnh"
              title="In ảnh"
            >
              <Printer size={20} />
            </Button>
            {!isViewOnly && (
              <Button unstyled
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSaveNote) setNoteOpen(true);
                }}
                style={{
                  ...actionButtonStyle,
                  background: noteIsActive ? "rgba(251,191,36,0.20)" : actionButtonStyle.background,
                  color: noteIsActive ? "#fbbf24" : actionButtonStyle.color,
                  cursor: onSaveNote ? "pointer" : "default",
                  opacity: onSaveNote ? 1 : 0.3,
                }}
                aria-label={noteIsActive ? "Sửa ghi chú" : "Thêm ghi chú"}
                title={noteIsActive ? "Sửa ghi chú" : "Thêm ghi chú"}
                aria-disabled={!onSaveNote}
              >
                <MessageSquare size={20} />
              </Button>
            )}
            <Button unstyled
              type="button"
              onClick={showDownloadButton ? handleDownload : (e) => e.stopPropagation()}
              style={{
                ...actionButtonStyle,
                cursor: showDownloadButton ? "pointer" : "default",
                opacity: showDownloadButton ? 1 : 0.3,
              }}
              aria-label="Tải xuống"
              title="Tải xuống"
              aria-disabled={!showDownloadButton}
            >
              <Download size={20} />
            </Button>
        </div>
      </div>
      </div>{/* đóng wrapper relative của ảnh + chip */}
    </div>
  );
}
