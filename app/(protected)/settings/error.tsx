"use client";

import { Button } from "@/components/ui/button";

/* ═══════════════════════════════════════════
   Settings Error — Error Boundary
   Pattern: Spec §0.4 (contracts/error.tsx)
   ═══════════════════════════════════════════ */

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
      <div className="text-4xl">😕</div>
      <h2 className="text-h2">Có lỗi xảy ra</h2>
      <p className="text-body text-text-secondary text-center max-w-md">
        {error.message || "Không thể tải trang cài đặt. Vui lòng thử lại."}
      </p>
      <Button onClick={() => reset()} variant="primary">
        Thử lại
      </Button>
    </div>
  );
}
