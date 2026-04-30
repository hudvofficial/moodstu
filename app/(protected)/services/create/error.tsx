"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateServiceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="main-container">
      <div className="card-base p-6 lg:p-8 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-text-main">
              Không thể mở form tạo dịch vụ
            </h1>
            <p className="text-body-sm text-text-muted mt-1">
              Danh mục dịch vụ chưa tải được. Hãy thử lại hoặc quay về danh sách dịch vụ.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mt-5">
              <Button
                type="button"
                variant="interactive"
                onClick={reset}
                className="flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Thử lại
              </Button>
              <Link
                href="/services"
                className="btn btn-outline px-5 py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Về danh sách
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
