"use client";

import { memo } from "react";
import { FileText, Pencil } from "lucide-react";
import type { ServiceRecord } from "@/types/service";
import { SERVICE_TYPE_LABELS } from "@/types/service-constants";
import type { ServiceType } from "@/types/service-constants";
import { formatCurrency } from "@/lib/utils";

interface Props {
  services: ServiceRecord[];
  onQuote: (service: ServiceRecord) => void;
  onEdit: (id: string) => void;
  onPrefetch?: (id: string) => void;
}

function ServiceGridInner({ services, onQuote, onEdit, onPrefetch }: Props) {

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {services.map((service) => {
        const typeLabel = SERVICE_TYPE_LABELS[service.service_type as ServiceType] || service.service_type;

        return (
          <div
            key={service.id}
            onMouseEnter={() => onPrefetch?.(service.id)}
            onFocus={() => onPrefetch?.(service.id)}
            className="card-base group relative overflow-hidden flex flex-col entrance stagger-item"
          >
            {/* Image / placeholder */}
            <div className="aspect-4/3 bg-bg-hover relative overflow-hidden">
              {service.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={service.image_url}
                  alt={service.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary/20">
                    {service.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3 gap-2">
                {/* eslint-disable-next-line react/forbid-elements */}
                <button
                  onClick={() => onQuote(service)}
                  className="px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-lg text-caption font-medium text-text-main flex items-center gap-1 hover:bg-white transition-colors"
                >
                  <FileText className="w-3 h-3" /> Báo giá
                </button>
                {/* eslint-disable-next-line react/forbid-elements */}
                <button
                  onClick={() => onEdit(service.id)}
                  onMouseEnter={() => onPrefetch?.(service.id)}
                  onFocus={() => onPrefetch?.(service.id)}
                  className="px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-lg text-caption font-medium text-text-main flex items-center gap-1 hover:bg-white transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Sửa
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
              <p className="text-sm font-medium text-text-main line-clamp-2 mb-1">{service.name}</p>
              <p className="text-caption text-text-muted mb-2">
                {typeLabel} · {service.category?.name || ""}
              </p>
              <div className="mt-auto">
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(Number(service.selling_price))}
                </span>
                <span className="text-caption text-text-muted ml-1">VNĐ</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(ServiceGridInner);
