"use client";

import { memo, useCallback, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Pencil } from "lucide-react";
import type { ServiceRecord } from "@/types/service";
import { SERVICE_TYPE_LABELS, SERVICE_UNIT_LABELS } from "@/types/service-constants";
import type { ServiceType, ServiceUnit } from "@/types/service-constants";
import { formatVnd } from "@/lib/utils";
import { parseContentStructure } from "@/lib/utils/service-utils";
import { Button } from "@/components/ui/button";
import { getServiceBadgeColor } from "@/constants/service-colors";

interface Props {
  services: ServiceRecord[];
  onQuote: (service: ServiceRecord) => void;
  onEdit: (id: string) => void;
  onPrefetch?: (id: string) => void;
}

function ServiceMobileListInner({ services, onQuote, onEdit, onPrefetch }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col gap-3 pt-1">
      {services.map((service) => {
        const isExpanded = expandedId === service.id;
        const sections = isExpanded ? parseContentStructure(service.description) : [];
        const typeLabel =
          SERVICE_TYPE_LABELS[service.service_type as ServiceType] || service.service_type;
        const unitLabel = SERVICE_UNIT_LABELS[service.unit as ServiceUnit] || service.unit;
        const badgeColor = getServiceBadgeColor(service.service_type);
        return (
          <div
            key={service.id}
            role="button"
            tabIndex={0}
            onClick={() => toggleExpand(service.id)}
            onPointerEnter={() => onPrefetch?.(service.id)}
            onFocus={() => onPrefetch?.(service.id)}
            className={`card-base p-4 text-left transition-all active:scale-[0.99] entrance stagger-item`}
          >
            {/* Row 1: Service code + Chevron */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-text-muted">{service.service_code}</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-text-muted" />
              ) : (
                <ChevronDown className="h-4 w-4 text-text-muted" />
              )}
            </div>

            {/* Row 2: Service name */}
            <h3 className="text-sm font-bold text-text-main mb-1.5 line-clamp-2">{service.name}</h3>

            {/* Row 3: Service type badge + Unit */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-tiny px-2 py-0.5 rounded-md ${badgeColor.bg} ${badgeColor.text}`}>
                {typeLabel}
              </span>
              <span className="text-xs text-text-muted">· {unitLabel}</span>
            </div>

            {/* Row 4: Price */}
            <p className="text-sm font-semibold text-text-main">
              {formatVnd(Number(service.selling_price))}
            </p>

            {isExpanded && (
              <div className="animate-in slide-in-from-top-1 mt-3 border-t border-border/50 pt-3 duration-200">
                <div className="mb-3 grid grid-cols-2 gap-2 text-caption bg-bg-subtle rounded-lg p-2.5">
                  <div>
                    <span className="text-text-muted">Danh mục</span>
                    <p className="text-text-main font-medium mt-0.5">
                      {service.category?.name || "Chưa phân loại"}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-muted">Giá vốn</span>
                    <p className="text-text-main font-medium mt-0.5">
                      {formatVnd(Number(service.cost_price))}
                    </p>
                  </div>
                </div>

                {sections.length > 0 && (
                  <div className="mb-3 space-y-3">
                    {sections.map((section, idx) => (
                      <div key={`${service.id}-section-${idx}`}>
                        {section.title && (
                          <h4 className="mb-1 text-caption font-semibold text-text-main">
                            {section.title}
                          </h4>
                        )}
                        <ul className="space-y-1">
                          {section.items.map((item, itemIdx) => (
                            <li
                              key={`${service.id}-item-${itemIdx}`}
                              className="flex items-start gap-1.5 text-caption text-text-secondary"
                            >
                              <span className="mt-0.5 text-text-muted">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuote(service);
                    }}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-caption font-medium text-white transition-colors hover:bg-primary/90 px-0"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Báo giá
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(service.id);
                    }}
                    onPointerEnter={() => onPrefetch?.(service.id)}
                    onFocus={() => onPrefetch?.(service.id)}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-bg-sidebar text-caption font-medium text-text-main transition-colors hover:bg-bg-hover px-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Sửa
                  </Button>
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
