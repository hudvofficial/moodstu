"use client";

import { useEffect, useRef, useState } from "react";
import {
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  X,
  Folder,
  Globe,
  Share2,
  ScanFace,
  Cloud,
  HardDrive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DownloadManager from "@/components/gallery/download-manager";
import { cn } from "@/lib/utils";

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
    <div className="flex items-center rounded-full border border-border bg-bg-base p-[2px]">
      <Button
        unstyled
        onClick={() => onChange("grid")}
        className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "grid" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"}`}
        title="Dạng lưới"
      >
        <LayoutGrid size={14} />
      </Button>
      <Button
        unstyled
        onClick={() => onChange("list")}
        className={`flex h-7 w-9 items-center justify-center rounded-full transition-colors ${viewMode === "list" ? "bg-primary text-white shadow-sm" : "text-text-muted hover:text-text-main"}`}
        title="Dạng danh sách"
      >
        <List size={14} />
      </Button>
    </div>
  );
}

export function GalleryMoreMenu({
  downloadFiles,
  downloadLabel = "Tải xuống",
  onOpenShare,
  onOpenFilterDrive,
  onOpenFilterLocal,
  onOpenList,
  disableFilter = false,
}: {
  downloadFiles: { driveFileId: string; fileName: string }[];
  downloadLabel?: string;
  onOpenShare?: () => void;
  onOpenFilterDrive?: () => void;
  onOpenFilterLocal?: () => void;
  onOpenList?: () => void;
  disableFilter?: boolean;
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
    <div ref={ref} className="relative ml-auto lg:ml-0">
      <Button 
        unstyled 
        onClick={() => setOpen((prev) => !prev)} 
        className={cn(desktopActionClassName, "gap-1.5 flex items-center lg:bg-transparent lg:border-0 lg:shadow-none bg-bg-card border border-border shadow-xs", open && "bg-bg-hover")}
      >
        <MoreVertical size={15} className="text-text-muted" />
        <span className="hidden lg:inline text-text-main">Tác vụ</span>
      </Button>

      {open && (
        <div className="card-base absolute right-0 top-full z-30 mt-2 w-56 p-1 shadow-lg border border-border rounded-xl flex flex-col">
          <Button unstyled onClick={() => { if (onOpenShare) onOpenShare(); setOpen(false); }} className="flex h-9 w-full items-center justify-start gap-2.5 px-3 rounded-md text-caption font-medium text-text-main hover:bg-bg-hover transition-colors">
            <Share2 size={14} className="text-text-muted" />
            <span>Chia sẻ album</span>
          </Button>

          <Button 
            unstyled 
            disabled={disableFilter || !onOpenFilterDrive}
            onClick={() => { if (onOpenFilterDrive && !disableFilter) { onOpenFilterDrive(); setOpen(false); } }} 
            className="flex h-9 w-full items-center justify-start gap-2.5 px-3 rounded-md text-caption font-medium text-text-main hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Cloud size={14} className="text-text-muted" />
            <span>Lọc file trên drive</span>
          </Button>

          <Button 
            unstyled 
            disabled={disableFilter || !onOpenFilterLocal}
            onClick={() => { if (onOpenFilterLocal && !disableFilter) { onOpenFilterLocal(); setOpen(false); } }} 
            className="flex h-9 w-full items-center justify-start gap-2.5 px-3 rounded-md text-caption font-medium text-text-main hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HardDrive size={14} className="text-text-muted" />
            <span>Lọc file trên máy tính</span>
          </Button>

          <Button 
            unstyled 
            disabled
            onClick={() => {}} 
            className="flex h-9 w-full items-center justify-start gap-2.5 px-3 rounded-md text-caption font-medium text-text-main hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ScanFace size={14} className="text-text-muted" />
            <span>Nhận diện khuôn mặt</span>
          </Button>

          <Button unstyled onClick={() => setOpen(false)} className="flex h-9 w-full items-center justify-start gap-2.5 px-3 rounded-md text-caption font-medium text-text-main hover:bg-bg-hover transition-colors">
            <Globe size={14} className="text-text-muted" />
            <span>Tạo website</span>
          </Button>
          <Button unstyled onClick={() => { if (onOpenList) onOpenList(); setOpen(false); }} className="flex h-9 w-full items-center justify-start gap-2.5 px-3 rounded-md text-caption font-medium text-text-main hover:bg-bg-hover transition-colors">
            <List size={14} className="text-text-muted" />
            <span>Xem danh sách</span>
          </Button>
          
          <div className="my-1 h-px w-full bg-border shrink-0" />
          
          <DownloadManager
            files={downloadFiles}
            label={downloadLabel}
            variant="button"
            className="h-9 w-full justify-start gap-2.5 px-3 rounded-md text-caption font-medium text-text-main hover:bg-bg-hover bg-transparent border-0 shadow-none shrink-0 transition-colors"
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
