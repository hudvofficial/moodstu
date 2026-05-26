"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen, RefreshCw, ExternalLink, Loader2, ImageIcon, Plus, Calendar, Share2,
  Pencil, Trash2, Check, X,
} from "lucide-react";
import { getGallerySummariesByContract, syncDriveFolder, deleteGallery } from "@/app/actions/gallery-actions";
import { getRetouchProgress, getDeliveryDate, updateDriveFolderUrl } from "@/app/actions/gallery-drive-actions";
import { toast } from "@/lib/toast-utils";
import { useModal } from "@/lib/context/modal-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GalleryShareDetails, GalleryShareLink } from "@/types/gallery";

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
  hasPassword: boolean;
  custom_slug?: string | null;
  shareLinks?: GalleryShareLink[];
}

interface DriveGalleryBlockProps {
  contractId: string;
}

const FOLDER_LABELS: Record<string, { icon: string; label: string }> = {
  goc: { icon: "📸", label: "Ảnh gốc" },
  da_sua: { icon: "✏️", label: "Ảnh đã sửa" },
  chon_in: { icon: "🖨️", label: "Ảnh chọn in" },
};

export default function DriveGalleryBlock({ contractId }: DriveGalleryBlockProps) {
  const router = useRouter();
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { openModal } = useModal();
  const [progress, setProgress] = useState({ selectedCount: 0, editedCount: 0, progress: 0 });
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // ─── Load data ────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [galRes, progRes, dateRes] = await Promise.all([
      getGallerySummariesByContract(contractId),
      getRetouchProgress(contractId),
      getDeliveryDate(contractId),
    ]);

    if (galRes.success && galRes.data) {
      setGalleries(galRes.data.map((g) => ({
        id: g.id,
        title: g.title,
        access_url: g.access_url,
        folder_type: g.folder_type,
        drive_folder_url: g.drive_folder_url,
        status: g.status,
        shared_at: g.shared_at,
        imageCount: g.imageCount,
        selectedCount: g.selectedCount,
        hasPassword: g.hasPassword,
        custom_slug: g.custom_slug,
        shareLinks: g.shareLinks,
      })));
    }
    if (progRes.success && progRes.data) setProgress(progRes.data);
    if (dateRes.success && dateRes.data) setDeliveryDate(dateRes.data);
    setLoading(false);
  }, [contractId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadData(); }, [contractId]);

  // ─── Sync folder ──────────────────────────
  const handleSync = async (galleryId: string) => {
    setSyncing(galleryId);
    const res = await syncDriveFolder(galleryId);
    if (res.success) {
      toast(res.data.newImages > 0 ? `+${res.data.newImages} ảnh mới` : "Không có ảnh mới", "success");
      await loadData();
    } else {
      toast(res.error, "error");
    }
    setSyncing(null);
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

  const handleSaveEdit = async (galleryId: string) => {
    if (!editUrl.trim()) {
      toast("Vui lòng nhập link Drive", "error");
      return;
    }
    setSaving(true);
    const res = await updateDriveFolderUrl(galleryId, editUrl.trim());
    if (res.success) {
      toast("Đã cập nhật link Drive", "success");
      setEditingId(null);
      setEditUrl("");
      await loadData();
    } else {
      toast(res.error, "error");
    }
    setSaving(false);
  };

  // ─── Delete gallery ────────────────────────
  const handleDelete = async (gallery: GalleryRow) => {
    const info = FOLDER_LABELS[gallery.folder_type || ""] || { label: gallery.title || "Album" };
    const confirmed = window.confirm(`Xoá gallery "${info.label}"? Tất cả ảnh trong gallery sẽ bị xoá.`);
    if (!confirmed) return;

    // Optimistic: xoá khỏi UI ngay
    const prev = galleries;
    setGalleries((current) => current.filter((g) => g.id !== gallery.id));
    toast("Đã xoá gallery", "success");

    const res = await deleteGallery(gallery.id);
    if (!res.success) {
      // Rollback
      setGalleries(prev);
      toast(res.error, "error");
    }
  };

  // ─── Share gallery ────────────────────────
  const handleSharePrepared = useCallback((details: GalleryShareDetails) => {
    setGalleries((current) => current.map((gallery) =>
      gallery.id === details.galleryId
        ? {
          ...gallery,
          access_url: details.accessUrl,
          status: details.status,
          hasPassword: details.hasPassword,
          shareLinks: details.shareLinks,
          shared_at: gallery.shared_at || new Date().toISOString(),
        }
        : gallery,
    ));
  }, []);

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

  if (loading) {
    return (
      <div className="card-base p-4 lg:p-5">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">Quản lý File ảnh & Drive</h3>
        </div>
        <div className="py-4 flex justify-center">
          <Loader2 size={20} className="text-text-muted animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-4 lg:p-5 entrance entrance-3">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-primary" />
          <h3 className="text-body-sm font-bold text-text-primary">Quản lý File ảnh & Drive</h3>
        </div>
        <Button unstyled onClick={() => openModal("DRIVE_LINK", { contractId, onSuccess: loadData })} className="btn-ghost" style={{ padding: "4px 10px", fontSize: "var(--font-size-caption)" }}>
          <Plus size={14} />
          <span>{hasGalleries ? "Thêm link" : "Gán Link Drive"}</span>
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
            const isSyncing = syncing === g.id;
            const isEditing = editingId === g.id;

            // ── Inline edit mode ──
            if (isEditing) {
              return (
                <div key={g.id} className="flex flex-col gap-2 py-2 px-3 rounded-lg" style={{ background: "var(--color-bg-secondary)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm">{info.icon}</span>
                    <span className="text-body-sm font-medium text-text-primary">{info.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="url"
                      className="flex-1"
                      placeholder="Dán link Google Drive folder..."
                      value={editUrl}
                      onChange={(e: any) => setEditUrl(e.target.value)}
                      onKeyDown={(e: any) => e.key === "Enter" && void handleSaveEdit(g.id)}
                      autoFocus
                    />
                    <Button unstyled onClick={() => void handleSaveEdit(g.id)} disabled={saving} className="btn-icon" style={{ width: 28, height: 28, color: "var(--color-success)" }} title="Lưu">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </Button>
                    <Button unstyled onClick={handleCancelEdit} disabled={saving} className="btn-icon" style={{ width: 28, height: 28 }} title="Huỷ">
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              );
            }

            // ── Normal view ──
            return (
              <div key={g.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 py-3 px-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "var(--color-bg-secondary)" }} onClick={() => router.push(`/contracts/${contractId}/gallery?galleryId=${g.id}`)}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5">
                    <span className="text-body-sm">{info.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-body-sm font-medium text-text-primary block truncate">{info.label}</span>
                    <span className="text-caption text-text-muted">{g.imageCount} ảnh{g.selectedCount > 0 ? ` · ❤️ ${g.selectedCount}` : ""}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 justify-end shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40 mt-1 sm:mt-0">
                  {/* Share indicator + button */}
                  <Button unstyled
                    onClick={(e) => { e.stopPropagation(); handleShare(g); }}
                    className="btn-icon relative"
                    style={{ width: 32, height: 32 }}
                    title={g.status === "shared" ? "Đã chia sẻ — bấm để xem link" : "Chia sẻ album"}
                  >
                    <Share2 size={16} />
                    {g.status === "shared" && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                        style={{ background: "var(--color-success)" }}
                      />
                    )}
                  </Button>
                  <Button unstyled onClick={(e) => { e.stopPropagation(); void handleSync(g.id); }} disabled={isSyncing} className="btn-icon" style={{ width: 32, height: 32 }} title="Đồng bộ lại">
                    <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                  </Button>
                  {g.drive_folder_url && (
                    <a href={g.drive_folder_url} target="_blank" rel="noopener noreferrer" className="btn-icon flex items-center justify-center" style={{ width: 32, height: 32 }} title="Mở Drive" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <Button unstyled onClick={(e) => { e.stopPropagation(); handleStartEdit(g); }} className="btn-icon" style={{ width: 32, height: 32 }} title="Sửa link Drive">
                    <Pencil size={16} />
                  </Button>
                  <Button unstyled onClick={(e) => { e.stopPropagation(); void handleDelete(g); }} className="btn-icon hover:bg-error/10 hover:text-error transition-colors" style={{ width: 32, height: 32, color: "var(--color-error)" }} title="Xoá gallery">
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
        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: "1px solid var(--color-border)" }}>
          {/* Total images */}
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-muted">Tổng ảnh</span>
            <span className="text-caption font-medium text-text-primary">{totalImages}</span>
          </div>

          {/* Delivery date */}
          {deliveryDate && (
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-muted flex items-center gap-1.5">
                <Calendar size={14} /> Ngày trả file
              </span>
              <span className="text-caption font-medium text-text-primary">
                {new Date(deliveryDate).toLocaleDateString("vi-VN")}
              </span>
            </div>
          )}

          {/* Retouch progress */}
          {progress.selectedCount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-caption text-text-muted">Tiến độ sửa ảnh</span>
                <span className="text-caption font-medium text-text-primary">
                  {progress.editedCount}/{progress.selectedCount} ({progress.progress}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full" style={{ background: "var(--color-bg-tertiary)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(progress.progress, 100)}%`,
                    background: progress.progress >= 100 ? "var(--color-success)" : "var(--color-primary)",
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
