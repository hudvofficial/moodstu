"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Download, Check, Shield, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast-utils";
import {
  prepareGalleryShare,
  setGalleryPassword,
} from "@/app/actions/gallery-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GalleryShareDetails, GalleryShareLink } from "@/types/gallery";

// ═══════════════════════════════════════════
// ShareGalleryModalContent — 2 links + 2 QR codes
// Render inside GlobalModal via openModal("SHARE_GALLERY")
// ═══════════════════════════════════════════

interface ShareGalleryModalContentProps {
  accessUrl?: string;
  customSlug?: string | null;
  galleryId?: string;
  galleryTitle?: string;
  hasPassword?: boolean;
  shareLinks?: GalleryShareLink[];
  status?: string;
  onPublishSuccess?: () => void;
  onSharePrepared?: (details: GalleryShareDetails) => void;
}

export function ShareGalleryModalContent({
  accessUrl,
  customSlug,
  galleryId,
  galleryTitle,
  hasPassword = false,
  shareLinks: initialShareLinks = [],
  status = "draft",
  onPublishSuccess,
  onSharePrepared,
}: ShareGalleryModalContentProps) {
  const safeGalleryId = galleryId || "";
  const hasMinimumData = Boolean(galleryId);

  const [localStatus, setLocalStatus] = useState(status);
  const [isPreparing, setIsPreparing] = useState(
    status !== "shared" || initialShareLinks.length === 0 || !accessUrl,
  );
  const [shareLinks, setShareLinks] = useState<GalleryShareLink[]>(initialShareLinks);
  const [localAccessUrl, setLocalAccessUrl] = useState(accessUrl || "");
  const [copiedSelect, setCopiedSelect] = useState(false);
  const [copiedView, setCopiedView] = useState(false);
  const [pwdEnabled, setPwdEnabled] = useState(hasPassword);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  
  const qrSelectRef = useRef<HTMLDivElement>(null);
  const qrViewRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrSelectInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrViewInstance = useRef<any>(null);

  const selectSlug = customSlug || shareLinks.find((link) => link.capability === "select")?.slug || localAccessUrl;
  const viewSlug = shareLinks.find((link) => link.capability === "view")?.slug || "";
  const canShowShareLinks = Boolean(localAccessUrl && safeGalleryId && localStatus === "shared");
  
  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/gallery/${selectSlug}`
    : `/gallery/${selectSlug}`;
  
  const viewOnlyUrl = customSlug 
    ? (typeof window !== "undefined" ? `${window.location.origin}/gallery/${customSlug}?mode=view` : `/gallery/${customSlug}?mode=view`)
    : viewSlug
      ? (typeof window !== "undefined"
        ? `${window.location.origin}/gallery/${viewSlug}`
        : `/gallery/${viewSlug}`)
      : `${baseUrl}?mode=view`;

  // ─── QR Code Generation ───────────────────
  const generateQR = useCallback(async () => {
    if (!canShowShareLinks) return;
    const QRCodeStyling = (await import("qr-code-styling")).default;

    const qrOptions = (url: string) => ({
      width: 128,
      height: 128,
      data: url,
      dotsOptions: {
        color: "var(--color-text-primary)",
        type: "rounded" as const,
      },
      cornersSquareOptions: { type: "extra-rounded" as const },
      backgroundOptions: { color: "transparent" },
    });

    // Select link QR
    if (qrSelectRef.current) {
      qrSelectRef.current.innerHTML = "";
      qrSelectInstance.current = new QRCodeStyling(qrOptions(baseUrl));
      qrSelectInstance.current.append(qrSelectRef.current);
    }

    // View-only link QR
    if (qrViewRef.current) {
      qrViewRef.current.innerHTML = "";
      qrViewInstance.current = new QRCodeStyling(qrOptions(viewOnlyUrl));
      qrViewInstance.current.append(qrViewRef.current);
    }
  }, [baseUrl, canShowShareLinks, viewOnlyUrl]);

  useEffect(() => {
    if (!canShowShareLinks || isPreparing) return;
    // Slight delay to ensure DOM is ready after isPreparing becomes false
    const timer = setTimeout(() => {
      void generateQR();
    }, 50);
    return () => clearTimeout(timer);
  }, [generateQR, canShowShareLinks, isPreparing]);

  const applyPreparedShare = useCallback((details: GalleryShareDetails) => {
    setShareLinks(details.shareLinks);
    setLocalAccessUrl(details.accessUrl || "");
    setLocalStatus(details.status);
    onSharePrepared?.(details);
  }, [onSharePrepared]);

  // ─── Publish handlers ─────────────────────
  const handlePrepareShare = useCallback(async () => {
    if (!safeGalleryId) return;
    const shouldAnnouncePublish = localStatus !== "shared";
    setPrepareError(null);
    setIsPreparing(true);
    const res = await prepareGalleryShare(safeGalleryId);
    if (res.success) {
      if (res.data) {
        applyPreparedShare(res.data);
      }
      if (shouldAnnouncePublish) {
        toast("Đã phát hành Album thành công!", "success");
      }
      onPublishSuccess?.();
    } else {
      setPrepareError(res.error || "Không thể phát hành Album.");
      toast(res.error || "Không thể phát hành Album.", "error");
    }
    setIsPreparing(false);
  }, [applyPreparedShare, localStatus, onPublishSuccess, safeGalleryId]);

  useEffect(() => {
    if (!safeGalleryId) return;
    if (localStatus === "shared" && localAccessUrl && shareLinks.length > 0) {
      setIsPreparing(false);
      return;
    }
    void handlePrepareShare();
    // Run once per modal open. Local state is updated by handlePrepareShare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeGalleryId]);

  // ─── Copy helpers ─────────────────────────
  const handleCopy = async (url: string, type: "select" | "view") => {
    try {
      await navigator.clipboard.writeText(url);
      if (type === "select") {
        setCopiedSelect(true);
        setTimeout(() => setCopiedSelect(false), 2000);
      } else {
        setCopiedView(true);
        setTimeout(() => setCopiedView(false), 2000);
      }
      toast("Đã sao chép link!", "success");
    } catch {
      toast("Không thể sao chép. Hãy copy thủ công.", "error");
    }
  };

  // ─── Password handlers ────────────────────
  const handleTogglePassword = async () => {
    if (!safeGalleryId) return;
    if (pwdEnabled) {
      // Disable password
      setPwdSaving(true);
      const res = await setGalleryPassword(safeGalleryId, null);
      setPwdSaving(false);
      if (res.success) {
        setPwdEnabled(false);
        setPwdValue("");
        toast("Đã tắt mật khẩu.", "success");
      } else {
        toast(res.error || "Lỗi khi xóa mật khẩu.", "error");
      }
    } else {
      setPwdEnabled(true);
    }
  };

  const handleSavePassword = async () => {
    if (!safeGalleryId) return;
    if (!pwdValue.trim()) return;
    setPwdSaving(true);
    const res = await setGalleryPassword(safeGalleryId, pwdValue.trim());
    setPwdSaving(false);
    if (res.success) {
      toast("Đã lưu mật khẩu!", "success");
    } else {
      toast(res.error || "Lỗi khi lưu mật khẩu.", "error");
    }
  };

  // ─── Download QR ──────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDownloadQR = (instance: any, name: string) => {
    if (instance?.current) {
      instance.current.download({
        name: `qr-${name}-${galleryTitle || "album"}`,
        extension: "png",
      });
    }
  };

  return (
    !hasMinimumData ? (
      <div className="p-4 bg-error/5 rounded-xl">
        <p className="text-body-sm font-semibold text-text-primary mb-1">Không thể tạo link chia sẻ</p>
        <p className="text-caption text-text-muted">Thiếu dữ liệu album. Vui lòng đóng popup và thử lại.</p>
      </div>
    ) : prepareError ? (
      <div className="p-4 bg-error/5 rounded-xl">
        <p className="text-body-sm font-semibold text-text-primary mb-1">Không thể tạo link chia sẻ</p>
        <p className="text-caption text-text-muted">{prepareError}</p>
      </div>
    ) : isPreparing || !canShowShareLinks ? (
      /* Compact loading — auto-publishing in background */
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Loader2 size={28} className="animate-spin text-primary" />
        <p className="text-caption text-text-muted">Đang tạo link chia sẻ...</p>
      </div>
    ) : (
    <div className="flex flex-col gap-6">
      {/* ── Links ── */}
      <div className="flex flex-col gap-4">
        {/* Link Chọn Ảnh */}
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm text-text-primary">Đường dẫn chia sẻ cho khách hàng chọn ảnh</p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2 rounded-lg text-caption text-text-secondary truncate"
              style={{ background: "var(--color-bg-input)" }}
            >
              {baseUrl}
            </div>
            <Button unstyled
              onClick={() => handleCopy(baseUrl, "select")}
              className="btn-ghost shrink-0 flex items-center gap-1.5 text-success"
              style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
            >
              {copiedSelect ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedSelect ? "Đã chép" : "Sao chép"}</span>
            </Button>
          </div>
        </div>

        {/* Link Chỉ Xem */}
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm text-text-primary">Đường dẫn chia sẻ cho người xem (chỉ xem)</p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2 rounded-lg text-caption text-text-secondary truncate"
              style={{ background: "var(--color-bg-input)" }}
            >
              {viewOnlyUrl}
            </div>
            <Button unstyled
              onClick={() => handleCopy(viewOnlyUrl, "view")}
              className="btn-ghost shrink-0 flex items-center gap-1.5 text-success"
              style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
            >
              {copiedView ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedView ? "Đã chép" : "Sao chép"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── QR Codes (Side by side) ── */}
      <div className="flex items-center justify-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <div
            ref={qrSelectRef}
            className="w-32 h-32 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-bg-base)" }}
          />
          <div className="flex flex-col items-center gap-1">
            <p className="text-caption font-medium text-text-primary">Mã QR khách chọn ảnh</p>
            <Button unstyled
              onClick={() => handleDownloadQR(qrSelectInstance, "select")}
              className="btn-ghost flex items-center gap-1.5 text-success"
              style={{ padding: "4px 8px", fontSize: "var(--font-size-caption)" }}
            >
              <Download size={14} />
              <span>Tải về [.PNG]</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div
            ref={qrViewRef}
            className="w-32 h-32 rounded-lg flex items-center justify-center"
            style={{ background: "var(--color-bg-base)" }}
          />
          <div className="flex flex-col items-center gap-1">
            <p className="text-caption font-medium text-text-primary">Mã QR khách xem album</p>
            <Button unstyled
              onClick={() => handleDownloadQR(qrViewInstance, "view")}
              className="btn-ghost flex items-center gap-1.5 text-success"
              style={{ padding: "4px 8px", fontSize: "var(--font-size-caption)" }}
            >
              <Download size={14} />
              <span>Tải về [.PNG]</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-border/30" />

      {/* ── Password Toggle ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color: "var(--color-text-secondary)" }} />
            <div>
              <p className="text-body-sm font-semibold text-text-primary">Bảo mật bằng mật khẩu</p>
              <p className="text-caption text-text-muted">Yêu cầu nhập mật khẩu để xem album</p>
            </div>
          </div>
          <Button unstyled
            onClick={handleTogglePassword}
            disabled={pwdSaving}
            className="relative w-11 h-6 rounded-full transition-all duration-200"
            style={{
              background: pwdEnabled ? "var(--color-primary)" : "var(--color-bg-hover)",
            }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200"
              style={{ left: pwdEnabled ? "22px" : "2px", boxShadow: "0 1px 3px var(--color-black-10)" }}
            />
          </Button>
        </div>

        {pwdEnabled && (
          <div className="flex items-center gap-2">
            <Input unstyled withBaseStyles={false}
              type="text"
              value={pwdValue}
              onChange={(e) => setPwdValue(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="flex-1 px-3 py-2 rounded-lg text-caption outline-none"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                boxShadow: "inset 0 0 0 1px var(--color-border-light)",
              }}
            />
            <Button unstyled
              onClick={handleSavePassword}
              disabled={pwdSaving || !pwdValue.trim()}
              className="btn-ghost shrink-0 flex items-center gap-1.5"
              style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
            >
              {pwdSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Lưu</span>
            </Button>
          </div>
        )}
      </div>
    </div>
    )
  );
}
