import Link from "next/link";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// ═══════════════════════════════════════════
// MobileBottomBar — Sticky 2-button bar for mobile
// Phase 04f: Stitch mobile design — "Sửa" + "Thu tiền"
// Only visible on mobile (lg:hidden via parent)
// ═══════════════════════════════════════════

interface Props {
  contractId: string;
  isCancelled: boolean;
  remainingAmount: number;
  onPaymentClick?: () => void;
}

export default function MobileBottomBar({
  contractId,
  isCancelled,
  remainingAmount,
  onPaymentClick,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (isCancelled || !mounted) return null;
  const paymentLabel = remainingAmount > 0 ? "Thu tiền" : "Phát sinh";

  const content = (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40
                  bg-bg-card border-t border-border/50
                  shadow-lg px-4 pt-3 pb-6"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
    >
      <div className="flex gap-3 w-full max-w-sm mx-auto">
        {/* Sửa HĐ — Link to edit page */}
        <Link
          href={`/contracts/${contractId}/edit`}
          className="flex-1 h-12 flex items-center justify-center
                     rounded-md shadow-xs border border-border
                     bg-bg-card text-text-primary
                     font-bold text-sm
                     active:scale-95 transition-all"
        >
          Sửa
        </Link>

        {/* Thu tien / phat sinh — opens payment form */}
        {onPaymentClick && (
          <div
            role="button"
            tabIndex={0}
            onClick={onPaymentClick}
            onKeyDown={(e) => { if (e.key === "Enter" && onPaymentClick) onPaymentClick(); }}
            className={`flex-1 h-12 flex items-center justify-center
                       rounded-md
                       ${remainingAmount > 0 ? "bg-interactive text-white" : "bg-bg-hover text-text-primary"}
                       font-bold text-sm
                       shadow-lg shadow-interactive/20
                       active:scale-95 transition-all`}
          >
            {paymentLabel}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
