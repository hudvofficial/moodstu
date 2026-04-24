"use client";
/* eslint-disable react/forbid-elements */

import { useState, useEffect } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { verifyGalleryPassword } from "@/app/actions/gallery-actions";
import type { Gallery } from "@/types/gallery";

// ═══════════════════════════════════════════
// PasswordGate — Màn hình nhập mật khẩu
// Check localStorage → nếu khớp = skip gate
// ═══════════════════════════════════════════

interface PasswordGateProps {
  galleryId: string;
  galleryTitle: string | null;
  coverImage?: string | null;
  mode?: "select" | "view";
  onUnlock: (gallery: Gallery) => void;
}

const STORAGE_KEY_PREFIX = "gallery_pwd_";

export default function PasswordGate({
  galleryId,
  galleryTitle,
  coverImage,
  mode = "select",
  onUnlock,
}: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checking, setChecking] = useState(true);

  // ─── Auto-verify from localStorage on mount ───
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + galleryId);
    if (saved) {
      verifyGalleryPassword(galleryId, saved).then((res) => {
        if (res.success) {
          onUnlock(res.data);
        } else {
          localStorage.removeItem(STORAGE_KEY_PREFIX + galleryId);
          setChecking(false);
        }
      });
    } else {
      setChecking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) { setError("Vui lòng nhập mật khẩu."); return; }

    setLoading(true);
    setError("");
    const res = await verifyGalleryPassword(galleryId, password.trim());
    setLoading(false);

    if (res.success) {
      localStorage.setItem(STORAGE_KEY_PREFIX + galleryId, password.trim());
      onUnlock(res.data);
    } else {
      setError(res.error || "Mật khẩu không đúng.");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-gallery-bg)" }}>
        <div className="animate-pulse text-sm"
          style={{ color: "var(--color-gallery-text-dim)" }}>Đang kiểm tra...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center relative overflow-hidden px-4"
      style={{ background: "var(--color-gallery-bg)" }}>
      {/* Background blur */}
      {coverImage && (
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${coverImage})`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "blur(40px) brightness(0.25)", transform: "scale(1.2)",
        }} />
      )}

      {/* Gate card */}
      <div className="relative z-10 w-full max-w-96 mx-auto backdrop-blur-2xl rounded-2xl p-8 shadow-2xl shadow-black/30"
        style={{
          background: "var(--color-gallery-card-bg)",
        }}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: "var(--color-gallery-card-bg)" }}>
            <Lock size={22} style={{ color: "var(--color-gallery-icon)" }} />
          </div>
          <h1 className="text-lg font-bold mb-1"
            style={{ color: "var(--color-gallery-text)" }}>
            {galleryTitle || "Album Riêng Tư"}
          </h1>
          <p className="text-xs" style={{ color: "var(--color-gallery-text-muted)" }}>
            {mode === "view" ? "Vui lòng nhập mật khẩu để xem album" : "Vui lòng nhập mật khẩu để xem và chọn ảnh"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="Mật khẩu..."
              autoFocus
              className="w-full px-4 py-3 pr-10 text-sm rounded-xl outline-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              style={{
                background: "var(--color-gallery-card-bg)",
                color: "var(--color-gallery-text)",
                boxShadow: error
                  ? "inset 0 0 0 1px var(--color-error)"
                  : "inset 0 0 0 1px var(--color-gallery-border)",
              }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              style={{ color: "var(--color-gallery-text-dim)" }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-center text-error">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${loading ? "opacity-70" : ""}`}
            style={{ background: "var(--color-primary)", color: "var(--color-gallery-btn-text)" }}>
            {loading ? "Đang kiểm tra..." : "Vào Xem"}
          </button>
        </form>

        <p className="text-center mt-6 text-xs"
          style={{ color: "var(--color-gallery-text-dim)" }}>
          Mood Studio
        </p>
      </div>
    </div>
  );
}
