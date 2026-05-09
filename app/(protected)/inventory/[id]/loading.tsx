import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownToLine, ArrowUpFromLine, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InventoryDetailLoading() {
  return (
    <div className="main-container gap-4!">
      {/* ── Breadcrumb Skeleton ── */}
      <div className="flex items-center gap-2 py-1.5">
        <Skeleton className="h-4 w-20" />
        <span className="text-border">/</span>
        <Skeleton className="h-4 w-32" />
      </div>

      {/* ── Header Card Skeleton ── */}
      <div className="card-base flex items-start gap-4 py-4 px-5">
        <Skeleton className="size-14 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" disabled className="gap-1.5">
            <Pencil className="w-4 h-4" />
            <span className="hidden sm:inline">Sửa</span>
          </Button>
          <Button variant="secondary" disabled className="gap-1.5 text-error">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Xóa</span>
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP LAYOUT (≥1024px)
          ══════════════════════════════════════════ */}
      <div className="max-lg:hidden">
        <div className="detail-grid">
          {/* ── Main (8 col) ── */}
          <div className="detail-main space-y-4">
            <div className="card-base p-5">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
                <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
                <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
                <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
              </div>
              <div className="h-px bg-border/30 my-4" />
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
                <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
              </div>
            </div>

            <div className="card-base p-5">
              <Skeleton className="h-5 w-40 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>

          {/* ── Sidebar (4 col) ── */}
          <div className="detail-sidebar space-y-4">
            <div className="card-base p-4 space-y-2.5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Button variant="primary" disabled className="w-full gap-2">
                <ArrowDownToLine className="w-4 h-4" />
                Nhập kho
              </Button>
              <Button variant="secondary" disabled className="w-full gap-2">
                <ArrowUpFromLine className="w-4 h-4" />
                Xuất kho
              </Button>
            </div>

            <div className="card-base p-4">
              <Skeleton className="h-5 w-24 mb-4" />
              <div className="space-y-3">
                <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-12" /></div>
                <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-12" /></div>
                <div className="flex justify-between"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-16" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          MOBILE LAYOUT (<1024px)
          ══════════════════════════════════════════ */}
      <div className="lg:hidden space-y-4">
        {/* Mobile Action Card */}
        <div className="card-base p-4 grid grid-cols-2 gap-2">
          <Button variant="primary" disabled className="w-full gap-2">
            <ArrowDownToLine className="w-4 h-4" />
            Nhập
          </Button>
          <Button variant="secondary" disabled className="w-full gap-2">
            <ArrowUpFromLine className="w-4 h-4" />
            Xuất
          </Button>
        </div>

        {/* Info & Price */}
        <div className="card-base p-4">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
            <div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-24" /></div>
          </div>
        </div>

        {/* Transactions */}
        <div className="card-base p-4">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
