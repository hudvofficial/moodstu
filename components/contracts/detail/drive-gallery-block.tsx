"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen, RefreshCw, ExternalLink, Loader2, ImageIcon, Plus, Calendar, Share2,
  Pencil, Trash2, Check, X,
} from "lucide-react";
import { useModal } from "@/lib/context/modal-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GalleryShareDetails, GalleryShareLink, GallerySummary } from "@/types/gallery";
import {
  useGalleriesQuery,
  useRetouchProgressQuery,
  useDeliveryDateQuery,
  useDeleteGalleryMutation,
  useSyncGalleryMutation,
  useUpdateDriveFolderUrlMutation,
  galleryKeys,
} from "@/hooks/use-gallery-queries";
import { toast } from "@/lib/toast-utils";

// ═══════════════════════════════════════════
// DriveGalleryBlock V2 — Compact card, no inline grid
// Hiện folder list + stats + progress, bấm vào → gallery page
// ═══════════════════════════════════════════

interface GalleryRow {
  id: string;
  title: string | null;
  access_url: string | null;
  folder_type: string | null;
  drive_folder_url: string | null;
  status: string;
  shared_at: string | null;
  imageCount: number;
  selectedCount: number;
  heartCount?: number;
  hasPassword: boolean;
  custom_slug?: string | null;
  shareLinks?: GalleryShareLink[];
}

interface DriveGalleryBlockProps {
  contractId: string;
  initialGalleries?: any[]; // SSR data from server
}

const FOLDER_LABELS: Record<string, { icon: string; label: string }> = {
  goc: { icon: "📸", label: "Ảnh gốc" },
  da_sua: { icon: "✏️", label: "Ảnh đã sửa" },
  chon_in: { icon: "🖨️", label: "Ảnh chọn in" },
};

export default function DriveGalleryBlock({ contractId, initialGalleries }: DriveGalleryBlockProps) {
  const router = useRouter();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");

  // ─── Hydrate React Query cache with SSR data ────────────
  // We pass initialGalleries directly to the hook to prevent loading spinner flickers

  // ─── React Query Hooks (Auto-caching, optimistic updates) ────────────
  const { data: galleries = [], isLoading, isFetching } = useGalleriesQuery(contractId, initialGalleries);
  const { data: progress = { selectedCount: 0, editedCount: 0, progress: 0 } } = useRetouchProgressQuery(contractId);
  const { data: deliveryDate = null } = useDeliveryDateQuery(contractId);

  // ─── Mutations with optimistic updates ────────────
  const deleteMutation = useDeleteGalleryMutation(contractId);
  const syncMutation = useSyncGalleryMutation(contractId);
  const updateUrlMutation = useUpdateDriveFolderUrlMutation(contractId);

  // ─── Sync folder (Optimistic update handled by mutation) ──────────────
  const handleSync = (galleryId: string) => {
    syncMutation.mutate(galleryId);
  };

  // ─── Edit link ─────────────────────────────
  const handleStartEdit = (gallery: GalleryRow) => {
    setEditingId(gallery.id);
    setEditUrl(gallery.drive_folder_url || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditUrl("");
  };

  const handleSaveEdit = (galleryId: string) => {
    if (!editUrl.trim()) {
      toast("Vui lòng nhập link Drive", "error");
      return;
    }
    updateUrlMutation.mutate(
      { galleryId, url: editUrl.trim() },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditUrl("");
        },
      }
    );
  };

  // ─── Delete gallery (Optimistic update handled by mutation) ────────────
  const handleDelete = (gallery: GalleryRow) => {
    const info = FOLDER_LABELS[gallery.folder_type || ""] || { label: gallery.title || "Album" };
    const confirmed = window.confirm(`Xoá gallery "${info.label}"? Tất cả ảnh trong gallery sẽ bị xoá.`);
    if (!confirmed) return;

    deleteMutation.mutate(gallery.id);
  };

  // ─── Share gallery: Update cache IMMEDIATELY (synchronous) ────────────────────────
  const handleSharePrepared = useCallback((details: GalleryShareDetails) => {
    // ✅ SYNCHRONOUS cache update - no refetch delay!
    queryClient.setQueryData(galleryKeys.list(contractId), (old: any) =>
      old?.map((g: any) =>
        g.id === details.galleryId
          ? { ...g, status: details.status, hasPassword: details.hasPassword, shareLinks: details.shareLinks }
          : g
      )
    );
  }, [contractId, queryClient]);

  const handleShare = (gallery: GalleryRow) => {
    openModal("SHARE_GALLERY", {
      accessUrl: gallery.access_url || undefined,
      customSlug: gallery.custom_slug,
      galleryId: gallery.id,
      galleryTitle: gallery.title || "Album",
      hasPassword: gallery.hasPassword,
      shareLinks: gallery.shareLinks,
      status: gallery.status,
      onSharePrepared: handleSharePrepared,
    });
  };

  const totalImages = galleries.reduce((sum, g) => sum + g.imageCount, 0);
  const hasGalleries = galleries.length > 0;

  // ═════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════

  // ✅ Smart loading: Only show skeleton on FIRST load (no cached data)
  // After that, show stale data + optional background spinner
  if (isLoading && !galleries.length) {
    return (
      <div className="card-base p-4 lg:p-5">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">Quản lý File ảnh & Drive</h3>
        </div>
        <div className="space-y-3 mt-4">
          <div className="h-[72px] w-full rounded-xl bg-bg-muted animate-pulse" />
          <div className="h-[72px] w-full rounded-xl bg-bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-4 lg:p-5 entrance entrance-3">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen size={16} className="text-primary shrink-0" />
          <h3 className="text-body-sm font-bold text-text-primary truncate">Quản lý File ảnh & Drive</h3>
        </div>
        <Button unstyled onClick={() => openModal("DRIVE_LINK", { contractId })} className="btn-ghost px-2.5 py-1 text-caption shrink-0">
          <Plus size={14} />
          <span>{hasGalleries ? "Thêm link" : "Gán Link"}</span>
        </Button>
      </div>

      {/* ── Empty state ── */}
      {!hasGalleries && (
        <div className="py-6 text-center">
          <ImageIcon size={32} className="text-text-muted/30 mx-auto mb-2" />
          <p className="text-caption text-text-muted">Chưa có link Google Drive nào</p>
          <p className="text-caption text-text-muted/60">Bấm &quot;Gán Link Drive&quot; để bắt đầu</p>
        </div>
      )}

      {/* ── Folder list ── */}
      {hasGalleries && (
        <div className="space-y-2">
          {galleries.map((g) => {
            const info = FOLDER_LABELS[g.folder_type || ""] || { icon: "📁", label: g.title || "Album" };
            const isSyncing = syncMutation.isPending;
            const isEditing = editingId === g.id;
            const isSaving = updateUrlMutation.isPending;

            // ── Inline edit mode ──
            if (isEditing) {
              return (
                <div key={g.id} className="flex flex-col gap-2 py-2 px-3 rounded-lg bg-bg-hover">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm">{info.icon}</span>
                    <span className="text-body-sm font-medium text-text-primary">{info.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      className="flex-1 min-w-0"
                      placeholder="Dán link Google Drive folder..."
                      value={editUrl}
                      onChange={(e: any) => setEditUrl(e.target.value)}
                      onKeyDown={(e: any) => e.key === "Enter" && void handleSaveEdit(g.id)}
                      autoFocus
                    />
                    <Button unstyled onClick={() => void handleSaveEdit(g.id)} disabled={isSaving} className="btn-icon w-7 h-7 text-success shrink-0" title="Lưu">
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </Button>
                    <Button unstyled onClick={handleCancelEdit} disabled={isSaving} className="btn-icon w-7 h-7 shrink-0" title="Huỷ">
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              );
            }

            // ── Normal view ──
            return (
              <div key={g.id} className="group flex flex-col gap-2 p-3 rounded-lg bg-bg-hover cursor-pointer transition-colors hover:bg-bg-hover/80" onClick={() => router.push(`/contracts/${contractId}/gallery?galleryId=${g.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5">
                    <span className="text-body-sm">{info.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-body-sm font-medium text-text-primary block truncate">{info.label}</span>
                    <span className="text-caption text-text-muted block truncate">
                      {g.imageCount} ảnh
                      {g.selectedCount > 0 ? ` · ✓ ${g.selectedCount} chọn` : ""}
                      {(g.heartCount || 0) > 0 ? ` · ❤️ ${g.heartCount} tim` : ""}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-1 pt-2 border-t border-border/40">
                  {/* Share indicator + button */}
                  <Button unstyled
                    onClick={(e) => { e.stopPropagation(); handleShare(g); }}
                    className="btn-icon relative w-8 h-8"
                    title={g.status === "shared" ? "Đã chia sẻ — bấm để xem link" : "Chia sẻ album"}
                  >
                    <Share2 size={16} />
                    {g.status === "shared" && (
                      <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-success ring-2 ring-bg-hover" />
                    )}
                  </Button>
                  <Button unstyled onClick={(e) => { e.stopPropagation(); void handleSync(g.id); }} disabled={isSyncing} className="btn-icon w-8 h-8" title="Đồng bộ lại">
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                  </Button>
                  {g.drive_folder_url && (
                    <a href={g.drive_folder_url} target="_blank" rel="noopener noreferrer" className="btn-icon flex items-center justify-center w-8 h-8" title="Mở Drive" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <Button unstyled onClick={(e) => { e.stopPropagation(); handleStartEdit(g); }} className="btn-icon w-8 h-8" title="Sửa link Drive">
                    <Pencil size={16} />
                  </Button>
                  <Button unstyled onClick={(e) => { e.stopPropagation(); void handleDelete(g); }} className="btn-icon w-8 h-8 hover:bg-error/10 hover:text-error transition-colors text-error" title="Xoá gallery">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Stats & Progress ── */}
      {hasGalleries && (
        <div className="mt-4 pt-3 space-y-2 border-t border-border">
          {/* Total images */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-text-muted whitespace-nowrap">Tổng ảnh</span>
            <span className="text-caption font-medium text-text-primary text-right">{totalImages}</span>
          </div>

          {/* Delivery date */}
          {deliveryDate && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-caption text-text-muted flex items-center gap-1.5 whitespace-nowrap">
                <Calendar size={14} /> Ngày trả file
              </span>
              <span className="text-caption font-medium text-text-primary text-right">
                {new Date(deliveryDate).toLocaleDateString("vi-VN")}
              </span>
            </div>
          )}

          {/* Retouch progress */}
          {progress.selectedCount > 0 && (
            <div className="pt-1">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-caption text-text-muted whitespace-nowrap">Tiến độ sửa ảnh</span>
                <span className="text-caption font-medium text-text-primary text-right">
                  {progress.editedCount}/{progress.selectedCount} ({progress.progress}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${progress.progress >= 100 ? "bg-success" : "bg-primary"}`}
                  style={{ width: `${Math.min(progress.progress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
