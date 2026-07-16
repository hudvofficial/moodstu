"use client";
/* eslint-disable react/forbid-elements */

import { useState } from "react";
import { Star, Download, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { detectPlatform } from "@/lib/detect-platform";

// ═══════════════════════════════════════════
// SelectionSummary — Fixed bottom bar + batch download
// "Đã chọn X/Y ảnh" + "Tải X ảnh"
// ═══════════════════════════════════════════

interface SelectedImage {
  id: string;
  drive_file_id: string | null;
  file_name: string | null;
  client_note?: string | null;
}

interface BatchImage {
  url: string;
  name: string;
}

interface SelectionSummaryProps {
  selectedCount: number;
  totalCount: number;
  selectedImages?: SelectedImage[];
  accessToken?: string;
}

export default function SelectionSummary({
  selectedCount,
  totalCount,
  selectedImages = [],
  accessToken = "admin",
}: SelectionSummaryProps) {
  const [downloading, setDownloading] = useState(false);

  if (selectedCount === 0) return null;

  const downloadableImages = selectedImages.filter((i) => i.drive_file_id);
  const notedCount = selectedImages.filter((i) => i.client_note?.trim()).length;

  // Download logic — native download
  const handleBatchDownload = async () => {
    if (downloadableImages.length === 0) return;

    const platform = detectPlatform();
    const isIOS = platform === "ios-safari" || platform === "ios-webview";
    const isMobile = platform !== "desktop";

    // MOBILE + nhiều ảnh: KHÔNG zip. JSZip nạp ảnh gốc (15,5MB/ảnh) vào RAM →
    // 50 ảnh ~1,5GB → Safari giết tab. Chuẩn ngành (Pixieset): khuyên dùng máy tính.
    if (isMobile && downloadableImages.length > 1) {
      toast.info(
        `Điện thoại chỉ tải được từng ảnh. Mở album trên máy tính để tải cả ${downloadableImages.length} ảnh, hoặc mở từng ảnh rồi nhấn giữ để lưu.`,
        { duration: 7000 },
      );
      return;
    }

    if (downloadableImages.length > 50) {
      toast.error(`Vui lòng tải tối đa 50 ảnh mỗi lần. Bạn đang chọn ${downloadableImages.length} ảnh.`);
      return;
    }

    setDownloading(true);

    if (downloadableImages.length > 1) {
      // ─── Batch ZIP download (giữ nguyên JSZip) ────────────────────────
      const progressToastId = toast.loading(
        `Đang tải 0/${downloadableImages.length} ảnh...`,
      );
      try {
        const ids = downloadableImages.map((i) => i.id).join(",");
        const response = await fetch(`/api/gallery-download-batch/${accessToken}?ids=${ids}&client_zip=true`);
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || "Lỗi khi lấy thông tin tải ảnh");
        }

        const data: { zipName: string; images: BatchImage[] } = await response.json();
        const { zipName, images } = data;

        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");

        const zip = new JSZip();
        const total = images.length;
        let completed = 0;

        // Tải ảnh theo batch nhỏ để tránh lag trình duyệt
        const batchSize = 5;
        for (let i = 0; i < images.length; i += batchSize) {
          const batch = images.slice(i, i + batchSize);
          await Promise.all(batch.map(async (img: BatchImage) => {
            try {
              const imgRes = await fetch(img.url);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                zip.file(img.name, blob);
              }
            } catch (err) {
              console.error("[selection-download] Failed to download image:", img.name, err);
            } finally {
              completed += 1;
              toast.loading(`Đang tải ${completed}/${total} ảnh...`, { id: progressToastId });
            }
          }));
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, zipName);
        toast.success(`Đã tải xong ${total} ảnh`, { id: progressToastId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải ảnh. Vui lòng thử lại.";
        console.error("[selection-download] Error:", err);
        toast.error(message, { id: progressToastId });
      } finally {
        setDownloading(false);
      }
    } else {
      // ─── Single file download ─────────────────────────────────────────
      const img = downloadableImages[0];
      const url = `/api/gallery-download/${accessToken}/${img.id}`;
      const fileName = img.file_name || "photo.jpg";

      if (isIOS) {
        // PHẢI mở tab TRƯỚC khi await: iOS Safari huỷ user-gesture sau await → popup bị chặn.
        // Giống image-viewer.tsx:326. KHÔNG đảo thứ tự 2 dòng này.
        const tab = window.open("", "_blank");
        const toastId = toast.loading("Đang chuẩn bị ảnh...");
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          if (!data.url) throw new Error("No direct URL returned");
          if (!tab) throw new Error("Popup bị chặn");
          tab.location.href = data.url;
          toast.info('Nhấn giữ ảnh → chọn "Lưu hình ảnh"', {
            id: toastId,
            duration: 5000,
          });
        } catch (error) {
          console.error("[selection-download][ios] Error:", error);
          tab?.close();
          toast.error("Không chuẩn bị được ảnh tải xuống. Vui lòng thử lại.", { id: toastId });
        } finally {
          setDownloading(false);
        }
        return;
      }

      // Non-iOS: dùng blob download để tránh popup bị chặn
      const toastId = toast.loading(`Đang tải ${fileName}...`);
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (!data.url) throw new Error("No direct URL returned");

        const directResponse = await fetch(data.url);
        if (!directResponse.ok) throw new Error(`Drive HTTP ${directResponse.status}`);

        const blob = await directResponse.blob();
        const objectUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
        toast.success(`Đã tải ${fileName}`, { id: toastId });
      } catch (error) {
        console.error("[selection-download] Error:", error);
        try {
          const response = await fetch(url);
          const data = await response.json();
          if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
        } catch {}
        toast.error("Không thể tải ảnh. Vui lòng thử lại.", { id: toastId });
      } finally {
        setDownloading(false);
      }
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 bg-bg-base/95 backdrop-blur-md shadow-md"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star size={16} className="text-warning fill-warning" />
          <span className="text-sm font-semibold text-text-primary">
            Đã chọn {selectedCount} ảnh
          </span>
          <span className="text-xs text-text-muted">
            / {totalCount}
          </span>
          {notedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <MessageSquare size={12} />
              {notedCount}
            </span>
          )}
        </div>

        {/* Batch download button */}
        {downloadableImages.length > 0 && (
          <button
            onClick={handleBatchDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 bg-primary text-text-inverse disabled:opacity-70"
          >
            {downloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span>{downloading ? "Đang tải..." : `Tải ${downloadableImages.length} ảnh`}</span>
          </button>
        )}
      </div>
    </div>
  );
}
