"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyGalleryPassword } from "@/app/actions/gallery-public-actions";
import type { Gallery } from "@/types/gallery";

const STORAGE_KEY_PREFIX = "gallery_access_";

interface HeartPasswordModalProps {
  isOpen: boolean;
  galleryId: string;
  accessUrl: string;
  galleryTitle?: string | null;
  onClose: () => void;
  onUnlocked: (gallery: Gallery) => void;
}

export default function HeartPasswordModal({
  isOpen,
  galleryId,
  accessUrl,
  galleryTitle,
  onClose,
  onUnlocked,
}: HeartPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu để chọn ảnh.");
      return;
    }

    setLoading(true);
    setError("");
    const res = await verifyGalleryPassword(galleryId, password.trim(), accessUrl);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Mật khẩu không đúng.");
      return;
    }

    if (res.data.accessToken) {
      sessionStorage.setItem(STORAGE_KEY_PREFIX + galleryId, res.data.accessToken);
    }
    setPassword("");
    onUnlocked(res.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock size={20} />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">Mật khẩu chọn ảnh</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Nhập mật khẩu do Mood cung cấp để chọn ảnh gửi hậu kỳ cho {galleryTitle || "album này"}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              unstyled
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Nhập mật khẩu..."
              autoFocus
              className="w-full rounded-xl border border-border px-4 py-3 pr-10 text-sm outline-none focus:border-primary"
            />
            <Button
              unstyled
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          </div>

          {error ? <p className="text-center text-sm text-error">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              unstyled
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary"
              disabled={loading}
            >
              Đóng
            </Button>
            <Button
              unstyled
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {loading ? "Đang kiểm tra..." : "Xác nhận"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}