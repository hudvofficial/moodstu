"use client";

// ═══════════════════════════════════════════
// Error Boundary — Inventory Module
// Clone: contracts/error.tsx
// Uses SSOT tokens from design-system.css
// ═══════════════════════════════════════════

import { Button } from "@/components/ui/button";

export default function InventoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <div className="text-4xl">📦</div>
      <h2 className="text-h2">Có lỗi xảy ra</h2>
      <p className="text-body text-text-secondary text-center max-w-md">
        {error.message || "Đã có lỗi không mong muốn khi tải kho vật tư. Vui lòng thử lại."}
      </p>
      <Button type="button" onClick={() => reset()}>
        Thử lại
      </Button>
    </div>
  );
}
