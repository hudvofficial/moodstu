"use client";

import { useState } from "react";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { createMultiFolderGalleries } from "@/app/actions/gallery-drive-actions";
import { createGallery } from "@/app/actions/gallery-actions";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// DriveLinkModalContent — Form content cho GlobalModal
// Renders BÊN TRONG UnifiedModal (không tự quản backdrop/card)
// 2 mode: Auto-detect (1 parent URL) hoặc Manual (3 URL riêng)
// ═══════════════════════════════════════════

interface DriveLinkModalContentProps {
  contractId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "auto" | "manual";

const FOLDER_TYPES = [
  { key: "goc", label: "📸 Ảnh gốc", placeholder: "Link folder ảnh gốc (RAW/JPG)..." },
  { key: "da_sua", label: "✏️ Ảnh đã sửa", placeholder: "Link folder ảnh đã chỉnh sửa..." },
  { key: "chon_in", label: "🖨️ Ảnh chọn in", placeholder: "Link folder ảnh chọn in..." },
] as const;

export function DriveLinkModalContent({ contractId, onClose, onSuccess }: DriveLinkModalContentProps) {
  const [mode, setMode] = useState<Mode>("auto");
  const [parentUrl, setParentUrl] = useState("");
  const [manualUrls, setManualUrls] = useState({ goc: "", da_sua: "", chon_in: "" });
  const [loading, setLoading] = useState(false);

  const handleAutoDetect = async () => {
    if (!parentUrl.trim()) {
      toast("Vui lòng dán link folder Google Drive", "error");
      return;
    }
    setLoading(true);
    const res = await createMultiFolderGalleries(contractId, parentUrl.trim());
    if (res.success) {
      toast(`Đã tạo ${res.data.created} gallery từ Drive`, "success");
      onSuccess();
    } else {
      toast(res.error, "error");
    }
    setLoading(false);
  };

  const handleManualSubmit = async () => {
    const entries = Object.entries(manualUrls).filter(([, url]) => url.trim());
    if (entries.length === 0) {
      toast("Vui lòng dán ít nhất 1 link folder", "error");
      return;
    }
    setLoading(true);
    let created = 0;
    for (const [, url] of entries) {
      const typeInfo = FOLDER_TYPES.find((t) => t.key === entries.find(([k]) => k)?.[0]);
      const title = typeInfo?.label.replace(/[📸✏️🖨️]\s*/, "") || "Album ảnh";
      const res = await createGallery(contractId, title, url.trim());
      if (res.success) created++;
      else toast(res.error, "error");
    }
    if (created > 0) {
      toast(`Đã tạo ${created} gallery`, "success");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setMode("auto")}
          className={`tab-pill tab-pill-compact ${mode === "auto" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          🔍 Tự phát hiện
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`tab-pill tab-pill-compact ${mode === "manual" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          ✍️ Nhập thủ công
        </button>
      </div>

      {/* Form content */}
      {mode === "auto" ? (
        <>
          <p className="text-caption text-text-muted">
            Dán link folder cha — hệ thống tự tìm subfolder &quot;Ảnh gốc&quot;, &quot;Ảnh đã sửa&quot;, &quot;Ảnh chọn in&quot;.
          </p>
          <input
            type="url"
            placeholder="Dán link Google Drive folder..."
            value={parentUrl}
            onChange={(e) => setParentUrl(e.target.value)}
            className="input-base w-full"
            onKeyDown={(e) => e.key === "Enter" && handleAutoDetect()}
          />
        </>
      ) : (
        <>
          <p className="text-caption text-text-muted">
            Dán link riêng cho từng loại folder. Có thể bỏ qua folder chưa có.
          </p>
          {FOLDER_TYPES.map((ft) => (
            <div key={ft.key} className="space-y-1">
              <label className="text-caption font-medium text-text-primary">{ft.label}</label>
              <input
                type="url"
                placeholder={ft.placeholder}
                value={manualUrls[ft.key]}
                onChange={(e) => setManualUrls((prev) => ({ ...prev, [ft.key]: e.target.value }))}
                className="input-base w-full"
              />
            </div>
          ))}
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end pt-2">
        <button onClick={onClose} className="btn-ghost" disabled={loading}>
          Hủy
        </button>
        <button
          onClick={mode === "auto" ? handleAutoDetect : handleManualSubmit}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <LinkIcon size={14} />
              <span>Gán Link Drive</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
