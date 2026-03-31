
"use client";


import { parseContentStructure } from "@/lib/utils/service-utils";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_UNIT_LABELS, ServiceUnit } from "@/types/service-constants";

// ═══════════════════════════════════════════
// QuotePreview — Level 3 (In-form live preview)
//
// Compact card that updates as formData changes.
// Desktop: sidebar / collapsible section
// Mobile: Hidden (user accesses via /services/[id]/quote)
//
// @see Phase 1d / Task 3
// ═══════════════════════════════════════════

interface Props {
  serviceName: string;
  sellingPrice: number;
  description: string;
  unit?: string;
}

export default function QuotePreview({
  serviceName,
  sellingPrice,
  description,
  unit,
}: Props) {
  const structure = parseContentStructure(description || "");

  return (
    <div className="bg-bg-card text-text-main w-full min-w-0 shadow-md rounded-2xl overflow-hidden relative px-6 pb-6 pt-4 flex flex-col">
      {/* 1. HEADER */}
      <div className="mb-2 text-center">
        <h3 className="text-h3 text-primary mb-0.5 leading-tight wrap-break-word line-clamp-2">
          {serviceName || "Tên dịch vụ"}
        </h3>
        <p className="text-caption font-bold tracking-wide text-text-secondary">
          {unit ? (SERVICE_UNIT_LABELS[unit as ServiceUnit] || unit) : "Gói Dịch Vụ"}
        </p>
      </div>

      {/* 2. BODY SECTIONS */}
      <div className="flex-1 space-y-4">
        {structure.length > 0 ? (
          structure.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <div className="mb-1">
                  <h4 className="text-overline inline-block pb-1">
                    {section.title}
                  </h4>
                </div>
              )}
              <ul className="space-y-1.5 list-none pl-1">
                {section.items.map((item: string, i: number) => (
                  <li
                    key={i}
                    className="text-caption text-text-secondary leading-snug flex items-start gap-2"
                  >
                    <span className="text-text-muted mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <div className="text-center italic text-text-muted text-caption py-10">
            (Nội dung mô tả sẽ hiển thị ở đây)
          </div>
        )}
      </div>

      {/* 3. FOOTER PRICE */}
      <div className="mt-6 pt-4">
        <div className="bg-border/40 h-px -mx-6 mb-4" />
        <p className="text-caption font-bold text-text-muted mb-1">
          Giá trọn gói
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-amount font-black text-primary tracking-tighter tabular-nums">
            {sellingPrice > 0
              ? formatCurrency(sellingPrice).replace("₫", "")
              : "0"}
          </span>
          <span className="text-caption font-bold text-text-muted">
            VNĐ
          </span>
        </div>
      </div>
    </div>
  );
}
