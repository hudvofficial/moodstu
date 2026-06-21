"use client";

import { useState, useEffect } from "react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TagsInput } from "@/components/ui/tags-input";
import { Copy } from "lucide-react";
import type { Gallery } from "@/types/gallery";

interface GallerySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: Gallery;
  onSave: (settings: Partial<Gallery>) => Promise<void>;
}

export function GallerySettingsModal({ isOpen, onClose, gallery, onSave }: GallerySettingsModalProps) {
  const [title, setTitle] = useState(gallery.title || "");
  const [customSlug, setCustomSlug] = useState(gallery.custom_slug || "");
  const [clientName, setClientName] = useState(gallery.client_name || "");
  const [tags, setTags] = useState<string[]>(gallery.tags || []);
  const [allowComments, setAllowComments] = useState(gallery.allow_comments ?? true);
  const [enableWatermark, setEnableWatermark] = useState(gallery.enable_watermark ?? false);
  const [showNamecard, setShowNamecard] = useState(gallery.show_namecard ?? true);
  const [allowDownload, setAllowDownload] = useState(gallery.allow_download ?? false);
  
  const [isProtectPassword, setIsProtectPassword] = useState(!!gallery.password_hash || !!gallery.password);
  const [password, setPassword] = useState("");
  
  const [hasSelectionLimit, setHasSelectionLimit] = useState(!!gallery.selection_limit && gallery.selection_limit > 0);
  const [selectionLimit, setSelectionLimit] = useState(gallery.selection_limit || 0);

  const [isSaving, setIsSaving] = useState(false);

  // Sync settings state when the modal opens or the gallery changes. Depend
  // only on `gallery?.id` (primitive) to avoid resetting on every realtime update.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(gallery.title || "");
    setCustomSlug(gallery.custom_slug || "");
    setClientName(gallery.client_name || "");
    setTags(gallery.tags || []);
    setAllowComments(gallery.allow_comments ?? true);
    setEnableWatermark(gallery.enable_watermark ?? false);
    setShowNamecard(gallery.show_namecard ?? true);
    setAllowDownload(gallery.allow_download ?? false);
    setIsProtectPassword(!!gallery.password_hash || !!gallery.password);
    setPassword(""); // reset password input on open
    setHasSelectionLimit(!!gallery.selection_limit && gallery.selection_limit > 0);
    setSelectionLimit(gallery.selection_limit || 0);
  }, [isOpen, gallery?.id]);

  const handleCopyDriveLink = () => {
    if (gallery.drive_folder_url) {
      navigator.clipboard.writeText(gallery.drive_folder_url);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({
        title: title.trim(),
        custom_slug: customSlug.trim() || null,
        client_name: clientName || null,
        tags,
        allow_comments: allowComments,
        enable_watermark: enableWatermark,
        show_namecard: showNamecard,
        allow_download: allowDownload,
        selection_limit: hasSelectionLimit ? selectionLimit : null,
        // password can be handled via separate API or within the same save if the backend supports it.
        password: isProtectPassword && password ? password : null, 
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert("Cập nhật thất bại. Tên miền album có thể đã trùng lặp.");
    } finally {
      setIsSaving(false);
    }
  };

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant="secondary" onClick={onClose} disabled={isSaving}>Hủy bỏ</Button>
      <Button variant="primary" onClick={handleSave} disabled={isSaving}>{isSaving ? "Đang lưu..." : "Lưu"}</Button>
    </div>
  );

  return (
    <UnifiedModal isOpen={isOpen} onClose={onClose} title="Chỉnh sửa album" size="md" footer={footerContent}>
      <div className="space-y-4 md:space-y-6">
        
        {/* Drive Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary flex items-center gap-1">
            Link ảnh Google Drive
            <span className="text-text-muted text-xs cursor-help" title="Nơi lưu trữ ảnh gốc">?</span>
          </label>
          <div className="flex items-center gap-2">
            <Input 
              value={gallery.drive_folder_url || "Chưa kết nối"} 
              readOnly 
              className="bg-bg-subtle"
            />
            <Button variant="icon" onClick={handleCopyDriveLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Album Name */}
        <div className="space-y-1">
          <label className="text-caption font-medium text-text-primary">Tên album</label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Client Name */}
        <div className="space-y-1">
          <label className="text-caption font-medium text-text-primary">Tên khách hàng</label>
          <Input 
            value={clientName} 
            onChange={(e) => setClientName(e.target.value)} 
            placeholder="VD: Minh & Thủy"
          />
        </div>

        {/* Custom Slug */}
        <div className="space-y-1">
          <label className="text-caption font-medium text-text-primary">
            Tên miền album <span className="text-text-muted cursor-help" title="Tên miền rút gọn để gửi cho khách (VD: dam-cuoi-minh-thuy)">?</span>
          </label>
        <div className="flex items-center w-full border border-border rounded-md focus-within:ring-1 focus-within:ring-primary focus-within:border-primary overflow-hidden transition-shadow">
          <div className="px-3 py-[9px] bg-bg-muted border-r border-border text-sm text-text-muted whitespace-nowrap h-full">
            mood.vn/albums/
          </div>
          <Input 
            unstyled
            withBaseStyles={false}
            value={customSlug} 
            onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} 
            placeholder="nhap-ten-mien-tuy-chon"
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none border-none focus:ring-0"
          />
        </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">Tags (Tối đa 5 tag)</label>
          <TagsInput 
            value={tags} 
            onChange={(newTags) => setTags(newTags.slice(0, 5))} 
            placeholder="Nhập Tag..." 
          />
        </div>

        <hr className="border-border" />

        {/* Toggles List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Cho phép bình luận</span>
            <Switch checked={allowComments} onCheckedChange={setAllowComments} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary flex items-center gap-1">
              Bật watermark
              <span className="text-text-muted text-xs cursor-help" title="Đóng dấu mờ bảo vệ ảnh">?</span>
            </span>
            <Switch checked={enableWatermark} onCheckedChange={setEnableWatermark} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Hiện Name Card</span>
            <Switch checked={showNamecard} onCheckedChange={setShowNamecard} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Bảo vệ album bằng mật khẩu</span>
            <Switch checked={isProtectPassword} onCheckedChange={setIsProtectPassword} />
          </div>
          {isProtectPassword && (
            <div className="pl-4 border-l-2 border-border mt-2 space-y-2">
              <Input 
                type="text" 
                placeholder={gallery.password_hash ? "Đã có mật khẩu (nhập để đổi mới)" : "Nhập mật khẩu mới"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary flex items-center gap-1">
              Cho phép tải xuống
              <span className="text-text-muted text-xs cursor-help" title="Khách có thể tải ảnh bản đẹp">?</span>
            </span>
            <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">Giới hạn số lượng ảnh được chọn</span>
            <Switch checked={hasSelectionLimit} onCheckedChange={setHasSelectionLimit} />
          </div>
          {hasSelectionLimit && (
            <div className="pl-4 border-l-2 border-border mt-2 space-y-2">
              <Input 
                type="number" 
                placeholder="Số lượng tối đa" 
                value={selectionLimit || ""}
                onChange={(e) => setSelectionLimit(parseInt(e.target.value) || 0)}
                min={1}
              />
            </div>
          )}
        </div>

      </div>
    </UnifiedModal>
  );
}
