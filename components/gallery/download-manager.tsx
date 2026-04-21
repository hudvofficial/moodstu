"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DownloadFile {
  driveFileId: string;
  fileName: string;
}

interface DownloadManagerProps {
  files: DownloadFile[];
  label?: string;
  variant?: "icon" | "button" | "full";
  className?: string;
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
  active: false,
  total: 0,
  completed: 0,
  currentFile: "",
  failed: [],
  cancelled: false,
};

async function downloadSingleFile(fileId: string, fileName: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/drive-download/${fileId}`);
    if (!res.ok) return false;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export default function DownloadManager({
  files,
  label,
  variant = "button",
  className,
}: DownloadManagerProps) {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE);
  const cancelRef = useRef(false);

  const startDownload = useCallback(async () => {
    if (files.length === 0) return;
    cancelRef.current = false;

    setState({
      active: true,
      total: files.length,
      completed: 0,
      currentFile: files[0].fileName,
      failed: [],
      cancelled: false,
    });

    const failed: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      if (cancelRef.current) {
        setState((prev) => ({ ...prev, cancelled: true, active: false }));
        return;
      }

      const file = files[index];
      setState((prev) => ({ ...prev, currentFile: file.fileName, completed: index }));

      const ok = await downloadSingleFile(file.driveFileId, file.fileName);
      if (!ok) failed.push(file.fileName);

      if (index < files.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setState({
      active: false,
      total: files.length,
      completed: files.length,
      currentFile: "",
      failed,
      cancelled: false,
    });
  }, [files]);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  if (variant === "icon") {
    return (
      <Button
        unstyled
        onClick={(event) => {
          event.stopPropagation();
          startDownload();
        }}
        disabled={state.active}
        className={cn("btn-icon", className)}
        style={{ width: 28, height: 28 }}
        title={`Tải ${files[0]?.fileName || "file"}`}
      >
        {state.active ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      </Button>
    );
  }

  if (variant === "button") {
    return (
      <Button
        unstyled
        onClick={startDownload}
        disabled={state.active || files.length === 0}
        className={cn("btn-ghost", className)}
        style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
      >
        {state.active ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Đang tải {state.completed}/{state.total}...</span>
          </>
        ) : (
          <>
            <Download size={14} />
            <span>{label || `Tải ${files.length} ảnh`}</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <div>
      {!state.active && state.completed === 0 && (
        <Button
          unstyled
          onClick={startDownload}
          disabled={files.length === 0}
          className={cn("btn-primary w-full", className)}
          style={{ justifyContent: "center" }}
        >
          <Download size={16} />
          <span>{label || `Tải ${files.length} ảnh gốc`}</span>
        </Button>
      )}

      {state.active && (
        <div className="space-y-2 rounded-lg p-3" style={{ background: "var(--color-bg-secondary)" }}>
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-text-primary">
              Đang tải {state.completed + 1}/{state.total}...
            </span>
            <Button unstyled onClick={handleCancel} className="btn-icon" style={{ width: 24, height: 24 }}>
              <X size={14} />
            </Button>
          </div>
          <p className="truncate text-caption text-text-muted">{state.currentFile}</p>
          <div className="h-1.5 w-full rounded-full" style={{ background: "var(--color-bg-tertiary)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${((state.completed + 1) / state.total) * 100}%`,
                background: "var(--color-primary)",
              }}
            />
          </div>
        </div>
      )}

      {!state.active && state.completed > 0 && (
        <div className="flex items-center gap-2 rounded-lg p-2" style={{ background: "var(--color-bg-secondary)" }}>
          {state.failed.length === 0 ? (
            <>
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-caption text-text-primary">Đã tải {state.completed} ảnh</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} className="text-amber-500" />
              <span className="text-caption text-text-primary">
                Tải {state.completed - state.failed.length}/{state.total} ảnh (lỗi {state.failed.length})
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export { downloadSingleFile };
