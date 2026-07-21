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

function withThumbSize(url: string, size: number): string {
  if (/sz=s\d+/.test(url)) return url.replace(/sz=s\d+/, `sz=s${size}`);
  if (/=s\d+/.test(url)) return url.replace(/=s\d+/, `=s${size}`);
  // Nếu là url lh3 mà chưa có tham số size thì tự thêm
  if (url.includes('lh3.googleusercontent.com') && !url.includes('=s')) {
    return url + `=s${size}`;
  }
  return url;
}

function getPreviewUrls(image: GalleryImage | undefined): { src: string; srcSet?: string } {
  if (!image) return { src: "" };
  // Ưu tiên dùng image_url (lh3) để tránh lỗi redirect chéo tên miền trên mobile Safari
  const base = image.image_url || image.thumbnail_url;
  if (!base) return { src: "" };

  const canResize = /sz=s\d+/.test(base) || /=s\d+/.test(base) || base.includes("lh3.googleusercontent.com");
  if (!canResize) return { src: base };

  const mobile = withThumbSize(base, 1200);
  const desktop = withThumbSize(base, 2048);
  return { src: desktop, srcSet: `${mobile} 1200w, ${desktop} 2048w` };
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
  // Src ảnh đang hiển thị, chụp tại touchstart — cho đường share-sheet ios-webview
  const touchImgSrcRef = useRef<string>("");

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

  const { src, srcSet } = useMemo(() => getPreviewUrls(img), [img]);

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

  // Preload prev/next images
  useEffect(() => {
    const preload = (idx: number) => {
      const next = images[idx];
      if (!next) return null;
      const { src: nextSrc } = getPreviewUrls(next);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "image";
      link.href = nextSrc;
      document.head.appendChild(link);
      return link;
    };

    const links = [preload(currentIdx - 1), preload(currentIdx + 1)].filter(Boolean) as HTMLLinkElement[];
    return () => links.forEach((l) => l.remove());
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
    const platform = detectPlatform();
    // Safari iOS thật: nhường menu nhấn-giữ native "Lưu ảnh" (ổn định từ ee6d5db 21/06).
    if (platform === "ios-safari") return;
    // WebView trong app (Messenger/Zalo): KHÔNG có menu lưu ảnh khi nhấn giữ trang web
    // (user xác nhận trên máy thật 21/07, DOM đã loại trừ overlay/callout). Đường duy nhất
    // là share sheet iOS: fetch bản ĐANG HIỂN THỊ (=s2048, nhẹ — giữ user-activation cho
    // navigator.share) → khách bấm "Lưu ảnh" trong sheet. Không share được → hướng dẫn Safari.
    if (platform === "ios-webview") {
      const displaySrc = touchImgSrcRef.current;
      const fileName = img.file_name || "photo.jpg";
      void (async () => {
        try {
          if (!displaySrc || typeof navigator.share !== "function") throw new Error("share-unavailable");
          const blob = await (await fetch(displaySrc)).blob();
          const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
          if (typeof navigator.canShare === "function" && !navigator.canShare({ files: [file] })) {
            throw new Error("file-share-unavailable");
          }
          await navigator.share({ files: [file] });
        } catch (error) {
          if ((error as Error)?.name === "AbortError") return; // khách tự đóng share sheet
          toast.info("Trình duyệt trong ứng dụng không lưu được ảnh trực tiếp. Bấm nút ⋯ (góc màn hình) → 'Mở bằng trình duyệt' rồi tải nhé.", { duration: 6000 });
        }
      })();
      return;
    }
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
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    const x = e.touches[0]?.clientX;
    const y = e.touches[0]?.clientY;
    if (typeof x === "number") setTouchStartX(x);
    if (typeof y === "number") setTouchStartY(y);
    touchStartTimeRef.current = Date.now();
    touchImgSrcRef.current = e.currentTarget.currentSrc || e.currentTarget.src || "";

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
  const actionButtonStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.70)",
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
      style={{ background: "rgba(0,0,0,0.9)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
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
          {/* Left: Trống */}
          <div className="flex justify-start"></div>

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

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={img.id}
        src={src}
        srcSet={srcSet}
        sizes="(max-width: 768px) 100vw, 95vw"
        alt={img.file_name || "Photo"}
        className={`max-h-[90vh] w-[100vw] max-w-[100vw] object-contain md:w-auto md:max-w-[95vw] transition-transform duration-200 ${longPressActive ? "scale-[0.98]" : ""}`}
        style={{
          borderRadius: "var(--radius-lg)",
          WebkitTouchCallout: showDownloadButton ? "default" : "none",
        }}
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      />

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

      {/* Bottom action bar */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-col items-center gap-3 px-4 pt-4"
          style={{
            paddingBottom: "calc(var(--space-base) + env(safe-area-inset-bottom))",
            paddingLeft: "calc(var(--space-base) + env(safe-area-inset-left))",
            paddingRight: "calc(var(--space-base) + env(safe-area-inset-right))",
          }}
        >
          <div className="flex w-full items-center justify-start">
            <span className="text-caption font-medium text-white/90 bg-black/40 px-3 py-1.5 rounded-full">
              {currentIdx + 1} / {totalImagesCount || images.length}
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            {!isViewOnly && (
              <>
                {/* CircleCheck — chọn ảnh (is_selected) */}
                <Button unstyled
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleStar(img.id); }}
                  style={{
                    ...actionButtonStyle,
                    width: "auto",
                    borderRadius: 9999, // pill rộng — borderRadius 50% của actionButtonStyle sẽ thành elip
                    paddingLeft: 14,
                    paddingRight: 14,
                    gap: 6,
                    background: img.is_selected ? "rgba(34,197,94,0.28)" : actionButtonStyle.background,
                    color: img.is_selected ? "#22c55e" : actionButtonStyle.color,
                    boxShadow: img.is_selected ? "0 0 14px rgba(34,197,94,0.35)" : undefined,
                  }}
                  aria-label={img.is_selected ? "Bỏ chọn ảnh" : "Chọn ảnh"}
                  title={img.is_selected ? "Bỏ chọn ảnh" : "Chọn ảnh"}
                >
                  {/* fill xanh + stroke trắng: tick ✓ trắng nổi trong chấm xanh (stroke mặc định ăn theo color xanh → tick tàng hình) */}
                  <CircleCheck size={18} fill={img.is_selected ? "#22c55e" : "none"} stroke={img.is_selected ? "#ffffff" : "currentColor"} />
                  <span className="text-sm font-medium whitespace-nowrap">{img.is_selected ? "Đã chọn" : "Chọn"}</span>
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
      </div>
    </div>
  );
}
