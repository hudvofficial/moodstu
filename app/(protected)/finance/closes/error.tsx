"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ClosesError({ error, reset }: ErrorProps) {
  return (
    <div className="main-container">
      <div className="card-base flex flex-col items-center gap-4 p-10 text-center">
        <div className="icon-box bg-error/10 text-error">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-h2">Không thể tải trang chốt sổ</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            {error.message || "Đã xảy ra lỗi. Vui lòng thử lại."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={reset} className="btn-secondary">
            Thử lại
          </button>
          <Link href="/finance" className="btn-primary">
            Về Tài chính
          </Link>
        </div>
      </div>
    </div>
  );
}
