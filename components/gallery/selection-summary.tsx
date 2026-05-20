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
}

export default function SelectionSummary({
  selectedCount,
  totalCount,
  selectedImages = [],
}: SelectionSummaryProps) {
  const [downloading, setDownloading] = useState(false);

  if (selectedCount === 0) return null;

  const downloadableImages = selectedImages.filter((i) => i.drive_file_id);

  // Sequential download — từng file qua proxy endpoint
  const handleBatchDownload = async () => {
    if (downloadableImages.length === 0) return;
    setDownloading(true);

    for (const img of downloadableImages) {
      try {
        const res = await fetch(`/api/drive-download/${img.drive_file_id}`);
        if (!res.ok) continue;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = img.file_name || `photo-${img.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        // Skip failed downloads
      }
    }

    setDownloading(false);
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
