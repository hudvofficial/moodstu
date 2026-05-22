"use client";

import { useState } from "react";
import { Link as LinkIcon, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createGallery } from "@/app/actions/gallery-actions";
import { toast } from "@/lib/toast-utils";

interface DriveLinkModalContentProps {
  contractId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function DriveLinkModalContent({ contractId, onClose, onSuccess }: DriveLinkModalContentProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    driveUrl: "",
    title: "",
    clientName: "",
    customSlug: "",
    tags: [] as string[],
    tagInput: "",
    allowComments: true,
    enableWatermark: false,
    showNamecard: true,
    hasPassword: false, // UI only, actual password feature might need more fields
    allowDownload: true,
    hasSelectionLimit: false,
    selectionLimit: "",
  });

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = formData.tagInput.trim();
      if (val && !formData.tags.includes(val) && formData.tags.length < 5) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, val], tagInput: "" }));
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async () => {
    if (!formData.driveUrl.trim()) {
      toast("Vui lòng nhập Link ảnh Google Drive", "error");
      return;
    }
    if (!formData.title.trim()) {
      toast("Vui lòng nhập Tên album", "error");
      return;
    }

    setLoading(true);
    const limit = formData.hasSelectionLimit && formData.selectionLimit ? parseInt(formData.selectionLimit) : null;

    const res = await createGallery(
      contractId,
      formData.title.trim(),
      formData.driveUrl.trim(),
      {
        client_name: formData.clientName.trim() || null,
        custom_slug: formData.customSlug.trim() || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        allow_comments: formData.allowComments,
        enable_watermark: formData.enableWatermark,
        show_namecard: formData.showNamecard,
        allow_download: formData.allowDownload,
        selection_limit: limit,
      }
    );

    if (res.success) {
      toast("Tạo album thành công", "success");
      onSuccess();
    } else {
      toast(res.error, "error");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* 1. Link Drive */}
      <div className="space-y-1">
        <label className="text-caption font-medium text-text-primary">
          Link ảnh Google Drive <span className="text-text-muted cursor-help" title="Link thư mục Google Drive chứa ảnh gốc/đã sửa">?</span>
        </label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="Link Google Drive thư mục chứa ảnh vào đây"
            value={formData.driveUrl}
            onChange={(e) => setFormData({ ...formData, driveUrl: e.target.value })}
            className="flex-1"
          />
        </div>
      </div>

      {/* 2. Tên album */}
      <div className="space-y-1">
        <label className="text-caption font-medium text-text-primary">Tên album</label>
        <Input
          type="text"
          placeholder="Tên album (VD: Ảnh gốc)"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full"
        />
      </div>

      {/* 3. Tên khách hàng */}
      <div className="space-y-1">
        <label className="text-caption font-medium text-text-primary">Tên khách hàng</label>
        <Input
          type="text"
          placeholder="Tên khách hàng"
          value={formData.clientName}
          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
          className="w-full"
        />
      </div>

      {/* 4. Tên miền album */}
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
            type="text"
            placeholder="nhap-ten-mien-tuy-chon"
            value={formData.customSlug}
            onChange={(e) => setFormData({ ...formData, customSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            className="flex-1 px-3 py-2 text-sm bg-transparent outline-none border-none focus:ring-0"
          />
        </div>
      </div>

      {/* 5. Tags */}
      <div className="space-y-1">
        <label className="text-caption font-medium text-text-primary">
          Tags <span className="text-text-muted font-normal">(Tối đa 5 tag)</span>
        </label>
        <Input
          type="text"
          placeholder="Nhập Tag..."
          value={formData.tagInput}
          onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
          onKeyDown={handleAddTag}
          className="w-full"
          disabled={formData.tags.length >= 5}
        />
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-bg-muted text-xs text-text-primary">
                {tag}
                <Button
                  unstyled
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-text-muted hover:text-red-500"
                >
                  <X size={12} />
                </Button>
              </span>
            ))}
          </div>
        )}
        <p className="text-caption text-text-muted">Mẹo: Nhấn Enter hoặc dấu phẩy (,) để thêm tag</p>
      </div>

      {/* Lưu ý */}
      <div className="text-xs text-text-muted">
        <span className="font-medium text-text-primary">Lưu ý: Ảnh bìa album sẽ được thiết lập sau khi tạo album</span>
        <br />
        Sau khi tạo album, hãy chọn mở ảnh bạn muốn làm ảnh bìa album và nhấn nút &quot;Đặt làm ảnh bìa&quot; để hoàn tất
      </div>

      {/* 6. Settings Toggles */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-text-primary cursor-pointer">Cho phép bình luận</label>
          <Switch
            checked={formData.allowComments}
            onCheckedChange={(c) => setFormData({ ...formData, allowComments: c })}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-text-primary flex items-center gap-1 cursor-pointer">
            Bật watermark <span className="text-text-muted cursor-help">?</span>
          </label>
          <Switch
            checked={formData.enableWatermark}
            onCheckedChange={(c) => setFormData({ ...formData, enableWatermark: c })}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-text-primary cursor-pointer">Hiện Name Card</label>
          <Switch
            checked={formData.showNamecard}
            onCheckedChange={(c) => setFormData({ ...formData, showNamecard: c })}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-text-primary flex items-center gap-1 cursor-pointer">
            Cho phép tải xuống <span className="text-text-muted cursor-help">?</span>
          </label>
          <Switch
            checked={formData.allowDownload}
            onCheckedChange={(c) => setFormData({ ...formData, allowDownload: c })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-text-primary cursor-pointer">Giới hạn số lượng ảnh được chọn</label>
            <Switch
              checked={formData.hasSelectionLimit}
              onCheckedChange={(c) => setFormData({ ...formData, hasSelectionLimit: c })}
            />
          </div>
          {formData.hasSelectionLimit && (
            <div className="pl-4">
              <Input
                type="number"
                placeholder="Số ảnh tối đa (VD: 50)"
                value={formData.selectionLimit}
                onChange={(e) => setFormData({ ...formData, selectionLimit: e.target.value })}
                className="w-full max-w-[200px]"
                min="1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-border">
        <Button type="button" unstyled onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-bg-muted" disabled={loading}>
          Hủy bỏ
        </Button>
        <Button
          type="button"
          unstyled
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span>Đang tạo...</span>
            </div>
          ) : (
            "Tạo ngay"
          )}
        </Button>
      </div>
    </div>
  );
}
