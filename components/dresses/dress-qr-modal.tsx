"use client";

/**
 * DressQRModal — QR Label + Print for dress items
 * Pattern: qr-code-styling dynamic import (share-gallery-modal.tsx)
 * Print: @media print CSS (print-contract-client.tsx)
 */

import { useEffect, useRef, useCallback } from "react";
import { Printer, QrCode } from "lucide-react";
import { UnifiedModal } from "@/components/ui/unified-modal";
import { Button } from "@/components/ui/button";
import { printDressLabel, printDressLabelBatch } from "@/lib/print-qr-label";
import type { DressItem } from "@/types/dress";

// ─── TYPES ──────────────────────────────────

interface DressQRModalProps {
  dress?: DressItem | null;
  /** Array for batch print mode */
  dresses?: DressItem[];
  isOpen: boolean;
  onClose: () => void;
}

// ─── SINGLE QR LABEL ────────────────────────

export function QRLabel({ dress, qrSize = 180 }: { dress: DressItem; qrSize?: number }) {
  const qrRef = useRef<HTMLDivElement>(null);
   
  const qrInstance = useRef<any>(null);

  const generateQR = useCallback(async () => {
    if (!qrRef.current || !dress.item_code) return;
    const QRCodeStyling = (await import("qr-code-styling")).default;
    qrRef.current.innerHTML = "";
    qrInstance.current = new QRCodeStyling({
      width: qrSize,
      height: qrSize,
      data: dress.item_code,
      dotsOptions: { color: "var(--color-text-primary)", type: "rounded" as const },
      cornersSquareOptions: { type: "extra-rounded" as const },
      backgroundOptions: { color: "transparent" },
    });
    qrInstance.current.append(qrRef.current);
  }, [dress.item_code, qrSize]);

  useEffect(() => {
    void generateQR();
  }, [generateQR]);

  if (!dress.item_code) {
    return (
      <div className="flex flex-col items-center gap-2 py-8">
        <QrCode className="w-12 h-12 text-text-muted/30" />
        <p className="text-caption text-text-muted">Chưa có mã trang phục</p>
      </div>
    );
  }

  return (
    <div className="qr-label-item flex flex-col items-center gap-3 p-4">
      <div ref={qrRef} className="flex items-center justify-center" />
      <div className="w-full flex flex-col items-center gap-1.5 px-3 py-2 bg-white/60 rounded-lg">
        <span className="tag-badge text-lg">{dress.item_code}</span>
        <p className="text-body-sm font-semibold text-text-primary text-center">{dress.name}</p>
        <div className="flex items-center gap-2 text-caption text-text-muted">
          {dress.size && <span>Size {dress.size}</span>}
          {dress.size && dress.color && <span>·</span>}
          {dress.color && <span>{dress.color}</span>}
        </div>
        {dress.rental_price != null && dress.rental_price > 0 && (
          <span className="text-caption font-semibold text-primary">
            {new Intl.NumberFormat("vi-VN").format(dress.rental_price)}đ
          </span>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────

export function DressQRModal({ dress, dresses, isOpen, onClose }: DressQRModalProps) {
  const isBatch = !!dresses?.length;
  const items = isBatch ? dresses!.filter(d => d.item_code) : (dress ? [dress] : []);
  
  const qrContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || items.length === 0) return null;

  const handlePrint = () => {
    if (isBatch) {
      // Collect all QR canvas data URLs
      const qrDataUrls = new Map<string, string>();
      const canvases = qrContainerRef.current?.querySelectorAll("canvas");
      canvases?.forEach((canvas) => {
        // Find parent qr-label-item to match with dress item_code
        const labelItem = canvas.closest(".qr-label-item");
        const codeEl = labelItem?.querySelector(".tag-badge");
        if (codeEl?.textContent) {
          qrDataUrls.set(codeEl.textContent.trim(), canvas.toDataURL("image/png"));
        }
      });
      printDressLabelBatch(items, qrDataUrls);
    } else {
      const canvas = qrContainerRef.current?.querySelector("canvas");
      const qrDataUrl = canvas ? canvas.toDataURL("image/png") : undefined;
      printDressLabel(items[0], qrDataUrl);
    }
  };

  const title = isBatch
    ? `In nhãn QR (${items.length} trang phục)`
    : `Mã QR — ${dress?.name || ""}`;

  const hasValidCode = isBatch || !!dress?.item_code;

  return (
    <>
      <UnifiedModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size={isBatch ? "lg" : "sm"}
        footer={
          hasValidCode ? (
            <Button unstyled onClick={handlePrint} className="btn btn-primary w-full gap-2">
              <Printer size={16} />
              {isBatch ? `In ${items.length} nhãn` : "In nhãn QR"}
            </Button>
          ) : undefined
        }
      >
        <div ref={qrContainerRef}>
          {isBatch ? (
            /* Batch grid: 2 columns for A4 print */
            <div className="grid grid-cols-2 gap-4">
              {items.slice(0, 50).map((d) => (
                <QRLabel key={d.id} dress={d} qrSize={120} />
              ))}
            </div>
          ) : (
            /* Single QR label */
            <QRLabel dress={items[0]} />
          )}
        </div>
      </UnifiedModal>

    </>
  );
}
