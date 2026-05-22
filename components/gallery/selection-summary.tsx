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
  const handleBatchDownload = () => {
    if (downloadableImages.length === 0) return;

    if (downloadableImages.length > 30) {
      alert(`Chỉ có thể tải tối đa 30 ảnh một lần để đảm bảo chất lượng mạng. Bạn đang chọn ${downloadableImages.length} ảnh. Vui lòng bỏ bớt ảnh và tải làm nhiều lần.`);
      return;
    }

    setDownloading(true);

    if (downloadableImages.length > 1) {
      // Batch ZIP download
      const ids = downloadableImages.map((i) => i.id).join(",");
      window.location.href = `/api/gallery-download-batch/${accessToken}?ids=${ids}`;
    } else {
      // Single file download
      const img = downloadableImages[0];
      window.location.href = `/api/gallery-download/${accessToken}/${img.id}`;
    }

    // Tắt trạng thái loading sau 1.5s vì Native Download tự chạy ngầm
    setTimeout(() => {
      setDownloading(false);
    }, 1500);
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
