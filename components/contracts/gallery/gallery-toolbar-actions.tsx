"use client";

import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DownloadManager from "@/components/gallery/download-manager";

// ═══════════════════════════════════════════
// Gallery Actions — Extracted from gallery-toolbar
// ActionButton, ViewModeToggle, MoreMenu, AlbumCreateInput
// ═══════════════════════════════════════════

const desktopActionClassName = "btn-ghost h-9 px-3 text-caption font-semibold whitespace-nowrap";
const mobileIconActionClassName = "btn-icon h-9 w-9 min-w-9 shrink-0";

export { desktopActionClassName, mobileIconActionClassName };

export function ActionButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}) {
  return (
    <Button unstyled onClick={onClick} className={desktopActionClassName} title={title}>
      {children}
    </Button>
  );
}

export function ViewModeToggle({
  viewMode,
  onChange,
}: {
  viewMode: "grid" | "list";
  onChange: (mode: "grid" | "list") => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-bg-card p-1">
      <Button
        unstyled
        onClick={() => onChange("grid")}
        className={`flex h-7 items-center gap-1 rounded-md px-2 transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "text-text-muted hover:bg-bg-hover"}`}
        title="Dạng lưới"
      >
        <LayoutGrid size={14} />
      </Button>
      <Button
        unstyled
        onClick={() => onChange("list")}
        className={`flex h-7 items-center gap-1 rounded-md px-2 transition-colors ${viewMode === "list" ? "bg-primary text-white" : "text-text-muted hover:bg-bg-hover"}`}
        title="Dạng danh sách"
      >
        <List size={14} />
      </Button>
    </div>
  );
}

export function GalleryMoreMenu({
  allDownloadFiles,
  viewMode,
  onViewMode,
  watermarkOn,
  onWatermarkToggle,
}: {
  allDownloadFiles: { driveFileId: string; fileName: string }[];
  viewMode: "grid" | "list";
  onViewMode: (mode: "grid" | "list") => void;
  watermarkOn: boolean;
  onWatermarkToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <Button unstyled onClick={() => setOpen((prev) => !prev)} className={mobileIconActionClassName} title="Tác vụ khác">
        <MoreHorizontal size={16} />
      </Button>

      {open && (
        <div className="card-base absolute right-0 top-full z-30 mt-2 w-52 space-y-2 p-2">
          <ViewModeToggle viewMode={viewMode} onChange={onViewMode} />
          <Button
            unstyled
            onClick={() => {
              onWatermarkToggle();
              setOpen(false);
            }}
            className="btn-ghost flex h-9 w-full items-center justify-start px-3 text-caption font-semibold"
          >
            {watermarkOn ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{watermarkOn ? "Tắt watermark" : "Bật watermark"}</span>
          </Button>
          <DownloadManager
            files={allDownloadFiles}
            label="Tải tất cả"
            variant="button"
            className="h-9 w-full justify-start px-3 text-caption font-semibold"
          />
        </div>
      )}
    </div>
  );
}

export function AlbumCreateInput({
  show,
  name,
  onSetShow,
  onSetName,
  onCreate,
  placeholder,
}: {
  show: boolean;
  name: string;
  onSetShow: (show: boolean) => void;
  onSetName: (name: string) => void;
  onCreate: () => void;
  placeholder?: string;
}) {
  if (show) {
    return (
      <div className="ml-1 flex items-center gap-1">
        <Input
          value={name}
          onChange={(event) => onSetName(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onCreate()}
          placeholder={placeholder || "Tên album..."}
          autoFocus
          className="h-7 w-40 text-caption"
        />
        <Button unstyled onClick={onCreate} className="btn-ghost h-7 px-2" title="Tạo album">
          <Plus size={14} />
        </Button>
        <Button
          unstyled
          onClick={() => {
            onSetShow(false);
            onSetName("");
          }}
          className="btn-ghost h-7 px-2"
          title="Đóng tạo album"
        >
          <X size={14} />
        </Button>
      </div>
    );
  }

  return (
    <Button
      unstyled
      onClick={() => onSetShow(true)}
      className="btn-icon h-7 w-7 min-w-7 shrink-0 rounded-md border border-border bg-elevated text-text-muted hover:bg-hover hover:text-text-main lg:h-8 lg:w-8 lg:min-w-8 lg:border-0 lg:bg-bg-card lg:shadow-xs"
      title="Tạo album mới"
      aria-label="Tạo album mới"
    >
      <Plus size={12} />
    </Button>
  );
}
