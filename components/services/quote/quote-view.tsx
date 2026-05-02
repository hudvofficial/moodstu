
"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Printer, Pencil, Phone, MapPin } from "lucide-react";
import { getStudioInfo } from "@/app/actions/settings-queries";
import { useRealtime } from "@/hooks/use-realtime";
import { cacheKeys, useSWR } from "@/lib/swr";
import { parseContentStructure } from "@/lib/utils/service-utils";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_UNIT_LABELS, ServiceUnit } from "@/types/service-constants";
import type { ServiceRecord } from "@/types/service";
import type { StudioInfo } from "@/types/service";

// ═══════════════════════════════════════════
// QuoteView V2 — Full-page printable quote
//
// Route: /services/[id]/quote
// Desktop: 12-col grid (8+4), Stripe-style sidebar
// Mobile: iOS HIG Inset Grouped List + Sticky bottom
//
// @see Task 4 / Quote V2 Redesign
// ═══════════════════════════════════════════

interface Props {
  service: ServiceRecord;
  studio: StudioInfo;
}

export default function QuoteView({ service, studio }: Props) {
  useRealtime("studio_info", {
    cacheKeys: [cacheKeys.studioInfo()],
    eventTypes: ["UPDATE"],
    debounceMs: 120,
  });

  const { data: liveStudio } = useSWR<StudioInfo>(
    cacheKeys.studioInfo(),
    async () => {
      const result = await getStudioInfo();
      if (!result.success || !result.data) {
        throw new Error("Không thể tải thông tin studio");
      }
      return result.data as StudioInfo;
    },
    {
      fallbackData: studio,
      revalidateOnMount: false,
    },
  );

  const structure = parseContentStructure(service.description || "");
  const itemCount = useMemo(
    () => structure.reduce((sum, s) => sum + s.items.length, 0),
    [structure],
  );

  const currentStudio = liveStudio || studio;
  const studioLogo = currentStudio?.logo_url || "/logo.png";
  const studioName = currentStudio?.name || "Mood Studio";
  const formattedPrice = formatCurrency(service.selling_price);



  return (
    <>
      {/* ─── PRINT STYLES ─── */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .quote-no-print { display: none !important; }
          [data-sidebar] { display: none !important; }
          [data-bottom-nav] { display: none !important; }
          main { padding-bottom: 0 !important; overflow: visible !important; }
          .quote-print-only { display: block !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════ */}
      {/*  DESKTOP LAYOUT (≥ 1024px) — Stripe-style Grid   */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="hidden lg:block min-h-screen bg-bg-sidebar">
        {/* Toolbar */}
        <div className="quote-no-print sticky top-0 z-40 bg-bg-card/90 backdrop-blur-md shadow-xs px-6 py-3 flex items-center justify-between">
          <Link
            href="/services"
            className="flex items-center gap-2 text-body-sm text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Quay lại danh sách</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4" />
              In / PDF
            </Button>
            <Link
              href={`/services/${service.id}`}
              className="btn-ghost text-primary"
            >
              <Pencil className="w-3.5 h-3.5" />
              Chỉnh sửa
            </Link>
          </div>
        </div>

        {/* Grid Content */}
        <div className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-12 gap-8 items-start">
          {/* ── Main Content (8 cols) ── */}
          <div className="col-span-8 space-y-6">
            {/* Hero Card */}
            <div className="bg-bg-card rounded-2xl shadow-sm p-8">
              <div className="flex items-start gap-5 mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Image
                    src={studioLogo}
                    alt={studioName}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-overline text-text-muted mb-1">
                    {studioName} · Báo giá dịch vụ
                  </p>
                  <h1 className="text-h1 font-black text-interactive leading-tight">
                    {service.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    {service.unit && (
                      <span className="text-caption font-bold text-primary bg-primary/8 px-2.5 py-0.5 rounded-full tracking-wide">
                        {SERVICE_UNIT_LABELS[service.unit as ServiceUnit] || service.unit}
                      </span>
                    )}
                    {itemCount > 0 && (
                      <span className="text-caption font-bold text-text-muted bg-bg-hover px-2.5 py-0.5 rounded-full">
                        {itemCount} hạng mục
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Sections */}
            {structure.length > 0 ? (
              <div className="space-y-4">
                {structure.map((section, idx) => (
                  <div key={idx} className="bg-bg-card rounded-2xl shadow-sm p-6">
                    {section.title && (
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-1 h-5 bg-primary rounded-full shrink-0" />
                        <h3 className="text-label text-primary">
                          {section.title}
                        </h3>
                      </div>
                    )}
                    <ul className="space-y-2.5">
                      {section.items.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-body-sm text-text-secondary leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-[7px] shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-bg-card rounded-2xl shadow-sm p-12 text-center">
                <p className="text-body-sm text-text-muted italic">Nội dung chi tiết đang được cập nhật</p>
              </div>
            )}
          </div>

          {/* ── Sidebar (4 cols — Sticky) ── */}
          <div className="col-span-4 sticky top-20 space-y-4">
            {/* Price Card (Stripe Checkout style) */}
            <div className="bg-bg-card rounded-2xl shadow-sm p-6">
              <p className="text-overline text-text-muted mb-3">
                Giá trọn gói
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-amount font-black text-interactive tabular-nums tracking-tighter">
                  {formattedPrice.replace("₫", "").trim()}
                </span>
                <span className="text-caption font-bold text-text-muted">VNĐ</span>
              </div>

              {/* Divider */}
              <div className="h-px bg-border/60 my-5" />

              {/* Actions */}
              <div className="space-y-2.5 quote-no-print">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4" />
                  Tải báo giá PDF
                </Button>
                <Link
                  href={`/services/${service.id}`}
                  className="btn-secondary w-full"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Chỉnh sửa dịch vụ
                </Link>
              </div>
            </div>

            {/* Studio Contact Card */}
            <div className="bg-bg-card rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Image
                    src={studioLogo}
                    alt={studioName}
                    width={22}
                    height={22}
                    className="object-contain"
                  />
                </div>
                <div>
                  <p className="text-body-sm font-bold text-text-main">{studioName}</p>
                  <p className="text-caption text-text-muted">Liên hệ tư vấn</p>
                </div>
              </div>
              <div className="space-y-2.5 text-caption text-text-secondary">
                {currentStudio.hotline && (
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-3.5 h-3.5 text-primary/60" />
                    <span className="font-medium">{currentStudio.hotline}</span>
                  </div>
                )}
                {currentStudio.address && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-3.5 h-3.5 text-primary/60" />
                    <span className="font-medium">{currentStudio.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/*  MOBILE LAYOUT (< 1024px) — iOS HIG Style        */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="lg:hidden min-h-screen bg-bg-sidebar pb-28">
        {/* Mobile Header */}
        <div className="quote-no-print sticky top-0 z-40 bg-bg-card/90 backdrop-blur-md shadow-xs px-4 py-3 flex items-center justify-between">
          <Link
            href="/services"
            className="flex items-center gap-1.5 text-body-sm text-text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Quay lại</span>
          </Link>
          <Link
            href={`/services/${service.id}`}
            className="flex items-center gap-1 text-label text-primary"
          >
            <Pencil className="w-3.5 h-3.5" />
            Sửa
          </Link>
        </div>

        {/* Hero Section */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <Image
                src={studioLogo}
                alt={studioName}
                width={22}
                height={22}
                className="object-contain"
              />
            </div>
            <p className="text-overline font-bold text-text-muted tracking-wide">
              {studioName} · Báo giá
            </p>
          </div>
          <h1 className="text-h1 font-black text-interactive leading-tight mb-2">
            {service.name}
          </h1>
          <div className="flex items-center gap-2">
            {service.unit && (
              <span className="text-caption font-bold text-primary bg-primary/8 px-2.5 py-0.5 rounded-full tracking-wide">
                {SERVICE_UNIT_LABELS[service.unit as ServiceUnit] || service.unit}
              </span>
            )}
            {itemCount > 0 && (
              <span className="text-caption font-bold text-text-muted bg-bg-hover px-2.5 py-0.5 rounded-full">
                {itemCount} hạng mục
              </span>
            )}
          </div>
        </div>

        {/* Inset Grouped List — Content Sections */}
        <div className="px-4 space-y-3 mt-2">
          {structure.length > 0 ? (
            structure.map((section, idx) => (
              <div key={idx} className="bg-bg-card rounded-2xl shadow-sm overflow-hidden">
                {section.title && (
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2.5">
                    <div className="w-1 h-4 bg-primary rounded-full shrink-0" />
                    <h3 className="text-overline text-primary">
                      {section.title}
                    </h3>
                  </div>
                )}
                <div className="space-y-0">
                  {section.items.map((item: string, i: number) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-[7px] shrink-0" />
                      <span className="text-body-sm text-text-secondary leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-bg-card rounded-2xl shadow-sm p-8 text-center">
              <p className="text-body-sm text-text-muted italic">Nội dung chi tiết đang được cập nhật</p>
            </div>
          )}

          {/* Contact Card */}
          <div className="bg-bg-card rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Image
                  src={studioLogo}
                  alt={studioName}
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-label font-bold text-text-main">{studioName}</p>
                <div className="flex items-center gap-3 mt-0.5 text-caption text-text-muted">
                  {currentStudio.hotline && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-primary/50" />
                      {currentStudio.hotline}
                    </span>
                  )}
                  {currentStudio.address && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-primary/50" />
                      {currentStudio.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Bar — Price + Action */}
        <div className="quote-no-print fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur-md shadow-md px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-overline text-text-muted">Trọn gói</p>
            <div className="flex items-baseline gap-1">
              <span className="text-amount font-black text-interactive tabular-nums">
                {formattedPrice.replace("₫", "").trim()}
              </span>
              <span className="text-caption font-bold text-text-muted">VNĐ</span>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            In / PDF
          </Button>
        </div>
      </div>
    </>
  );
}
