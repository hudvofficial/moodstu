"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Download, Check, Link2, Eye, Shield, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast-utils";
import { setGalleryPassword } from "@/app/actions/gallery-actions";

// ═══════════════════════════════════════════
// ShareGalleryModalContent — 2 links + 2 QR codes
// Render inside GlobalModal via openModal("SHARE_GALLERY")
// ═══════════════════════════════════════════

interface ShareGalleryModalContentProps {
  accessUrl: string;
  galleryId: string;
  galleryTitle?: string;
  hasPassword?: boolean;
}

export function ShareGalleryModalContent({
  accessUrl,
  galleryId,
  galleryTitle,
  hasPassword = false,
}: ShareGalleryModalContentProps) {
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

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/gallery/${accessUrl}`
    : `/gallery/${accessUrl}`;
  const viewOnlyUrl = `${baseUrl}?mode=view`;

  // ─── QR Code Generation ───────────────────
  const generateQR = useCallback(async () => {
    const QRCodeStyling = (await import("qr-code-styling")).default;

    const qrOptions = (url: string) => ({
      width: 160,
      height: 160,
      data: url,
      dotsOptions: {
        color: "var(--color-text-primary, #3d2b1f)",
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
  }, [baseUrl, viewOnlyUrl]);

  useEffect(() => {
    void generateQR();
  }, [generateQR]);

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
    if (pwdEnabled) {
      // Disable password
      setPwdSaving(true);
      const res = await setGalleryPassword(galleryId, null);
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
    if (!pwdValue.trim()) return;
    setPwdSaving(true);
    const res = await setGalleryPassword(galleryId, pwdValue.trim());
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
          <button
            onClick={handleTogglePassword}
            disabled={pwdSaving}
            className="relative w-11 h-6 rounded-full transition-all duration-200"
            style={{
              background: pwdEnabled ? "var(--color-primary, #8B5E3C)" : "var(--color-bg-hover, #e5e0d8)",
            }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200"
              style={{ left: pwdEnabled ? "22px" : "2px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
            />
          </button>
        </div>

        {pwdEnabled && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={pwdValue}
              onChange={(e) => setPwdValue(e.target.value)}
              placeholder="Nhập mật khẩu..."
              className="flex-1 px-3 py-2 rounded-lg text-caption outline-none"
              style={{
                background: "var(--color-bg-input)",
                color: "var(--color-text-primary)",
                boxShadow: "inset 0 0 0 1px var(--color-border-light, rgba(0,0,0,0.08))",
              }}
            />
            <button
              onClick={handleSavePassword}
              disabled={pwdSaving || !pwdValue.trim()}
              className="btn-ghost shrink-0 flex items-center gap-1.5"
              style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
            >
              {pwdSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>Lưu</span>
            </button>
          </div>
        )}
      </div>
    </div>
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
        <button
          onClick={onCopy}
          className="btn-ghost shrink-0 flex items-center gap-1.5"
          style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
        >
          {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          <span>{copied ? "Đã chép" : "Sao chép"}</span>
        </button>
      </div>

      {/* QR + Download */}
      <div className="flex items-center gap-3">
        <div
          ref={qrRef}
          className="w-[160px] h-[160px] rounded-lg flex items-center justify-center"
          style={{ background: "var(--color-bg-base)" }}
        />
        <button
          onClick={onDownloadQR}
          className="btn-ghost flex items-center gap-1.5"
          style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
        >
          <Download size={14} />
          <span>Tải QR</span>
        </button>
      </div>
    </div>
  );
}
