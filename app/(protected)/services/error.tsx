"use client";

import { Button } from "@/components/ui/button";

export default function ServicesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="main-container">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-h3 mb-2">Đã xảy ra lỗi</h2>
        <p className="text-sm text-text-muted mb-6">
          {error.message || "Không thể tải danh sách dịch vụ"}
        </p>
        <Button type="button" onClick={reset} className="px-6 py-2.5 rounded-xl">
          Thử lại
        </Button>
      </div>
    </div>
  );
}
