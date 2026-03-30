"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { X, Phone, MapPin } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { parseContentStructure } from "@/lib/utils/service-utils";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={onClose}
        />

        {/* Modal Card — Smart width */}
        <div
          className={`relative bg-bg-card rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 fade-in duration-200 ring-1 ring-black/5 ${isCompact ? "max-w-[340px]" : "max-w-[400px]"}`}
        >
          {/* ── PRIMARY HEADER ── */}
          <div className="bg-primary px-6 pt-4 pb-5 text-center relative overflow-hidden shrink-0">
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/4 rounded-full" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-white/6 rounded-full" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 text-white/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

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

              <p className="text-white/70 text-micro font-bold uppercase tracking-[0.2em] mb-1.5">
                {studioName} · Báo giá dịch vụ
              </p>

              <h2 className="text-white text-lg font-bold leading-snug">
                {service.name}
              </h2>

              {service.unit && (
                <p className="text-white/60 text-tiny font-semibold uppercase tracking-widest mt-0.5">
                  {service.unit}
                </p>
              )}

              {/* Price in header */}
              <div className="mt-3 pt-3 border-t border-white/15">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-[28px] font-black text-white tracking-tighter tabular-nums leading-none">
                    {formatCurrency(service.selling_price).replace("₫", "")}
                  </span>
                  <span className="text-tiny font-bold text-white/50">
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
                    <h4 className="text-tiny font-bold text-primary uppercase tracking-widest mb-1.5 border-b border-border pb-1">
                      {section.title}
                    </h4>
                  )}
                  <ul className="space-y-0.5 pl-1">
                    {section.items.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="text-[12px] text-text-secondary flex items-start gap-2 leading-snug"
                      >
                        <span className="text-text-muted/40 mt-[5px] shrink-0">
                          •
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-text-muted italic py-6">
                (Nội dung đang cập nhật)
              </p>
            )}
          </div>

          {/* ── FOOTER: Studio Contact ── */}
          {studio && (studio.hotline || studio.address) && (
            <div className="p-4 bg-bg-hover border-t border-border flex justify-center gap-4 shrink-0">
              {studio.hotline && (
                <span className="flex items-center gap-1 text-tiny text-text-secondary">
                  <Phone className="w-3 h-3 text-primary/60" />
                  {studio.hotline}
                </span>
              )}
              {studio.hotline && studio.address && (
                <span className="w-px h-3 bg-border" />
              )}
              {studio.address && (
                <span className="flex items-center gap-1 text-tiny text-text-secondary">
                  <MapPin className="w-3 h-3 text-primary/60" />
                  {studio.address}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
