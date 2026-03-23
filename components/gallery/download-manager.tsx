"use client";

import { useState, useRef, useCallback } from "react";
import { Download, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// ═══════════════════════════════════════════
// DownloadManager — Tải ảnh gốc từ Drive proxy
// Single file, batch selected, batch all
// Mobile: file tự save, toast thông báo
// ═══════════════════════════════════════════

interface DownloadFile {
  driveFileId: string;
  fileName: string;
}

interface DownloadManagerProps {
  files: DownloadFile[];
  label?: string;
  variant?: "icon" | "button" | "full";
}

interface DownloadState {
  active: boolean;
  total: number;
  completed: number;
  currentFile: string;
  failed: string[];
  cancelled: boolean;
}

const INITIAL_STATE: DownloadState = {
  active: false, total: 0, completed: 0, currentFile: "", failed: [], cancelled: false,
};

async function downloadSingleFile(fileId: string, fileName: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/drive-download/${fileId}`);
    if (!res.ok) return false;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export default function DownloadManager({ files, label, variant = "button" }: DownloadManagerProps) {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE);
  const cancelRef = useRef(false);

  const startDownload = useCallback(async () => {
    if (files.length === 0) return;
    cancelRef.current = false;

    setState({ active: true, total: files.length, completed: 0, currentFile: files[0].fileName, failed: [], cancelled: false });

    const failed: string[] = [];

    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current) {
        setState((s) => ({ ...s, cancelled: true, active: false }));
        return;
      }

      const file = files[i];
      setState((s) => ({ ...s, currentFile: file.fileName, completed: i }));

      const ok = await downloadSingleFile(file.driveFileId, file.fileName);
      if (!ok) failed.push(file.fileName);

      // Small delay between downloads to avoid overwhelming
      if (i < files.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setState({ active: false, total: files.length, completed: files.length, currentFile: "", failed, cancelled: false });
  }, [files]);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  // ─── Icon variant (single file) ──────────
  if (variant === "icon") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); startDownload(); }}
        disabled={state.active}
        className="btn-icon"
        style={{ width: 28, height: 28 }}
        title={`Tải ${files[0]?.fileName || "file"}`}
      >
        {state.active ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      </button>
    );
  }

  // ─── Button variant ──────────────────────
  if (variant === "button") {
    return (
      <button onClick={startDownload} disabled={state.active || files.length === 0} className="btn-ghost" style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}>
        {state.active ? (
          <><Loader2 size={14} className="animate-spin" /><span>Đang tải {state.completed}/{state.total}...</span></>
        ) : (
          <><Download size={14} /><span>{label || `Tải ${files.length} ảnh`}</span></>
        )}
      </button>
    );
  }

  // ─── Full variant (with progress) ────────
  return (
    <div>
      {!state.active && state.completed === 0 && (
        <button onClick={startDownload} disabled={files.length === 0} className="btn-primary w-full" style={{ justifyContent: "center" }}>
          <Download size={16} />
          <span>{label || `Tải ${files.length} ảnh gốc`}</span>
        </button>
      )}

      {state.active && (
        <div className="p-3 rounded-lg space-y-2" style={{ background: "var(--color-bg-secondary)" }}>
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-text-primary">
              Đang tải {state.completed + 1}/{state.total}...
            </span>
            <button onClick={handleCancel} className="btn-icon" style={{ width: 24, height: 24 }}>
              <X size={14} />
            </button>
          </div>
          <p className="text-caption text-text-muted truncate">{state.currentFile}</p>
          <div className="w-full h-1.5 rounded-full" style={{ background: "var(--color-bg-tertiary)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((state.completed + 1) / state.total) * 100}%`, background: "var(--color-primary)" }}
            />
          </div>
        </div>
      )}

      {!state.active && state.completed > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: "var(--color-bg-secondary)" }}>
          {state.failed.length === 0 ? (
            <><CheckCircle size={16} className="text-green-500" /><span className="text-caption text-text-primary">Đã tải {state.completed} ảnh</span></>
          ) : (
            <><AlertCircle size={16} className="text-amber-500" /><span className="text-caption text-text-primary">Tải {state.completed - state.failed.length}/{state.total} ảnh (lỗi {state.failed.length})</span></>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Export helper for single download ─────
export { downloadSingleFile };
