"use client";

import { memo, useCallback, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Pencil } from "lucide-react";
import type { ServiceRecord } from "@/types/service";
import { SERVICE_TYPE_LABELS, SERVICE_UNIT_LABELS } from "@/types/service-constants";
import type { ServiceType, ServiceUnit } from "@/types/service-constants";
import { formatCurrency } from "@/lib/utils";
import { parseContentStructure } from "@/lib/utils/service-utils";
import { Button } from "@/components/ui/button";
import { getServiceColor, getServiceBadgeColor } from "@/constants/service-colors";

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
    <div className="space-y-1.5 lg:hidden">
      {services.map((service) => {
        const isExpanded = expandedId === service.id;
        const sections = isExpanded ? parseContentStructure(service.description) : [];
        const typeLabel =
          SERVICE_TYPE_LABELS[service.service_type as ServiceType] || service.service_type;
        const unitLabel = SERVICE_UNIT_LABELS[service.unit as ServiceUnit] || service.unit;
        const badgeColor = getServiceBadgeColor(service.service_type);
        const iconColor = getServiceColor(service.service_type);

        return (
          <div key={service.id} className="card-base! entrance stagger-item px-4 py-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpand(service.id)}
              className="flex w-full items-center gap-3 text-left outline-none"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconColor.bg}`}>
                {service.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <span className={`text-caption font-bold ${iconColor.text}`}>
                    {service.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-main">{service.name}</p>
                <div className="mt-1 flex items-center gap-1.5 truncate text-caption text-text-muted">
                  <span className={`text-tiny px-1.5 py-0.5 rounded-md ${badgeColor.bg} ${badgeColor.text}`}>
                    {typeLabel}
                  </span>
                  <span>· {unitLabel} · {service.service_code}</span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-main">
                    {formatCurrency(Number(service.selling_price))}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                  )}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="animate-in slide-in-from-top-1 mt-3 border-t border-border/50 pt-3 duration-200">
                <div className="mb-3 grid grid-cols-2 gap-2 text-caption">
                  <div>
                    <span className="text-text-muted">Danh mục:</span>{" "}
                    <span className="text-text-secondary">
                      {service.category?.name || "Chưa phân loại"}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted">Giá vốn:</span>{" "}
                    <span className="text-text-secondary">
                      {formatCurrency(Number(service.cost_price))}
                    </span>
                  </div>
                </div>

                {sections.length > 0 && (
                  <div className="mb-3 space-y-3">
                    {sections.map((section, idx) => (
                      <div key={`${service.id}-section-${idx}`}>
                        {section.title && (
                          <h4 className="mb-1 text-caption font-semibold text-primary">
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
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary/5 text-caption font-medium text-primary transition-colors hover:bg-primary/10 px-0"
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
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-bg-hover text-caption font-medium text-text-secondary transition-colors hover:bg-bg-sidebar px-0"
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
