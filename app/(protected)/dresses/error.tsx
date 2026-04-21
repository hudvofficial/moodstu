"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DressesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="main-container">
      <div className="card-base p-8 text-center">
        <AlertTriangle size={32} className="text-status-error mx-auto mb-3" />
        <h2 className="text-h3 text-text-primary mb-1">Có lỗi xảy ra</h2>
        <p className="text-body-sm text-text-muted mb-4">
          {error.message || "Không thể tải trang trang phục"}
        </p>
        <Button type="button" onClick={reset}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
