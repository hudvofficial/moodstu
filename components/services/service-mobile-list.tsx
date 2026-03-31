"use client";

import { memo, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, FileText, Pencil } from "lucide-react";
import type { ServiceRecord } from "@/types/service";
import { SERVICE_TYPE_LABELS } from "@/types/service-constants";
import type { ServiceType } from "@/types/service-constants";
import { formatCurrency } from "@/lib/utils";

interface Props {
  services: ServiceRecord[];
  onQuote: (service: ServiceRecord) => void;
  onEdit: (id: string) => void;
}

function ServiceMobileListInner({ services, onQuote, onEdit }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);



  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="lg:hidden space-y-1.5">
      {services.map((service) => {
        const isExpanded = expandedId === service.id;
        const typeLabel = SERVICE_TYPE_LABELS[service.service_type as ServiceType] || service.service_type;

        return (
          <div
            key={service.id}
            className="card-base! px-4 py-3 entrance stagger-item"
          >
            {/* Compact row */}
            {/* eslint-disable-next-line react/forbid-elements */}
            <button
              onClick={() => toggleExpand(service.id)}
              className="w-full flex items-center gap-3 text-left"
            >
              {/* Service icon / image */}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {service.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-primary">
                    {service.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-main truncate">{service.name}</p>
                <p className="text-caption text-text-muted truncate">
                  {typeLabel} · {service.category?.name || "Chưa phân loại"}
                </p>
              </div>

              {/* Price + chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-text-main">
                  {formatCurrency(Number(service.selling_price))}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                )}
              </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-text-muted">Mã:</span>{" "}
                    <span className="text-text-secondary">{service.service_code}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Giá vốn:</span>{" "}
                    <span className="text-text-secondary">
                      {formatCurrency(Number(service.cost_price))}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line react/forbid-elements */}
                  <button
                    onClick={() => onQuote(service)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-primary/5 text-primary rounded-lg text-xs font-medium hover:bg-primary/10 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Báo giá
                  </button>
                  {/* eslint-disable-next-line react/forbid-elements */}
                  <button
                    onClick={() => onEdit(service.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-bg-hover text-text-secondary rounded-lg text-xs font-medium hover:bg-bg-sidebar transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Sửa
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(ServiceMobileListInner);
