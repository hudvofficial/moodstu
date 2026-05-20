"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Download, Check, Link2, Eye, Shield, Loader2, Globe, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast-utils";
import {
  shareGallery,
  setGalleryPassword,
} from "@/app/actions/gallery-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GalleryShareLink } from "@/types/gallery";

// ═══════════════════════════════════════════
// ShareGalleryModalContent — 2 links + 2 QR codes
// Render inside GlobalModal via openModal("SHARE_GALLERY")
// ═══════════════════════════════════════════

interface ShareGalleryModalContentProps {
  accessUrl?: string;
  galleryId?: string;
  galleryTitle?: string;
  hasPassword?: boolean;
  shareLinks?: GalleryShareLink[];
  status?: string;
  onPublishSuccess?: () => void;
}

export function ShareGalleryModalContent({
  accessUrl,
  galleryId,
  galleryTitle,
  hasPassword = false,
  shareLinks: initialShareLinks = [],
  status = "draft",
  onPublishSuccess,
}: ShareGalleryModalContentProps) {
  const safeGalleryId = galleryId || "";
  const isReady = Boolean(accessUrl && galleryId);

  const [localStatus, setLocalStatus] = useState(status);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareLinks, setShareLinks] = useState<GalleryShareLink[]>(initialShareLinks);
  const [localAccessUrl, setLocalAccessUrl] = useState(accessUrl || "");
  const [copiedSelect, setCopiedSelect] = useState(false);
  const [copiedView, setCopiedView] = useState(false);
  const [pwdEnabled, setPwdEnabled] = useState(hasPassword);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  
  const qrSelectRef = useRef<HTMLDivElement>(null);
  const qrViewRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrSelectInstance = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qrViewInstance = useRef<any>(null);

  const selectSlug = shareLinks.find((link) => link.capability === "select")?.slug || localAccessUrl;
  const viewSlug = shareLinks.find((link) => link.capability === "view")?.slug || "";
  
  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/gallery/${selectSlug}`
    : `/gallery/${selectSlug}`;
  
  const viewOnlyUrl = viewSlug
    ? (typeof window !== "undefined"
      ? `${window.location.origin}/gallery/${viewSlug}`
      : `/gallery/${viewSlug}`)
    : `${baseUrl}?mode=view`;

  // ─── QR Code Generation ───────────────────
  const generateQR = useCallback(async () => {
    if (!isReady || localStatus === "draft") return;
    const QRCodeStyling = (await import("qr-code-styling")).default;

    const qrOptions = (url: string) => ({
      width: 160,
      height: 160,
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
  }, [baseUrl, isReady, viewOnlyUrl, localStatus]);

  useEffect(() => {
    if (!isReady || localStatus === "draft") return;
    void generateQR();
  }, [generateQR, isReady, localStatus]);

  // ─── Publish handlers ─────────────────────
  const handlePublish = async () => {
    if (!safeGalleryId) return;
    setIsPublishing(true);
    const res = await shareGallery(safeGalleryId);
    if (res.success) {
      if (res.data) {
        setShareLinks(res.data.shareLinks);
        setLocalAccessUrl(res.data.accessUrl || "");
      }
      setLocalStatus("shared");
      toast("Đã phát hành Album thành công!", "success");
      onPublishSuccess?.();
    } else {
      toast(res.error || "Không thể phát hành Album.", "error");
    }
    setIsPublishing(false);
  };

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
    !isReady ? (
      <div className="p-4 bg-error/5 rounded-xl">
        <p className="text-body-sm font-semibold text-text-primary mb-1">Không thể tạo link chia sẻ</p>
        <p className="text-caption text-text-muted">Thiếu dữ liệu album. Vui lòng đóng popup và thử lại.</p>
      </div>
    ) : localStatus === "draft" ? (
      <div className="flex flex-col items-center justify-center text-center py-6 gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Globe size={32} className="text-primary" />
        </div>
        <div>
          <h3 className="text-body font-bold text-text-primary mb-1">Album chưa được phát hành</h3>
          <p className="text-caption text-text-muted max-w-[280px]">
            Phát hành để tạo link chia sẻ cho khách hàng. Hình ảnh của bạn sẽ được hiển thị với giao diện chuyên nghiệp.
          </p>
        </div>
        
        {/* Mockup Preview Card */}
        <div className="w-full max-w-[320px] rounded-xl overflow-hidden border border-border shadow-sm text-left my-2 bg-white dark:bg-black">
          <div className="h-32 flex items-center justify-center border-b border-border" style={{ background: "var(--color-bg-secondary)" }}>
            <Sparkles size={24} className="text-text-muted/50" />
          </div>
          <div className="p-3">
            <p className="text-[11px] text-text-muted uppercase tracking-wider mb-1">moodwedding.com</p>
            <p className="text-body-sm font-semibold text-text-primary truncate">{galleryTitle || "Album Ảnh"}</p>
          </div>
        </div>

        <Button
          onClick={handlePublish}
          disabled={isPublishing}
          className="w-full mt-2"
        >
          {isPublishing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Globe size={16} className="mr-2" />}
          Phát hành Album
        </Button>
      </div>
    ) : (
    <div className="flex flex-col gap-5">
      {/* ── Link Chọn Ảnh ── */}
      <LinkSection
        icon={<Link2 size={16} className="text-primary" />}
        title="Link cho khách chọn ảnh"
        description="Khách hàng có thể xem và chọn ảnh yêu thích"
        url={baseUrl}
        copied={copiedSelect}
        onCopy={() => handleCopy(baseUrl, "select")}
        qrRef={qrSelectRef}
        onDownloadQR={() => handleDownloadQR(qrSelectInstance, "select")}
      />

      {/* ── Divider ── */}
      <div className="h-px bg-border/30" />

      {/* ── Link Chỉ Xem ── */}
      <LinkSection
        icon={<Eye size={16} className="text-text-secondary" />}
        title="Link chỉ xem"
        description="Khách chỉ được xem ảnh, không chọn hay tải"
        url={viewOnlyUrl}
        copied={copiedView}
        onCopy={() => handleCopy(viewOnlyUrl, "view")}
        qrRef={qrViewRef}
        onDownloadQR={() => handleDownloadQR(qrViewInstance, "view")}
      />

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

// ─── Sub-component: LinkSection ─────────────
interface LinkSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
  qrRef: React.RefObject<HTMLDivElement | null>;
  onDownloadQR: () => void;
}

function LinkSection({
  icon,
  title,
  description,
  url,
  copied,
  onCopy,
  qrRef,
  onDownloadQR,
}: LinkSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-body-sm font-semibold text-text-primary">{title}</p>
          <p className="text-caption text-text-muted">{description}</p>
        </div>
      </div>

      {/* URL + Copy */}
      <div className="flex items-center gap-2">
        <div
          className="flex-1 px-3 py-2 rounded-lg text-caption text-text-secondary truncate"
          style={{ background: "var(--color-bg-input)" }}
        >
          {url}
        </div>
        <Button unstyled
          onClick={onCopy}
          className="btn-ghost shrink-0 flex items-center gap-1.5"
          style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </Button>
      </div>

      {/* QR + Download */}
      <div className="flex items-center gap-3">
        <div
          ref={qrRef}
          className="w-40 h-40 rounded-lg flex items-center justify-center"
          style={{ background: "var(--color-bg-base)" }}
        />
        <Button unstyled
          onClick={onDownloadQR}
          className="btn-ghost flex items-center gap-1.5"
          style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
        >
          <Download size={14} />
          <span>Tải QR</span>
        </Button>
      </div>
    </div>
  );
}
