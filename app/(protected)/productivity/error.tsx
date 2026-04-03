"use client";

import { Button } from "@/components/ui/button";

export default function ProductivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-h2">Không thể tải trang năng suất</h2>
      <p className="max-w-md text-center text-body text-text-secondary">
        {error.message || "Đã có lỗi không mong muốn. Vui lòng thử lại."}
      </p>
      <Button onClick={() => reset()}>Thử lại</Button>
    </div>
  );
}
