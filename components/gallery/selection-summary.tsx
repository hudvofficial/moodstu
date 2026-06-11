"use client";
/* eslint-disable react/forbid-elements */

import { useState } from "react";
import { Star, Download, Loader2 } from "lucide-react";

// ═══════════════════════════════════════════
// SelectionSummary — Fixed bottom bar + batch download
// "Đã chọn X/Y ảnh" + "Tải X ảnh"
// ═══════════════════════════════════════════

interface SelectedImage {
  id: string;
  drive_file_id: string | null;
  file_name: string | null;
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

  // Download logic — native download
  const handleBatchDownload = async () => {
    if (downloadableImages.length === 0) return;

    if (downloadableImages.length > 50) {
      alert(`Vui lòng tải tối đa 50 ảnh mỗi lần để trình duyệt không bị đứng. Bạn đang chọn ${downloadableImages.length} ảnh.`);
      return;
    }

    setDownloading(true);

    if (downloadableImages.length > 1) {
      try {
        // Batch ZIP download - Client Side
        const ids = downloadableImages.map((i) => i.id).join(",");
        const response = await fetch(`/api/gallery-download-batch/${accessToken}?ids=${ids}&client_zip=true`);
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || "Lỗi khi lấy thông tin tải ảnh");
        }
        
        const data = await response.json();
        const { zipName, images } = data;

        // Import dynamically
        const JSZip = (await import("jszip")).default;
        const { saveAs } = await import("file-saver");
        
        const zip = new JSZip();
        
        // Tải ảnh theo batch nhỏ để tránh lag trình duyệt
        const batchSize = 5;
        for (let i = 0; i < images.length; i += batchSize) {
          const batch = images.slice(i, i + batchSize);
          await Promise.all(batch.map(async (img: any) => {
            try {
              const imgRes = await fetch(img.url);
              if (imgRes.ok) {
                const blob = await imgRes.blob();
                zip.file(img.name, blob);
              }
            } catch (err) {
              console.error("Failed to download image:", img.name);
            }
          }));
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, zipName);

      } catch (err: any) {
        alert(err.message || "Đã xảy ra lỗi khi tải ảnh. Vui lòng thử lại.");
      } finally {
        setDownloading(false);
      }
    } else {
      // Single file download
      const img = downloadableImages[0];
      const url = `/api/gallery-download/${accessToken}/${img.id}`;
      const fileName = img.file_name || "photo.jpg";

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isIOS) {
        window.open(`${url}?mode=view`, "_blank", "noopener,noreferrer");
        alert('Đã mở ảnh sang tab mới. Vui lòng nhấn giữ ảnh và chọn "Lưu hình ảnh".');
      } else {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
        } catch (error) {
          console.error("[selection-download] Error:", error);
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }
    }

    if (downloadableImages.length <= 1) {
      // Tắt trạng thái loading sau 1.5s vì Native Download tự chạy ngầm
      setTimeout(() => {
        setDownloading(false);
      }, 1500);
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
