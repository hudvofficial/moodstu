"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DownloadFile {
  imageId: string;
  fileName: string;
}

interface DownloadManagerProps {
  files?: DownloadFile[];
  fetchFiles?: () => Promise<DownloadFile[]>;
  label?: string;
  variant?: "icon" | "button" | "full";
  className?: string;
  accessToken?: string;
  disabled?: boolean;
}

interface DownloadState {
  active: boolean;
  total: number;
  completed: number;
  currentFile: string;
  failed: string[];
  cancelled: boolean;
  isFetchingFiles: boolean;
}

const INITIAL_STATE: DownloadState = {
  active: false,
  total: 0,
  completed: 0,
  currentFile: "",
  failed: [],
  cancelled: false,
  isFetchingFiles: false,
};

async function downloadSingleFile(accessToken: string, imageId: string, fileName: string): Promise<boolean> {
  try {
    const url = `/api/gallery-download/${accessToken}/${imageId}`;

    // Blob method (works on iOS Safari!)
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    // Create temporary <a> tag and trigger download
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(objectUrl), 100);

    return true;
  } catch (error) {
    console.error("[downloadSingleFile] Error:", error);
    return false;
  }
}

export default function DownloadManager({
  files,
  fetchFiles,
  label,
  variant = "button",
  className,
  accessToken = "admin",
  disabled,
}: DownloadManagerProps) {
  const [state, setState] = useState<DownloadState>(INITIAL_STATE);
  const cancelRef = useRef(false);

  const startDownload = useCallback(async () => {
    cancelRef.current = false;

    setState({
      ...INITIAL_STATE,
      active: true,
      isFetchingFiles: !!fetchFiles,
    });

    let downloadList = files || [];
    if (fetchFiles) {
      try {
        downloadList = await fetchFiles();
      } catch {
        setState((prev) => ({ ...prev, active: false, isFetchingFiles: false }));
        return;
      }
    }

    if (downloadList.length === 0) {
      setState((prev) => ({ ...prev, active: false, isFetchingFiles: false }));
      return;
    }

    setState((prev) => ({ ...prev, isFetchingFiles: false, total: downloadList.length, currentFile: downloadList[0].fileName }));

    const failed: string[] = [];

    for (let index = 0; index < downloadList.length; index += 1) {
      if (cancelRef.current) {
        setState((prev) => ({ ...prev, cancelled: true, active: false }));
        return;
      }

      const file = downloadList[index];
      setState((prev) => ({ ...prev, currentFile: file.fileName, completed: index }));

      const ok = await downloadSingleFile(accessToken, file.imageId, file.fileName);
      if (!ok) failed.push(file.fileName);

      if (index < downloadList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setState({
      active: false,
      total: downloadList.length,
      completed: downloadList.length,
      currentFile: "",
      failed,
      cancelled: false,
      isFetchingFiles: false,
    });
  }, [files, fetchFiles, accessToken]);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const isDisabled = disabled || state.active || (!files && !fetchFiles);

  if (variant === "icon") {
    return (
      <Button
        unstyled
        onClick={(event) => {
          event.stopPropagation();
          startDownload();
        }}
        disabled={isDisabled}
        className={cn("btn-icon", className)}
        style={{ width: 28, height: 28 }}
        title={`Tải file`}
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
        disabled={isDisabled}
        className={cn("btn-ghost", className)}
        style={{ padding: "6px 12px", fontSize: "var(--font-size-caption)" }}
      >
        {state.active ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>{state.isFetchingFiles ? "Đang chuẩn bị..." : `Đang tải ${state.completed}/${state.total}...`}</span>
          </>
        ) : (
          <>
            <Download size={14} />
            <span>{label || `Tải xuống`}</span>
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
          disabled={isDisabled}
          className={cn("btn-primary w-full", className)}
          style={{ justifyContent: "center" }}
        >
          <Download size={16} />
          <span>{label || `Tải xuống`}</span>
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
