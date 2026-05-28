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

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) &&
         /Safari/.test(ua) &&
         !/CriOS|FxiOS|OPiOS|mercury|Line|FBAV|FBAN|FB_IAB|Instagram|Zalo/.test(ua);
}

function downloadSingleFile(accessToken: string, imageId: string, _fileName: string): boolean {
  try {
    const baseUrl = `/api/gallery-download/${accessToken}/${imageId}`;

    // iOS Safari: Open in new tab with inline mode
    if (isIOSSafari()) {
      const url = `${baseUrl}?mode=view`;
      window.open(url, "_blank", "noopener,noreferrer");
      return true;
    }

    // All other platforms: Hidden iframe → trigger native download (0 RAM, streamed to disk)
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = baseUrl;
    document.body.appendChild(iframe);
    // Clean up iframe after 30s (download should have started by then)
    setTimeout(() => { try { iframe.remove(); } catch {} }, 30000);
    return true;
  } catch {
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

    // iOS Safari: Warn user about multiple tabs
    if (isIOSSafari() && downloadList.length > 1) {
      const proceed = confirm(
        `iOS Safari sẽ mở ${downloadList.length} tab mới. Bạn cần nhấn giữ từng ảnh và chọn "Lưu hình ảnh".\n\nTip: Dùng "Tải ZIP" để tải nhiều ảnh cùng lúc dễ dàng hơn.\n\nTiếp tục?`
      );
      if (!proceed) {
        setState((prev) => ({ ...prev, active: false }));
        return;
      }
    }

    const failed: string[] = [];

    for (let index = 0; index < downloadList.length; index += 1) {
      if (cancelRef.current) {
        setState((prev) => ({ ...prev, cancelled: true, active: false }));
        return;
      }

      const file = downloadList[index];
      setState((prev) => ({ ...prev, currentFile: file.fileName, completed: index }));

      const ok = downloadSingleFile(accessToken, file.imageId, file.fileName);
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
