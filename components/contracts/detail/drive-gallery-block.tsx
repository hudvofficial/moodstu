"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen, RefreshCw, ExternalLink, Loader2, ImageIcon, Plus, Calendar, Share2,
} from "lucide-react";
import { getGalleriesByContract, syncDriveFolder, shareGallery } from "@/app/actions/gallery-actions";
import { getRetouchProgress, getDeliveryDate } from "@/app/actions/gallery-drive-actions";
import { toast } from "@/lib/toast-utils";
import { useModal } from "@/lib/context/modal-context";
import { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════
// DriveGalleryBlock V2 — Compact card, no inline grid
// Hiện folder list + stats + progress, bấm vào → gallery page
// ═══════════════════════════════════════════

interface GalleryRow {
  id: string;
  title: string | null;
  folder_type: string | null;
  drive_folder_url: string | null;
  status: string;
  shared_at: string | null;
  imageCount: number;
  selectedCount: number;
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
  const [sharing, setSharing] = useState<string | null>(null);
  const [progress, setProgress] = useState({ selectedCount: 0, editedCount: 0, progress: 0 });
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);

  // ─── Load data ────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const [galRes, progRes, dateRes] = await Promise.all([
      getGalleriesByContract(contractId),
      getRetouchProgress(contractId),
      getDeliveryDate(contractId),
    ]);

    if (galRes.success && galRes.data) {
      setGalleries(galRes.data.map((g) => ({
        id: g.id,
        title: g.title,
        folder_type: g.folder_type,
        drive_folder_url: g.drive_folder_url,
        status: g.status,
        shared_at: g.shared_at,
        imageCount: g.gallery_images?.length || 0,
        selectedCount: g.gallery_images?.filter((img) => img.is_selected).length || 0,
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

  // ─── Share gallery ────────────────────────
  const handleShare = async (galleryId: string, title: string | null) => {
    setSharing(galleryId);
    const res = await shareGallery(galleryId);
    if (res.success && res.data) {
      openModal("SHARE_GALLERY", {
        accessUrl: res.data.accessUrl,
        galleryId: res.data.galleryId,
        galleryTitle: title || "Album",
        hasPassword: res.data.hasPassword || false,
      });
      await loadData();
    } else if (!res.success) {
      toast(res.error, "error");
    }
    setSharing(null);
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
          <Plus size={12} />
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

            return (
              <div key={g.id} className="flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "var(--color-bg-secondary)" }} onClick={() => router.push(`/contracts/${contractId}/gallery?galleryId=${g.id}`)}>
                <span className="text-body-sm">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-body-sm font-medium text-text-primary block truncate">{info.label}</span>
                  <span className="text-caption text-text-muted">{g.imageCount} ảnh{g.selectedCount > 0 ? ` · ❤️ ${g.selectedCount}` : ""}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Share indicator + button */}
                  <Button unstyled
                    onClick={(e) => { e.stopPropagation(); void handleShare(g.id, g.title); }}
                    disabled={sharing === g.id}
                    className="btn-icon relative"
                    style={{ width: 28, height: 28 }}
                    title={g.status === "shared" ? "Đã chia sẻ — bấm để xem link" : "Chia sẻ album"}
                  >
                    <Share2 size={12} className={sharing === g.id ? "animate-pulse" : ""} />
                    {g.status === "shared" && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                        style={{ background: "var(--color-success)" }}
                      />
                    )}
                  </Button>
                  <Button unstyled onClick={(e) => { e.stopPropagation(); void handleSync(g.id); }} disabled={isSyncing} className="btn-icon" style={{ width: 28, height: 28 }} title="Đồng bộ lại">
                    <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                  </Button>
                  {g.drive_folder_url && (
                    <a href={g.drive_folder_url} target="_blank" rel="noopener noreferrer" className="btn-icon" style={{ width: 28, height: 28 }} title="Mở Drive" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink size={12} />
                    </a>
                  )}
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
              <span className="text-caption text-text-muted flex items-center gap-1">
                <Calendar size={12} /> Ngày trả file
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
