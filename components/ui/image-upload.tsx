"use client";

/**
 * 📷 ImageUpload — Server-side upload with local preview
 *
 * SSOT Tokens: bg-bg-hover, border-border, rounded-xl, text-caption, label-base
 * Pattern: file → URL.createObjectURL (instant preview) → server upload → onChange(publicUrl)
 */

import { useState, useRef } from "react";
import Image from "next/image";
import { ImagePlus, Pencil, Loader2 } from "lucide-react";

import { toast } from "@/lib/toast-utils";

// ─── TYPES ───────────────────────────────────────

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (formData: FormData) => Promise<{ success: boolean; data?: { url: string }; error?: string }>;
  maxSizeMB?: number;
}

// ─── COMPONENT ───────────────────────────────────

export function ImageUpload({ value, onChange, onUpload, maxSizeMB = 10 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview || value;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate client-side (fast feedback)
    if (!file.type.startsWith("image/")) {
      toast("Chỉ chấp nhận file ảnh", "error");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast(`Ảnh không được vượt quá ${maxSizeMB}MB`, "error");
      return;
    }

    // Instant preview via ObjectURL
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // Server upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (value) formData.append("oldUrl", value);

      const result = await onUpload(formData);
      if (result.success) {
        onChange(result.data!.url);
        toast("Đã tải ảnh lên. Bấm Lưu để hoàn tất", "success");
      } else {
        toast(result.error || "Lỗi upload", "error");
        setPreview(null); // revert preview
      }
    } catch {
      toast("Lỗi upload ảnh", "error");
      setPreview(null);
    } finally {
      setUploading(false);
      // Cleanup ObjectURL
      URL.revokeObjectURL(localUrl);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="aspect-3/4 w-full max-w-[200px] bg-bg-hover border-2 border-dashed border-border rounded-xl overflow-hidden relative group cursor-pointer hover:border-primary/40 transition-colors"
      >
        {displayUrl ? (
          <>
            <Image src={displayUrl} alt="Ảnh trang phục" fill className="object-cover" sizes="200px" />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Pencil className="w-6 h-6 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <ImagePlus className="w-8 h-8 text-text-muted/40" />
            <span className="text-caption text-text-muted">Chọn ảnh</span>
          </div>
        )}

        {/* Upload spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
