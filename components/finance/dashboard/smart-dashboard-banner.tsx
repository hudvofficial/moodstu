import Link from "next/link";
import { ArrowRight, Gauge, Sparkles } from "lucide-react";

export function SmartDashboardBanner() {
  return (
    <Link
      href="/finance/dashboard"
      className="group relative block overflow-hidden rounded-lg border border-primary/20 bg-primary p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-white/50" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Gauge className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-caption font-bold uppercase text-white/80">Đang phát triển</span>
            </div>
            <h2 className="text-h2 text-white">Dashboard Thông Minh</h2>
            <p className="mt-1 text-body-sm text-white/85">
              Điểm hòa vốn, dự báo dòng tiền và sức khỏe tài chính.
            </p>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-2 text-body-sm font-bold text-primary transition group-hover:translate-x-1">
          Xem phân tích
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
