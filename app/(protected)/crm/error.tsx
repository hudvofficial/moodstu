"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/ux-states";

export default function CRMError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("CRM Error:", error);
  }, [error]);

  return (
    <div className="w-full h-full flex items-center justify-center p-5">
      <EmptyState
        icon={AlertTriangle}
        title="Đã xảy ra lỗi"
        description={error.message || "Không thể tải dữ liệu CRM vào lúc này. Vui lòng thử lại sau."}
        actionLabel="Thử lại"
        onAction={reset}
      />
    </div>
  );
}
