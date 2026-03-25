"use client";

// ═══════════════════════════════════════════
// Error Boundary — Contracts Module
// Gap D fix: prevents white screen on server fetch crash
// Uses SSOT tokens from design-system.css
// ═══════════════════════════════════════════

export default function ContractsError({
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
        {error.message || "Đã có lỗi không mong muốn. Vui lòng thử lại."}
      </p>
      <button onClick={() => reset()} className="btn btn-primary">
        Thử lại
      </button>
    </div>
  );
}
