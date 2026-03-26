"use client";

/**
 * DressScannerModal — Camera QR Scanner
 * Lib: qr-scanner (nimiq) — Web Worker decode, off main thread
 * Dynamic import → 0KB initial bundle
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ScanLine, Camera } from "lucide-react";
import { toast } from "@/lib/toast-utils";

// ─── TYPES ──────────────────────────────────

interface DressScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

// ─── MAIN COMPONENT ─────────────────────────

export function DressScannerModal({ isOpen, onClose, onScanned }: DressScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const [isStarting, setIsStarting] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const cleanup = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const startScanner = async () => {
      // Check camera support
      if (!navigator.mediaDevices?.getUserMedia) {
        toast("Trình duyệt không hỗ trợ camera", "error");
        handleClose();
        return;
      }

      try {
        setIsStarting(true);
        const QrScanner = (await import("qr-scanner")).default;
        if (cancelled || !videoRef.current) return;

        scannerRef.current = new QrScanner(
          videoRef.current,
          (result: { data: string }) => {
            if (result.data) {
              onScanned(result.data);
              handleClose();
            }
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        await scannerRef.current.start();
        if (cancelled) { cleanup(); return; }
        setIsStarting(false);

        // 30s timeout
        timeoutRef.current = setTimeout(() => {
          toast("Không tìm thấy mã QR. Hãy thử lại.", "warning");
          handleClose();
        }, 30000);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "";
        if (message.includes("Permission") || message.includes("NotAllowed")) {
          toast("Vui lòng cho phép truy cập camera", "error");
        } else {
          toast("Không thể mở camera. Hãy thử lại.", "error");
        }
        handleClose();
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <ScanLine className="w-5 h-5" />
          <span className="text-body-sm font-semibold">Quét mã QR</span>
        </div>
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera viewport */}
      <div className="flex-1 relative flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        {/* Loading state */}
        {isStarting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera className="w-12 h-12 text-white/60 animate-pulse" />
            <p className="text-caption text-white/60">Đang khởi động camera...</p>
          </div>
        )}

        {/* Scan guide overlay */}
        {!isStarting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 rounded-2xl border-2 border-white/40" />
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-4 text-center">
        <p className="text-caption text-white/50">
          Đưa mã QR vào khung hình để quét tự động
        </p>
      </div>
    </div>
  );
}
