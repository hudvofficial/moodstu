"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { X, Phone, MapPin } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { parseContentStructure } from "@/lib/utils/service-utils";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { SERVICE_UNIT_LABELS, ServiceUnit } from "@/types/service-constants";
import type { ServiceRecord } from "@/types/service";

// ═══════════════════════════════════════════
// QuoteModal — Level 1 (Popup báo giá)
//
// Triggered from list row/card "Báo giá" button
// Smart width: compact ≤10 items, wider otherwise
// Sections from parseContentStructure()
// Studio info: cached module-level
//
// @see Phase 1d / Task 1
// ═══════════════════════════════════════════

/** Quote modal width tokens (inline — TW4 arbitrary values unreliable at runtime) */
const QUOTE_WIDTH_COMPACT = 340;
const QUOTE_WIDTH_DEFAULT = 400;

interface StudioCache {
  name: string;
  hotline: string | null;
  address: string | null;
  logo_url: string | null;
}

let cachedStudio: StudioCache | null = null;

interface Props {
  service: ServiceRecord;
  onClose: () => void;
}

export default function QuoteModal({ service, onClose }: Props) {
  const structure = parseContentStructure(service.description || "");
  const [studio, setStudio] = useState<StudioCache | null>(cachedStudio);

  // Smart sizing
  const totalItems = useMemo(
    () => structure.reduce((sum, s) => sum + s.items.length, 0),
    [structure],
  );
  const isCompact = totalItems <= 10;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Fetch studio info (cached)
  useEffect(() => {
    if (cachedStudio) return;
    const supabase = createClient();
    supabase
      .from("studio_info")
      .select("name, hotline, address, logo_url")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          cachedStudio = data as StudioCache;
          setStudio(data as StudioCache);
        }
      });
  }, []);

  const studioName = studio?.name || "Mood Studio";
  const studioLogo = studio?.logo_url || "/logo.png";

  return (
    <ModalPortal>
      <div className="modal-overlay justify-center! items-center! p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Modal Card — Smart width */}
        <div
          className="relative bg-bg-card rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 fade-in duration-200 ring-1 ring-black/5"
          style={{ maxWidth: isCompact ? QUOTE_WIDTH_COMPACT : QUOTE_WIDTH_DEFAULT }}
        >
          {/* ── PRIMARY HEADER ── */}
          <div className="bg-primary px-6 pt-4 pb-5 text-center relative overflow-hidden shrink-0">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/4 rounded-full" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-white/6 rounded-full" />

            {/* Close button */}
            <Button
              variant="ghost"
              onClick={onClose}
              className="absolute top-3 right-3 z-20 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 h-auto w-auto border-0"
              type="button"
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="relative z-10">
              {/* Logo */}
              <div className="w-10 h-10 mx-auto mb-2 bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
                <Image
                  src={studioLogo}
                  alt={studioName}
                  width={28}
                  height={28}
                  className="brightness-0 invert object-contain"
                />
              </div>

              <p className="text-white/70 text-caption font-bold tracking-wide mb-1.5">
                {studioName} · Báo giá dịch vụ
              </p>

              <h2 className="text-h3 font-bold leading-snug" style={{ color: '#ffffff' }}>
                {service.name}
              </h2>

              {service.unit && (
                <p className="text-white/60 text-caption font-semibold tracking-wide mt-0.5">
                  {SERVICE_UNIT_LABELS[service.unit as ServiceUnit] || service.unit}
                </p>
              )}

              {/* Price in header */}
              <div className="mt-3 pt-3">
                <div className="bg-white/15 h-px -mx-6 mb-3" />
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-h1 font-black tracking-tighter tabular-nums leading-none drop-shadow-sm" style={{ color: '#ffffff' }}>
                    {formatCurrency(service.selling_price).replace("₫", "")}
                  </span>
                  <span className="text-caption font-bold opacity-80" style={{ color: '#ffffff' }}>
                    VNĐ
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── BODY: Sections ── */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3.5">
            {structure.length > 0 ? (
              structure.map((section, idx) => (
                <div key={idx}>
                  {section.title && (
                    <h4 className="text-caption font-bold text-primary tracking-wide mb-1.5">
                      {section.title}
                    </h4>
                  )}
                  <ul className="space-y-0.5 pl-1">
                    {section.items.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="text-caption text-text-secondary flex items-start gap-2 leading-snug"
                      >
                        <span className="text-text-muted/40 mt-1 shrink-0">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-center text-caption text-text-muted italic py-6">
                (Nội dung đang cập nhật)
              </p>
            )}
          </div>

          {/* ── FOOTER: Studio Contact ── */}
          {studio && (studio.hotline || studio.address) && (
            <div className="bg-bg-hover shrink-0">
              <div className="bg-border/30 h-px" />
              <div className="p-4 flex justify-center gap-4">
              {studio.hotline && (
                <span className="flex items-center gap-1 text-caption text-text-secondary">
                  <Phone className="w-3 h-3 text-primary/60" />
                  {studio.hotline}
                </span>
              )}
              {studio.hotline && studio.address && (
                <span className="w-px h-3 bg-border" />
              )}
              {studio.address && (
                <span className="flex items-center gap-1 text-caption text-text-secondary">
                  <MapPin className="w-3 h-3 text-primary/60" />
                  {studio.address}
                </span>
              )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
