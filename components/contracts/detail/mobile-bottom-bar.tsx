import Link from "next/link";

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
  if (isCancelled) return null;

  return (
    <div
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40
                  bg-bg-primary
                  shadow-[0_-2px_12px_rgba(0,0,0,0.06)]
                  px-4 pt-3 pb-8 safe-bottom"
    >
      <div className="flex gap-3 max-w-[375px] mx-auto">
        {/* Sửa HĐ — Link to edit page */}
        <Link
          href={`/contracts/${contractId}/edit`}
          className="flex-1 h-12 flex items-center justify-center
                     rounded-md shadow-xs
                     text-text-primary
                     font-bold text-sm
                     active:scale-[0.98] transition-all"
        >
          Sửa
        </Link>

        {/* Thu tiền — opens payment form */}
        {remainingAmount > 0 && (
          <button
            onClick={onPaymentClick}
            className="flex-1 h-12 flex items-center justify-center
                       rounded-md
                       bg-interactive text-white
                       font-bold text-sm
                       shadow-lg shadow-interactive/20
                       active:scale-[0.98] transition-all"
          >
            Thu tiền
          </button>
        )}
      </div>
    </div>
  );
}
